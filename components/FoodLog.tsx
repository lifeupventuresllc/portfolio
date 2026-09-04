'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Ring from '@/components/Ring'
import VoiceButton from '@/components/VoiceButton'
import MealPhotoButton from '@/components/MealPhotoButton'
import SessionExpiredNotice from '@/components/SessionExpiredNotice'
import { pieceWeightFor } from '@/lib/food-portions'
import { useLiveRefresh } from '@/lib/useLiveRefresh'

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

// "Gold Flip" scheme (see app/plan/today/page.tsx for the full note) — this
// card now shares the same warm gold-to-amber card treatment as the rest of
// the For You page, sitting on the dashboard's forest field. Roles flip
// accordingly: dark-ink accent/primary text, translucent-dark muted text.
// OVER_TEXT/OVER_BG shift away from amber specifically because amber-on-gold
// has almost no contrast — the "over budget" warning needs its own hue here,
// not just its old value carried over.
const ACCENT = '#241705'
const INK = '#241705'
const MUTED = 'rgba(36,23,5,0.72)'
const CARD_BG = 'linear-gradient(135deg, #E9B24E, #D89A2E 55%, #B37D22)'
const CARD_BORDER = '1px solid rgba(2,31,22,0.16)'
const CARD_GLOW = '0 10px 22px -14px rgba(0,0,0,0.5)'
const OVER_TEXT = '#8B2E12'
const OVER_BG = '#8B2E12'

// Just protein — carbs/fat bars used to sit here too, but three number-vs-target
// bars next to a calorie ring read as a math problem. Protein is the one macro
// the app actually coaches toward ("hit your protein and cravings get quieter"),
// so it's the one macro shown by default.
function MacroBar({ label, val, target }: { label: string; val: number; target: number }) {
  // Real bug found live, 2026-09-03 (novice glance-test audit): with no real
  // target set yet (never done intake), this rendered "12 / 0g" — a
  // numerator over a zero goal reads as broken math to someone who's never
  // used a tracking app, not as "you haven't set a goal." Same fix pattern
  // as the calorie ring below: never do arithmetic against an unset target.
  const hasTarget = target > 0
  const pct = hasTarget ? Math.min(100, Math.round((val / target) * 100)) : 0
  const over = hasTarget && val > target
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span style={{ color: MUTED }}>{label}</span>
        {hasTarget ? (
          <span style={{ color: over ? OVER_TEXT : INK, fontWeight: over ? 600 : 500 }}>{val}<span style={{ color: MUTED }}> / {target}g</span></span>
        ) : (
          <span style={{ color: MUTED }}>{val}g logged &middot; no goal set</span>
        )}
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.14)' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: over ? OVER_BG : ACCENT }} />
      </div>
    </div>
  )
}

// Layout-simplify pass (5-step algorithm, Option A — Asa's pick): the
// standalone "today's meals" card in app/plan/today/page.tsx said the same
// thing this card's own budget ring already implies (is there a real target
// today, or not) — merged in as one line + link instead of a second full
// card, so a day-to-day glance at nutrition is one card, not two.
type MealStatus =
  | { kind: 'eatingOut' }
  | { kind: 'planned'; totalProtein: number }
  | { kind: 'empty'; isSunday: boolean }

