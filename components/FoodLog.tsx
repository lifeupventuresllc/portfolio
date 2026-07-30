'use client'

import { useEffect, useMemo, useState } from 'react'
import Ring from '@/components/Ring'
import VoiceButton from '@/components/VoiceButton'

type SearchFood = {
  name: string; brand: string | null; servings: number; serving_label: string | null
  calories: number; protein_g: number; carbs_g: number; fats_g: number; source: 'usda' | 'estimated'; photo?: string | null
}

type Entry = {
  id: string; meal: string; name: string; brand: string | null
  servings: number; serving_label: string | null
  calories: number; protein_g: number; carbs_g: number; fats_g: number; source: string | null
}
type Macros = { calories: number; protein_g: number; carbs_g: number; fats_g: number }
type Payload = { date: string; entries: Entry[]; totals: Macros; target: Macros }

// A planned meal for today → one-tap "I ate this" logging.
export type PlannedItem = { slot: string; name: string; cal: number; protein: number; carbs: number; fat: number }

const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'] as const
const MEAL_LABEL: Record<string, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snacks' }
const SLOT_TO_MEAL: Record<string, string> = { BF: 'breakfast', LN: 'lunch', DN: 'dinner', SN: 'snack', DS: 'snack' }

function MacroBar({ label, val, target, color }: { label: string; val: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min(100, Math.round((val / target) * 100)) : 0
  const over = target > 0 && val > target
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-ivory/50">{label}</span>
        <span className={over ? 'text-amber-400 font-semibold' : 'text-ivory/70'}>{val}<span className="text-ivory/30"> / {target}g</span></span>
      </div>
      <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: over ? '#f59e0b' : color }} />
      </div>
    </div>
  )
}

