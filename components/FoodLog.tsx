'use client'

import { useEffect, useMemo, useState } from 'react'
import Ring from '@/components/Ring'

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

export default function FoodLog({ planned = [] }: { planned?: PlannedItem[] }) {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pop, setPop] = useState(false)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', meal: 'breakfast', servings: '1', calories: '', protein_g: '', carbs_g: '', fats_g: '' })

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
  const calPct = tar.calories > 0 ? Math.round((t.calories / tar.calories) * 100) : 0
  const remaining = tar.calories - t.calories
  const calOver = remaining < 0

  return (
    <div className="bg-charcoal border border-gold/30 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gold text-[10px] uppercase tracking-wider font-semibold mb-0.5">Food log · today</p>
          <p className="text-white font-semibold text-sm">What you actually ate</p>
        </div>
        <button onClick={() => setOpen((o) => !o)} className="bg-gold text-obsidian px-3.5 py-2 font-bold text-[11px] uppercase tracking-wider rounded-xl hover:scale-[1.03] transition-transform">{open ? 'Close' : '+ Log food'}</button>
      </div>

      {/* Calories ring + macro bars vs target */}
      <div className="flex items-center gap-5 mb-4">
        <div className={pop ? 'luf-pop' : ''}>
          <Ring pct={calPct} size={96} stroke={9} color={calOver ? '#f59e0b' : '#c9a84c'}>
            <div className="text-center leading-none">
              <p className="text-white font-bold text-lg">{t.calories}</p>
              <p className="text-ivory/40 text-[9px] uppercase tracking-wider mt-0.5">of {tar.calories}</p>
            </div>
          </Ring>
        </div>
        <div className="flex-1 space-y-2.5">
          <MacroBar label="Protein" val={t.protein_g} target={tar.protein_g} color="#46c46f" />
          <MacroBar label="Carbs" val={t.carbs_g} target={tar.carbs_g} color="#60a5fa" />
          <MacroBar label="Fats" val={t.fats_g} target={tar.fats_g} color="#e5b567" />
        </div>
      </div>
      <p className={`text-xs text-center mb-4 ${calOver ? 'text-amber-400 font-semibold' : 'text-ivory/50'}`}>
        {loading ? 'Loading your day…' : calOver ? `${Math.abs(remaining)} cal over — no guilt, just data. Tomorrow's a fresh page.` : `${remaining} cal left today${t.calories === 0 ? ' — log your first meal below 👇' : ''}`}
      </p>

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

      {/* Manual add form */}
      {open && (
        <form onSubmit={addManual} className="bg-obsidian/60 border border-smoke rounded-xl p-3 mb-4 space-y-2.5">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="What did you eat? (e.g. Chipotle bowl)" autoFocus className="w-full bg-charcoal border border-smoke rounded-lg px-3 py-2 text-white text-sm placeholder:text-ivory/30 focus:border-gold/60 outline-none" />
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