export default function FoodLog({ planned = [], budget = null, dayType = null, mealStatus = null }: { planned?: PlannedItem[]; budget?: number | null; dayType?: 'workout' | 'rest' | null; mealStatus?: MealStatus | null }) {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pop, setPop] = useState(false)
  const [expired, setExpired] = useState(false)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', servings: '1', calories: '', protein_g: '', carbs_g: '', fats_g: '' })
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
  const [unit, setUnit] = useState<'g' | 'oz' | 'piece'>('g')
  // Real fix for "2 eggs = 0 calories" (beta feedback Priority 2, 2026-08-25):
  // USDA results are always per-100g, and there was previously no way to log
  // by count at all — someone typing "2" meaning "2 eggs" was actually
  // logging 2 grams. See lib/food-portions.ts for why a curated table, not a
  // USDA API lookup (their /food/{fdcId} detail endpoint 404s under our key).
  const piece = picking ? pieceWeightFor(picking.name) : null
  // The moment a new food is picked, default straight to "1 piece" for any
  // food we have a real gram-weight for — the safe default that makes the
  // original bug impossible to hit by accident, not just possible to avoid.
  useEffect(() => {
    if (!picking) return
    const p = pieceWeightFor(picking.name)
    if (p) { setUnit('piece'); setQty('1') } else { setUnit('g'); setQty('100') }
  }, [picking])
  const grams = unit === 'piece' ? (Number(qty) || 0) * (piece?.grams || 0) : unit === 'oz' ? (Number(qty) || 0) * 28.3495 : (Number(qty) || 0)
  const scale = grams > 0 ? grams / 100 : 0
  const scaled = picking ? {
    calories: Math.round(picking.calories * scale), protein_g: Math.round(picking.protein_g * scale),
    carbs_g: Math.round(picking.carbs_g * scale), fats_g: Math.round(picking.fats_g * scale),
  } : null
  // Safety net (Priority 2's explicit ask): a real portion should never save
  // as a silent 0 — catches any food this table doesn't cover, or a genuine
  // typo, without blocking an actually-zero-calorie food (grams === 0, or the
  // food itself is genuinely ~0 kcal/100g, e.g. black coffee/water).
  const zeroCalorieWarning = !!(picking && scaled && grams > 0 && scaled.calories === 0 && picking.calories > 0)

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
    // Never let a real portion silently save as 0 calories (Priority 2's
    // explicit ask) — this can only fire for a food outside the piece table
    // above logged in an implausibly tiny gram amount; a genuinely
    // zero-calorie food (grams === 0 or picking.calories === 0) still saves fine.
    if (zeroCalorieWarning) return
    const label = unit === 'piece' ? `${qty} ${piece?.label}${Number(qty) === 1 ? '' : 's'}` : unit === 'oz' ? `${qty}oz` : `${qty}g`
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

  // Real bug found live, 2026-09-03 (beta tester report: "doesn't refresh /
  // shows last entry"): this only ever fetched once, on mount — any write
  // from outside this component's own post()/remove() (the meal-photo path
  // chief among them) was invisible here until a hard reload. Same
  // refetch-on-focus pattern already proven on NextActionCard.tsx, not a
  // new mechanism.
  const loadEntries = () => {
    fetch('/api/plan/food-log').then((r) => {
      if (r.status === 401) { setExpired(true); setLoading(false); return null }
      return r.json()
    }).then((d) => { if (d) setData(d); setLoading(false) }).catch(() => setLoading(false))
  }
  useLiveRefresh(loadEntries)

  async function post(body: Record<string, unknown>) {
    setSaving(true)
    try {
      const r = await fetch('/api/plan/food-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (r.status === 401) { setExpired(true); return }
      const d = await r.json()
      if (d?.totals) { setData(d); setPop(true); setTimeout(() => setPop(false), 700) }
    } finally { setSaving(false) }
  }

  async function addManual(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    // Was its own separate "meal" dropdown, duplicating the one already
    // shown above the search bar (both defaulting to Breakfast, visible at
    // the same time) — real bug found live, 2026-09-03 (novice glance-test
    // audit): confusing even for a returning user, unclear which one
    // actually governed where the food got logged. Now shares the one
    // real meal selector (searchMeal).
    await post({
      name: form.name.trim(), meal: searchMeal, servings: Number(form.servings) || 1,
      calories: Number(form.calories) || 0, protein_g: Number(form.protein_g) || 0,
      carbs_g: Number(form.carbs_g) || 0, fats_g: Number(form.fats_g) || 0, source: 'manual',
    })
    setForm({ name: '', servings: '1', calories: '', protein_g: '', carbs_g: '', fats_g: '' })
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

  // Real bug found live, 2026-09-03 (novice glance-test audit): this was a
  // single instant tap with zero confirmation and no undo — a mis-tap
  // permanently loses a real logged meal, and there's no other way to edit
  // an entry (only delete-and-redo). First tap now just arms it ("Remove?"
  // for ~2.5s); the second tap on the SAME entry actually deletes. Tapping
  // any other entry or letting it time out cancels, no accidental deletes.
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  function handleRemoveTap(id: string) {
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
    if (confirmRemoveId === id) {
      setConfirmRemoveId(null)
      remove(id)
      return
    }
    setConfirmRemoveId(id)
    confirmTimerRef.current = setTimeout(() => setConfirmRemoveId(null), 2500)
  }

  // Real gap found live, 2026-09-03 (beta tester report + novice glance-test
  // audit): the only way to fix a logged entry was delete-and-redo. Checked
  // how MyFitnessPal/Lose It! handle this — tap the entry, adjust the
  // quantity, watch the macros update live, save. Same pattern here:
  // tapping a row (not the × ) opens this instead of the × 's remove-confirm.
  //
  // Already-logged entries only ever store the FINAL calories/macros +
  // `servings` (a multiplier) and `serving_label` (display text like
  // "2 eggs" or "150g") — not the original per-100g base the search
  // picker scales from. So editing here scales from calories/servings
  // (the per-serving amount), not from a re-fetched per-100g value —
  // always correct regardless of how the entry was originally logged
  // (search, manual, or an AI estimate), and needs no extra API call.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQty, setEditQty] = useState('1')
  const editingEntry = data?.entries.find((e) => e.id === editingId) || null
  const editPerUnit: Macros | null = editingEntry
    ? {
        calories: editingEntry.calories / (editingEntry.servings || 1),
        protein_g: editingEntry.protein_g / (editingEntry.servings || 1),
        carbs_g: editingEntry.carbs_g / (editingEntry.servings || 1),
        fats_g: editingEntry.fats_g / (editingEntry.servings || 1),
      }
    : null
  const editQtyNum = Number(editQty) || 0
  const editScaled: Macros | null = editPerUnit
    ? {
        calories: Math.round(editPerUnit.calories * editQtyNum),
        protein_g: Math.round(editPerUnit.protein_g * editQtyNum),
        carbs_g: Math.round(editPerUnit.carbs_g * editQtyNum),
        fats_g: Math.round(editPerUnit.fats_g * editQtyNum),
      }
    : null
  // serving_label already has the ORIGINAL quantity baked into the string
  // (e.g. "1 egg", "150g" — see confirmLogFood/addManual above), so just
  // appending a plural "s" onto the whole thing produced "1 eggs" once she
  // changed the number. Strip the leading digits to get just the unit word,
  // then pluralize that against the new quantity instead. Skip pluralizing
  // short unit abbreviations (g, oz) — "2 ozs" reads worse than "2 oz".
  const editUnitWord = (editingEntry?.serving_label || 'serving').replace(/^[\d.]+\s*/, '').replace(/s$/, '') || 'serving'
  const editUnitLabel = editUnitWord.length > 2 && editQtyNum !== 1 ? `${editUnitWord}s` : editUnitWord

  function startEdit(e: Entry) {
    setConfirmRemoveId(null)
    setEditingId(editingId === e.id ? null : e.id)
    setEditQty(String(e.servings || 1))
  }

  async function saveEdit() {
    if (!editingEntry || !editScaled || editQtyNum <= 0) return
    setSaving(true)
    try {
      const r = await fetch('/api/plan/food-log', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingEntry.id, servings: editQtyNum, serving_label: editingEntry.serving_label,
          calories: editScaled.calories, protein_g: editScaled.protein_g, carbs_g: editScaled.carbs_g, fats_g: editScaled.fats_g,
        }),
      })
      const d = await r.json()
      if (d?.totals) setData(d)
      setEditingId(null)
    } finally { setSaving(false) }
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
  // Real bug found live, 2026-09-03 (novice glance-test audit): with no real
  // calorie target yet (never done intake), calBudget is 0, so logging any
  // real food showed "-$148 OVER of $0" — nonsensical money-metaphor math
  // to someone who's never set a calorie goal, reading as a broken
  // calculator rather than "you haven't set a goal yet." Gated the whole
  // ring + banner below on hasCalBudget instead.
  const hasCalBudget = calBudget > 0
  const calPct = hasCalBudget ? Math.round((t.calories / calBudget) * 100) : 0
  const remaining = calBudget - t.calories
  const calOver = hasCalBudget && remaining < 0

  return (
    <div className="rounded-2xl p-5" style={{ background: CARD_BG, border: CARD_BORDER, boxShadow: CARD_GLOW }}>
      {expired && <div className="mb-4"><SessionExpiredNotice /></div>}
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold mb-0.5" style={{ color: ACCENT }}>Today&apos;s budget</p>
          <p className="font-semibold text-sm" style={{ color: INK }}>Calories are your money — spend them well</p>
        </div>
        <button onClick={() => setOpen((o) => !o)} className="text-white px-3.5 py-2 font-bold text-[11px] uppercase tracking-wider rounded-xl hover:scale-[1.03] transition-transform" style={{ background: ACCENT }}>{open ? 'Close' : '+ Log food'}</button>
      </div>
      {dayType && (
        <p className="text-[11px] mb-4" style={{ color: MUTED }}>
          <span className="inline-block px-2 py-0.5 rounded-full font-semibold" style={{ background: `${ACCENT}1A`, color: ACCENT }}>{dayType === 'workout' ? 'Workout day' : 'Rest day'}</span>
          <span className="ml-2">bigger budget on training days, leaner on rest.</span>
        </p>
      )}

      {/* Money ring (calories = dollars) + the one macro bar that matters */}
      <div className="flex items-center gap-5 mb-4">
        <div className={pop ? 'luf-pop' : ''}>
          <Ring pct={calPct} size={104} stroke={9} color={calOver ? OVER_BG : ACCENT}>
            <div className="text-center leading-none">
              {hasCalBudget ? (
                <>
                  <p className="text-[8px] uppercase tracking-wider mb-0.5" style={{ color: MUTED }}>{calOver ? 'over' : 'left'}</p>
                  <p className="font-bold text-xl" style={{ color: calOver ? OVER_TEXT : ACCENT }}>{calOver ? '-' : ''}${Math.abs(remaining)}</p>
                  <p className="text-[9px] tracking-wider mt-0.5" style={{ color: MUTED }}>of ${calBudget}</p>
                </>
              ) : (
                <>
                  <p className="text-[8px] uppercase tracking-wider mb-0.5" style={{ color: MUTED }}>logged</p>
                  <p className="font-bold text-xl" style={{ color: ACCENT }}>{t.calories}</p>
                  <p className="text-[9px] tracking-wider mt-0.5" style={{ color: MUTED }}>no goal yet</p>
                </>
              )}
            </div>
          </Ring>
        </div>
        <div className="flex-1 space-y-2.5">
          <MacroBar label="Protein" val={t.protein_g} target={tar.protein_g} />
          <p className="text-[10px]" style={{ color: MUTED }}>Hit your protein and cravings get quieter — that&apos;s the goal, not just the number.</p>
        </div>
      </div>
      <div className="mb-4 rounded-2xl border px-4 py-3 text-center" style={{ borderColor: calOver ? `${OVER_BG}66` : `${ACCENT}66`, background: calOver ? `${OVER_BG}1A` : `${ACCENT}1A` }}>
        <p className="text-base font-bold" style={{ color: calOver ? OVER_TEXT : ACCENT }}>
          {loading
            ? 'Loading your day…'
            : !hasCalBudget
            ? (t.calories === 0 ? 'Log your first meal below — set a calorie goal anytime to track against it.' : `Logged $${t.calories} so far — set a calorie goal to see what's left.`)
            : calOver
            ? `$${Math.abs(remaining)} over budget — no guilt, fresh budget tomorrow.`
            : `Spent $${t.calories} · $${remaining} left${t.calories === 0 ? ' — log your first meal below' : ''}`}
        </p>
        {!hasCalBudget && (
          <a href="/plan/intake" className="inline-block mt-1.5 text-xs font-semibold underline" style={{ color: ACCENT }}>Set my calorie goal →</a>
        )}
      </div>

      {/* Merged in from the old standalone "today's meals" card — whether a
          real meal plan exists for today at all, distinct from the ring
          above (which only shows a budget number, not whether it's planned). */}
      {mealStatus?.kind === 'eatingOut' && (
        <a href="/plan/eating-out" className="mb-4 flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5" style={{ background: 'rgba(2,31,22,0.08)', border: `1px solid ${ACCENT}33` }}>
          <span className="text-xs font-semibold" style={{ color: INK }}>Eat-out day — see exactly what to order</span>
          <span className="text-xs shrink-0" style={{ color: ACCENT }}>→</span>
        </a>
      )}
      {mealStatus?.kind === 'planned' && (
        <a href="/plan/meals" className="mb-4 flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5" style={{ background: 'rgba(2,31,22,0.08)', border: `1px solid ${ACCENT}33` }}>
          <span className="text-xs" style={{ color: MUTED }}>{mealStatus.totalProtein}g protein planned today</span>
          <span className="text-xs font-semibold shrink-0" style={{ color: ACCENT }}>Edit my meals →</span>
        </a>
      )}
      {mealStatus?.kind === 'empty' && (
        <div className="mb-4 rounded-xl px-3.5 py-3 text-center" style={{ background: 'rgba(2,31,22,0.08)', border: `1px solid ${ACCENT}33` }}>
          <p className="text-xs mb-2" style={{ color: MUTED }}>{mealStatus.isSunday ? 'Sunday — no cook plan, eat mindful and log whatever you have.' : "No meal plan yet — build this week's and it'll show up here."}</p>
          {!mealStatus.isSunday && <a href="/plan/meals" className="inline-block text-white px-4 py-2 font-bold text-[10px] uppercase tracking-wider rounded-lg" style={{ background: ACCENT }}>Build my meals</a>}
        </div>
      )}

      {/* One-tap: log a meal straight from today's plan */}
      {planned.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: MUTED }}>From today&apos;s plan — tap to log</p>
          <div className="flex flex-wrap gap-2">
            {planned.map((p, i) => (
              <button key={i} onClick={() => logPlanned(p)} disabled={saving} className="text-left rounded-xl px-3 py-2 transition-colors disabled:opacity-50" style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${ACCENT}33` }}>
                <span className="text-xs font-medium block leading-tight" style={{ color: INK }}>{p.name}</span>
                <span className="text-[10px]" style={{ color: MUTED }}>{p.cal} cal · {p.protein}g P</span>
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
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a food, or say it" autoFocus className="flex-1 min-w-0 bg-charcoal border border-smoke rounded-lg px-3 py-2 text-white text-sm placeholder:text-ivory/30 focus:border-gold/60 outline-none" />
              <VoiceButton onInterim={(t) => setQ(t)} onResult={(t) => { setQ(t); runSearch(t) }} />
              <button type="submit" disabled={searching || !q.trim()} className="shrink-0 bg-gold text-obsidian px-3 rounded-lg font-bold text-xs uppercase disabled:opacity-50">{searching ? '…' : 'Go'}</button>
            </form>
          </div>

          {/* Snap a photo — stores the photo, then routes here so the real
              logging (search/manual, below) happens right after. No longer
              creates its own log row directly (2026-09-03 fix — see
              app/api/plan/food-photo/route.ts for why). */}
          <MealPhotoButton />

          {/* Results — verified DB facts (green) vs AI estimate (amber) */}
          {results.length > 0 && !picking && (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {results.some((f) => f.brand) && (
                <p className="text-ivory/35 text-[10px] px-0.5">Don&apos;t see your exact brand? Pick the generic one at the top — macros are close across brands unless you know yours specifically.</p>
              )}
              {results.map((f, i) => (
                <button key={i} onClick={() => { if (f.source === 'usda') { setPicking(f) } else { logEstimatedFood(f) } }} disabled={saving} className="w-full text-left flex items-center gap-2 bg-charcoal border border-smoke rounded-lg px-3 py-2 hover:border-gold/50 transition-colors disabled:opacity-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{f.name}{f.brand ? <span className="text-ivory/40"> · {f.brand}</span> : null}</p>
                    {/* Was "12P · 1C · 10F" — bare letter shorthand requires
                        already knowing protein/carbs/fat abbreviations
                        (novice glance-test audit, 2026-09-03). Spelled out
                        to match the friendlier "12g protein" phrasing one
                        screen later in the same flow (the quantity picker). */}
                    <p className="text-ivory/40 text-[10px]">{f.source === 'usda' ? 'per 100g' : `${f.servings} ${f.serving_label || 'serving'}`} · {f.calories} cal · {f.protein_g}g protein · {f.carbs_g}g carbs · {f.fats_g}g fat</p>
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
                <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" autoCorrect="off" autoCapitalize="off" spellCheck={false} className="w-24 bg-obsidian border border-smoke rounded-lg px-3 py-2 text-white text-sm focus:border-gold/60 outline-none" />
                <div className="flex rounded-lg overflow-hidden border border-smoke">
                  {/* "piece" only offered when we have a real, verified gram
                      weight for this food (see lib/food-portions.ts) — never
                      a fabricated conversion for something we don't know. */}
                  {(piece ? ['piece', 'g', 'oz'] : ['g', 'oz'] as const).map((u) => (
                    <button key={u} onClick={() => setUnit(u as 'g' | 'oz' | 'piece')} className={`px-3 py-2 text-xs font-bold uppercase ${unit === u ? 'bg-gold text-obsidian' : 'bg-obsidian text-ivory/50'}`}>{u === 'piece' ? (piece?.label || 'piece') : u}</button>
                  ))}
                </div>
              </div>
              <p className="text-ivory/50 text-xs">{scaled.calories} cal · {scaled.protein_g}g protein · {scaled.carbs_g}g carbs · {scaled.fats_g}g fat</p>
              {/* Honest gap, not a silent one (Asa's catch, 2026-09-03: "this
                  isn't just for eggs, right?") — this food isn't one of the
                  ones we have a real per-piece weight for, so quantity here
                  means weight, not count. Better to say so than let her
                  assume "2" means "2 of them" the same way the original bug
                  worked. */}
              {!piece && (
                <p className="text-ivory/40 text-xs">No piece size on file for this food yet — enter grams or ounces, not a count.</p>
              )}
              {zeroCalorieWarning && (
                <p className="text-amber-400 text-xs font-semibold">That works out to 0 calories — double-check the quantity before logging.</p>
              )}
              <div className="flex gap-2">
                <button onClick={confirmLogFood} disabled={saving || grams <= 0 || zeroCalorieWarning} className="flex-1 bg-gold text-obsidian py-2.5 font-bold text-xs uppercase tracking-wider rounded-lg disabled:opacity-50">{saving ? 'Logging…' : 'Log it'}</button>
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
              <div>
                <label className="text-ivory/40 text-[9px] uppercase tracking-wider block mb-1">Food name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Homemade chili" className="w-full bg-charcoal border border-smoke rounded-lg px-3 py-2 text-white text-sm placeholder:text-ivory/30 focus:border-gold/60 outline-none" />
              </div>
              <div className="w-1/2 pr-1">
                {/* Real bug found live, 2026-09-03 (novice glance-test
                    audit): a bare "1" with no visible label (only a
                    placeholder, hidden the moment it has a value) looked
                    like an unlabeled 5th macro field next to Cal/Protein/
                    Carbs/Fats below. Meal already has its own real selector
                    above the search bar — no need to duplicate it here. */}
                <label className="text-ivory/40 text-[9px] uppercase tracking-wider block mb-1">How many servings?</label>
                <input value={form.servings} onChange={(e) => setForm({ ...form, servings: e.target.value })} inputMode="decimal" autoCorrect="off" autoCapitalize="off" spellCheck={false} className="w-full bg-charcoal border border-smoke rounded-lg px-3 py-2 text-white text-sm placeholder:text-ivory/30 focus:border-gold/60 outline-none" />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {([['calories', 'Calories'], ['protein_g', 'Protein (g)'], ['carbs_g', 'Carbs (g)'], ['fats_g', 'Fat (g)']] as const).map(([k, lbl]) => (
                  <div key={k}>
                    <label className="text-ivory/40 text-[9px] uppercase tracking-wider block mb-1">{lbl}</label>
                    <input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} inputMode="numeric" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="0" className="w-full bg-charcoal border border-smoke rounded-lg px-2 py-2 text-white text-sm placeholder:text-ivory/30 focus:border-gold/60 outline-none" />
                  </div>
                ))}
              </div>
              <button type="submit" disabled={saving || !form.name.trim()} className="w-full bg-gold text-obsidian py-2.5 font-bold text-xs uppercase tracking-wider rounded-lg disabled:opacity-50">{saving ? 'Saving…' : 'Add to today'}</button>
            </form>
          )}
        </div>
      )}

      {/* Logged entries, grouped by meal — cal + protein only, matching the
          single-macro simplification above (carbs/fat targets aren't shown
          by default anymore, so showing them per-entry would be inconsistent). */}
      {MEALS.filter((m) => grouped[m]?.length).map((m) => (
        <div key={m} className="mb-3 last:mb-0">
          <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: MUTED }}>{MEAL_LABEL[m]}</p>
          <div className="space-y-1.5">
            {grouped[m].map((e) => (
              <div key={e.id}>
                <div className="flex items-center gap-2 rounded-lg px-3 py-2 group" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  {/* Tap the row (not the × ) to edit — same MyFitnessPal/
                      Lose It! pattern researched live, 2026-09-03. */}
                  <button onClick={() => startEdit(e)} className="flex-1 min-w-0 text-left flex items-center gap-1.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: INK }}>{e.name}{e.servings !== 1 ? <span style={{ color: MUTED }}> ×{e.servings}</span> : null}</p>
                      <p className="text-[10px]" style={{ color: MUTED }}>{e.calories} cal · {e.protein_g}g protein</p>
                    </div>
                    <span className="shrink-0 text-sm" style={{ color: MUTED }}>{editingId === e.id ? '⌄' : '›'}</span>
                  </button>
                  {confirmRemoveId === e.id ? (
                    <button onClick={() => handleRemoveTap(e.id)} aria-label="Tap again to remove" className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full text-white bg-red-500 shrink-0">Remove?</button>
                  ) : (
                    <button onClick={() => handleRemoveTap(e.id)} aria-label="Remove" className="text-lg leading-none px-1 opacity-60 group-hover:opacity-100 transition-opacity hover:text-red-500" style={{ color: MUTED }}>×</button>
                  )}
                </div>

                {/* Edit card — black + green, distinct from this page's own
                    gold "budget" styling on purpose (Asa's pick after a
                    live mockup review, 2026-09-03). Doesn't touch the
                    budget ring, search, or new-entry quantity picker above,
                    which all keep their existing look. */}
                {editingId === e.id && (
                  <div className="mt-1.5 rounded-xl p-3 space-y-2.5" style={{ background: '#000', border: '1.5px solid #4CAF7D' }}>
                    <p className="text-white text-sm font-semibold">{e.name}</p>
                    <div className="flex items-center gap-2">
                      <input value={editQty} onChange={(ev) => setEditQty(ev.target.value)} inputMode="decimal" autoCorrect="off" autoCapitalize="off" spellCheck={false} className="w-20 rounded-lg px-3 py-2 text-white text-sm text-center" style={{ background: '#000', border: '1px solid rgba(76,175,125,0.4)' }} />
                      <span className="text-white/50 text-xs">{editUnitLabel}</span>
                    </div>
                    {editScaled && (
                      <p className="text-white/70 text-xs">{editScaled.calories} cal &middot; {editScaled.protein_g}g protein &middot; {editScaled.carbs_g}g carbs &middot; {editScaled.fats_g}g fat</p>
                    )}
                    <div className="flex gap-2">
                      <button onClick={saveEdit} disabled={saving || editQtyNum <= 0} className="flex-1 py-2.5 font-bold text-xs uppercase tracking-wider rounded-lg disabled:opacity-50" style={{ background: '#4CAF7D', color: '#000' }}>{saving ? 'Saving…' : 'Save changes'}</button>
                      <button onClick={() => setEditingId(null)} className="px-4 py-2.5 text-white/50 text-xs font-semibold hover:text-white">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      {!loading && (data?.entries.length || 0) === 0 && !open && (
        <p className="text-xs text-center py-2" style={{ color: MUTED }}>Nothing logged yet. Tap a plan meal above or <button onClick={() => setOpen(true)} className="underline" style={{ color: ACCENT }}>add food</button>.</p>
      )}
    </div>
  )
}