export default function FoodLog({ planned = [], budget = null, dayType = null }: { planned?: PlannedItem[]; budget?: number | null; dayType?: 'workout' | 'rest' | null }) {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pop, setPop] = useState(false)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', meal: 'breakfast', servings: '1', calories: '', protein_g: '', carbs_g: '', fats_g: '' })
  // Accurate food search (USDA FoodData Central) + voice + AI-estimate fallback
  const [q, setQ] = useState('')
  const [searchMeal, setSearchMeal] = useState('breakfast')
  const [results, setResults] = useState<SearchFood[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [notConfigured, setNotConfigured] = useState(false)
  const [manual, setManual] = useState(false)
  // Quantity picker — USDA results are always per-100g; let her say how much she
  // actually had (oz or grams) instead of always logging a flat 100g serving.
  const [picking, setPicking] = useState<SearchFood | null>(null)
  const [qty, setQty] = useState('100')
  const [unit, setUnit] = useState<'g' | 'oz'>('g')
  const grams = unit === 'oz' ? (Number(qty) || 0) * 28.3495 : (Number(qty) || 0)
  const scale = grams > 0 ? grams / 100 : 0
  const scaled = picking ? {
    calories: Math.round(picking.calories * scale), protein_g: Math.round(picking.protein_g * scale),
    carbs_g: Math.round(picking.carbs_g * scale), fats_g: Math.round(picking.fats_g * scale),
  } : null

  async function runSearch(query: string) {
    const text = query.trim()
    if (!text) return
    setPicking(null); setSearching(true); setSearched(true); setResults([])
    try {
      const r = await fetch('/api/plan/food-search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: text }) })
      const d = await r.json()
      if (d.configured === false) { setNotConfigured(true); setResults([]) }
      else { setNotConfigured(false); setResults(d.foods || []) }
    } finally { setSearching(false) }
  }

  async function aiEstimate() {
    const text = q.trim()
    if (!text) return
    setSearching(true)
    try {
      const r = await fetch('/api/plan/food-estimate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: text }) })
      const d = await r.json()
      setResults((prev) => [...prev, ...(d.foods || [])])
    } finally { setSearching(false) }
  }

  async function confirmLogFood() {
    if (!picking || !scaled) return
    const label = unit === 'oz' ? `${qty}oz` : `${qty}g`
    await post({
      name: picking.brand ? `${picking.name} (${picking.brand})` : picking.name, meal: searchMeal, servings: 1,
      serving_label: label, calories: scaled.calories, protein_g: scaled.protein_g, carbs_g: scaled.carbs_g, fats_g: scaled.fats_g,
      source: picking.source,
    })
    setPicking(null)
  }

  // AI estimates already represent the described amount (not per-100g) — log as-is,
  // no quantity scaling. Only real USDA lookups (always per-100g) get the picker.
  async function logEstimatedFood(f: SearchFood) {
    await post({
      name: f.name, meal: searchMeal, servings: f.servings, serving_label: f.serving_label,
      calories: f.calories, protein_g: f.protein_g, carbs_g: f.carbs_g, fats_g: f.fats_g, source: f.source,
    })
  }

  useEffect(() => {
    fetch('/api/plan/food-log').then((r) => r.json()).then((d) => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  async function post(body: Record<string, unknown>) {
    setSaving(true)
    try {
      const r = await fetch('/api/plan/food-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await r.json()
      if (d?.totals) { setData(d); setPop(true); setTimeout(() => setPop(false), 700) }
    } finally { setSaving(false) }
  }

  async function addManual(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    await post({
      name: form.name.trim(), meal: form.meal, servings: Number(form.servings) || 1,
      calories: Number(form.calories) || 0, protein_g: Number(form.protein_g) || 0,
      carbs_g: Number(form.carbs_g) || 0, fats_g: Number(form.fats_g) || 0, source: 'manual',
    })
    setForm({ name: '', meal: form.meal, servings: '1', calories: '', protein_g: '', carbs_g: '', fats_g: '' })
    setOpen(false)
  }

  async function logPlanned(p: PlannedItem) {
    await post({
      name: p.name, meal: SLOT_TO_MEAL[p.slot] || 'snack', servings: 1,
      calories: p.cal, protein_g: p.protein, carbs_g: p.carbs, fats_g: p.fat, source: 'plan',
    })
  }

  async function remove(id: string) {
    const r = await fetch(`/api/plan/food-log?id=${id}`, { method: 'DELETE' })
    const d = await r.json()
    if (d?.totals) setData(d)
  }

  const grouped = useMemo(() => {
    const g: Record<string, Entry[]> = {}
    for (const e of data?.entries || []) (g[e.meal] ||= []).push(e)
    return g
  }, [data])

  const t = data?.totals || { calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0 }
  const tar = data?.target || { calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0 }
  // Calories are money 💵 — TODAY'S budget = today's calorie target (workout day higher, rest day lower).
  const calBudget = budget != null && budget > 0 ? budget : tar.calories
  const calPct = calBudget > 0 ? Math.round((t.calories / calBudget) * 100) : 0
  const remaining = calBudget - t.calories
  const calOver = remaining < 0

  return (
    <div className="bg-charcoal border border-gold/30 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-gold text-[10px] uppercase tracking-wider font-semibold mb-0.5">Today&apos;s budget 💵</p>
          <p className="text-white font-semibold text-sm">Calories are your money — spend them well</p>
        </div>
        <button onClick={() => setOpen((o) => !o)} className="bg-gold text-obsidian px-3.5 py-2 font-bold text-[11px] uppercase tracking-wider rounded-xl hover:scale-[1.03] transition-transform">{open ? 'Close' : '+ Log food'}</button>
      </div>
      {dayType && (
        <p className="text-ivory/45 text-[11px] mb-4">
          <span className={`inline-block px-2 py-0.5 rounded-full font-semibold ${dayType === 'workout' ? 'bg-gold/15 text-gold' : 'bg-white/8 text-ivory/60'}`}>{dayType === 'workout' ? '💪🏽 Workout day' : '🌿 Rest day'}</span>
          <span className="ml-2">bigger budget on training days, leaner on rest.</span>
        </p>
      )}

      {/* Money ring (calories = dollars) + macro bars vs target */}
      <div className="flex items-center gap-5 mb-4">
        <div className={pop ? 'luf-pop' : ''}>
          <Ring pct={calPct} size={104} stroke={9} color={calOver ? '#f59e0b' : '#c9a84c'}>
            <div className="text-center leading-none">
              <p className="text-ivory/40 text-[8px] uppercase tracking-wider mb-0.5">{calOver ? 'over' : 'left'}</p>
              <p className={`font-bold text-xl ${calOver ? 'text-amber-400' : 'text-gold'}`}>{calOver ? '-' : ''}${Math.abs(remaining)}</p>
              <p className="text-ivory/40 text-[9px] tracking-wider mt-0.5">of ${calBudget}</p>
            </div>
          </Ring>
        </div>
        <div className="flex-1 space-y-2.5">
          <MacroBar label="Protein" val={t.protein_g} target={tar.protein_g} color="#46c46f" />
          <MacroBar label="Carbs" val={t.carbs_g} target={tar.carbs_g} color="#60a5fa" />
          <MacroBar label="Fats" val={t.fats_g} target={tar.fats_g} color="#e5b567" />
          <p className="text-ivory/35 text-[10px]">Hit your protein and cravings get quieter — that&apos;s the goal, not just the number.</p>
        </div>
      </div>
      <div className={`luf-glow mb-4 rounded-2xl border px-4 py-3 text-center ${calOver ? 'border-amber-400/40 bg-amber-400/10' : 'border-gold/40 bg-gold/10'}`}>
        <p className={`text-base font-bold ${calOver ? 'text-amber-400' : 'text-gold'}`}>
          {loading ? 'Loading your day…' : calOver ? `$${Math.abs(remaining)} over budget — no guilt, fresh budget tomorrow.` : `Spent $${t.calories} · $${remaining} left${t.calories === 0 ? ' — log your first meal below 👇' : ''}`}
        </p>
      </div>

      {/* One-tap: log a meal straight from today's plan */}
      {planned.length > 0 && (
        <div className="mb-4">
          <p className="text-ivory/40 text-[10px] uppercase tracking-wider mb-2">From today&apos;s plan — tap to log</p>
          <div className="flex flex-wrap gap-2">
            {planned.map((p, i) => (
              <button key={i} onClick={() => logPlanned(p)} disabled={saving} className="text-left bg-obsidian/60 border border-smoke rounded-xl px-3 py-2 hover:border-gold/50 transition-colors disabled:opacity-50">
                <span className="text-white text-xs font-medium block leading-tight">{p.name}</span>
                <span className="text-ivory/40 text-[10px]">{p.cal} cal · {p.protein}g P</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search (accurate DB) + voice + AI fallback + manual */}
      {open && (
        <div className="bg-obsidian/60 border border-smoke rounded-xl p-3 mb-4 space-y-3">
          {/* Meal + search bar with mic */}
          <div className="flex gap-2">
            <select value={searchMeal} onChange={(e) => setSearchMeal(e.target.value)} className="bg-charcoal border border-smoke rounded-lg px-2 py-2 text-white text-xs focus:border-gold/60 outline-none">
              {MEALS.map((m) => <option key={m} value={m}>{MEAL_LABEL[m]}</option>)}
            </select>
            <form onSubmit={(e) => { e.preventDefault(); runSearch(q) }} className="flex-1 flex gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a food, or say it 🎤" autoFocus className="flex-1 min-w-0 bg-charcoal border border-smoke rounded-lg px-3 py-2 text-white text-sm placeholder:text-ivory/30 focus:border-gold/60 outline-none" />
              <VoiceButton onInterim={(t) => setQ(t)} onResult={(t) => { setQ(t); runSearch(t) }} />
              <button type="submit" disabled={searching || !q.trim()} className="shrink-0 bg-gold text-obsidian px-3 rounded-lg font-bold text-xs uppercase disabled:opacity-50">{searching ? '…' : 'Go'}</button>
            </form>
          </div>

          {/* Results — verified DB facts (green) vs AI estimate (amber) */}
          {results.length > 0 && !picking && (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {results.some((f) => f.brand) && (
                <p className="text-ivory/35 text-[10px] px-0.5">Don&apos;t see your exact brand? Pick the generic one at the top — macros are close across brands unless you know yours specifically.</p>
              )}
              {results.map((f, i) => (
                <button key={i} onClick={() => { if (f.source === 'usda') { setPicking(f); setQty('100'); setUnit('g') } else { logEstimatedFood(f) } }} disabled={saving} className="w-full text-left flex items-center gap-2 bg-charcoal border border-smoke rounded-lg px-3 py-2 hover:border-gold/50 transition-colors disabled:opacity-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{f.name}{f.brand ? <span className="text-ivory/40"> · {f.brand}</span> : null}</p>
                    <p className="text-ivory/40 text-[10px]">{f.source === 'usda' ? 'per 100g' : `${f.servings} ${f.serving_label || 'serving'}`} · {f.calories} cal · {f.protein_g}P · {f.carbs_g}C · {f.fats_g}F</p>
                  </div>
                  <span className={`shrink-0 text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${f.source === 'usda' ? 'bg-green-500/15 text-green-400' : 'bg-amber-500/15 text-amber-400'}`}>{f.source === 'usda' ? '✓ verified' : '~ estimate'}</span>
                </button>
              ))}
            </div>
          )}

          {/* Quantity picker — how much did she actually have? */}
          {picking && scaled && (
            <div className="bg-charcoal border border-gold/40 rounded-lg p-3 space-y-3">
              <p className="text-white text-sm font-semibold">{picking.brand ? `${picking.name} (${picking.brand})` : picking.name}</p>
              <div className="flex gap-2 items-center">
                <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" className="w-24 bg-obsidian border border-smoke rounded-lg px-3 py-2 text-white text-sm focus:border-gold/60 outline-none" />
                <div className="flex rounded-lg overflow-hidden border border-smoke">
                  {(['g', 'oz'] as const).map((u) => (
                    <button key={u} onClick={() => setUnit(u)} className={`px-3 py-2 text-xs font-bold uppercase ${unit === u ? 'bg-gold text-obsidian' : 'bg-obsidian text-ivory/50'}`}>{u}</button>
                  ))}
                </div>
              </div>
              <p className="text-ivory/50 text-xs">{scaled.calories} cal · {scaled.protein_g}g protein · {scaled.carbs_g}g carbs · {scaled.fats_g}g fat</p>
              <div className="flex gap-2">
                <button onClick={confirmLogFood} disabled={saving || grams <= 0} className="flex-1 bg-gold text-obsidian py-2.5 font-bold text-xs uppercase tracking-wider rounded-lg disabled:opacity-50">{saving ? 'Logging…' : 'Log it'}</button>
                <button onClick={() => setPicking(null)} className="px-4 py-2.5 text-ivory/50 text-xs font-semibold hover:text-white">Cancel</button>
              </div>
            </div>
          )}

          {/* Empty state → offer AI estimate (clearly labeled) */}
          {searched && !searching && results.length === 0 && !notConfigured && (
            <div className="text-center py-1">
              <p className="text-ivory/40 text-xs mb-2">Not in the database. Want an AI estimate?</p>
              <button onClick={aiEstimate} className="bg-amber-500/15 text-amber-300 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-amber-500/25 transition-colors">✨ Estimate with AI</button>
              <p className="text-ivory/25 text-[10px] mt-1.5">Estimates are approximate — verified foods are always more accurate.</p>
            </div>
          )}
          {notConfigured && <p className="text-ivory/30 text-[11px] text-center py-1">Food search comes online once the database is connected. Enter macros manually below for now.</p>}

          {/* Manual entry (fallback / custom foods) */}
          <button onClick={() => setManual((m) => !m)} className="text-ivory/40 text-[11px] hover:text-gold underline">{manual ? 'Hide manual entry' : 'Enter a food manually'}</button>
          {manual && (
            <form onSubmit={addManual} className="space-y-2.5 pt-1">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Food name" className="w-full bg-charcoal border border-smoke rounded-lg px-3 py-2 text-white text-sm placeholder:text-ivory/30 focus:border-gold/60 outline-none" />
              <div className="grid grid-cols-2 gap-2">
                <select value={form.meal} onChange={(e) => setForm({ ...form, meal: e.target.value })} className="bg-charcoal border border-smoke rounded-lg px-3 py-2 text-white text-sm focus:border-gold/60 outline-none">
                  {MEALS.map((m) => <option key={m} value={m}>{MEAL_LABEL[m]}</option>)}
                </select>
                <input value={form.servings} onChange={(e) => setForm({ ...form, servings: e.target.value })} inputMode="decimal" placeholder="Servings" className="bg-charcoal border border-smoke rounded-lg px-3 py-2 text-white text-sm placeholder:text-ivory/30 focus:border-gold/60 outline-none" />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {([['calories', 'Cal'], ['protein_g', 'Protein'], ['carbs_g', 'Carbs'], ['fats_g', 'Fats']] as const).map(([k, lbl]) => (
                  <div key={k}>
                    <label className="text-ivory/40 text-[9px] uppercase tracking-wider block mb-1">{lbl}</label>
                    <input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} inputMode="numeric" placeholder="0" className="w-full bg-charcoal border border-smoke rounded-lg px-2 py-2 text-white text-sm placeholder:text-ivory/30 focus:border-gold/60 outline-none" />
                  </div>
                ))}
              </div>
              <button type="submit" disabled={saving || !form.name.trim()} className="w-full bg-gold text-obsidian py-2.5 font-bold text-xs uppercase tracking-wider rounded-lg disabled:opacity-50">{saving ? 'Saving…' : 'Add to today'}</button>
            </form>
          )}
        </div>
      )}

      {/* Logged entries, grouped by meal */}
      {MEALS.filter((m) => grouped[m]?.length).map((m) => (
        <div key={m} className="mb-3 last:mb-0">
          <p className="text-ivory/40 text-[10px] uppercase tracking-wider mb-1.5">{MEAL_LABEL[m]}</p>
          <div className="space-y-1.5">
            {grouped[m].map((e) => (
              <div key={e.id} className="flex items-center gap-2 bg-obsidian/40 rounded-lg px-3 py-2 group">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{e.name}{e.servings !== 1 ? <span className="text-ivory/40"> ×{e.servings}</span> : null}</p>
                  <p className="text-ivory/40 text-[10px]">{e.calories} cal · {e.protein_g}P · {e.carbs_g}C · {e.fats_g}F</p>
                </div>
                <button onClick={() => remove(e.id)} aria-label="Remove" className="text-ivory/30 hover:text-red-400 text-lg leading-none px-1 opacity-60 group-hover:opacity-100 transition-opacity">×</button>
              </div>
            ))}
          </div>
        </div>
      ))}
      {!loading && (data?.entries.length || 0) === 0 && !open && (
        <p className="text-ivory/30 text-xs text-center py-2">Nothing logged yet. Tap a plan meal above or <button onClick={() => setOpen(true)} className="text-gold underline">add food</button>.</p>
      )}
    </div>
  )
}
