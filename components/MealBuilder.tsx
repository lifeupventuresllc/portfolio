'use client'

import { useState } from 'react'
import { byCategory, type Recipe, type MealCategory } from '@/lib/recipes'
import { buildWeekFromSelections, PICK_GUIDE, type WeekPlan, type DayType } from '@/lib/meal-plan'
import { costTier } from '@/lib/ingredients'
import BudgetBar from '@/components/BudgetBar'
import WeekPlanView from '@/components/WeekPlanView'

type SlotKey = 'breakfasts' | 'lunches' | 'dinners' | 'snacks' | 'desserts'
const SLOTS: { key: SlotKey; label: string; cat: MealCategory; hint: (g: { mains: string; snacks: string; desserts: string }) => string; optional?: boolean }[] = [
  { key: 'breakfasts', label: 'Breakfasts', cat: 'breakfast', hint: (g) => g.mains },
  { key: 'lunches', label: 'Lunches', cat: 'main', hint: (g) => g.mains },
  { key: 'dinners', label: 'Dinners', cat: 'main', hint: (g) => g.mains },
  { key: 'snacks', label: 'Snacks', cat: 'snack', hint: (g) => g.snacks, optional: true },
  { key: 'desserts', label: 'Desserts', cat: 'dessert', hint: (g) => g.desserts, optional: true },
]
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
// How many to auto-pick per slot at each cook-day level (matches PICK_GUIDE)
const PICK_COUNTS: Record<1 | 2 | 3, { mains: number; snacks: number; desserts: number }> = {
  1: { mains: 3, snacks: 3, desserts: 2 },
  2: { mains: 3, snacks: 3, desserts: 2 },
  3: { mains: 4, snacks: 3, desserts: 3 },
}

export default function MealBuilder({ initial }: {
  initial: { name: string; workoutCal: number; restCal: number; protein: number; cookDays: 1 | 2 | 3; budget?: number; weightLbs?: number }
}) {
  const [cookDays, setCookDays] = useState<1 | 2 | 3>(initial.cookDays)
  const [dayTypes, setDayTypes] = useState<DayType[]>(['workout', 'workout', 'workout', 'rest', 'workout', 'rest'])
  const [eatOut, setEatOut] = useState<boolean[]>([false, false, false, false, false, false])
  const [sel, setSel] = useState<Record<SlotKey, Recipe[]>>({ breakfasts: [], lunches: [], dinners: [], snacks: [], desserts: [] })
  const [tab, setTab] = useState<SlotKey>('breakfasts')
  const [budget, setBudget] = useState<string>(initial.budget ? String(initial.budget) : '')
  const [fitBudget, setFitBudget] = useState<boolean>(!!initial.budget)  // on by default when she gave a budget
  const [plan, setPlan] = useState<WeekPlan | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const budgetNum = Number(budget) || 0
  const tierColor = (t: string) => t === '$' ? 'text-green-400' : t === '$$' ? 'text-gold' : 'text-red-400'

  const guide = PICK_GUIDE[cookDays]
  const [flash, setFlash] = useState('')
  const has = (k: SlotKey, r: Recipe) => sel[k].some((x) => x.name === r.name)
  const toggle = (k: SlotKey, r: Recipe) => {
    setSaved(false)
    const adding = !has(k, r)
    if (adding) { setFlash(r.name); setTimeout(() => setFlash(''), 550) }
    setSel((s) => ({ ...s, [k]: has(k, r) ? s[k].filter((x) => x.name !== r.name) : [...s[k], r] }))
  }
  const toggleDay = (i: number) => { setSaved(false); setDayTypes((d) => d.map((t, x) => (x === i ? (t === 'workout' ? 'rest' : 'workout') : t))) }
  const toggleEatOut = (i: number) => { setSaved(false); setEatOut((e) => e.map((v, x) => (x === i ? !v : v))) }

  function buildFrom(selections: Record<SlotKey, Recipe[]>) {
    return buildWeekFromSelections({
      name: initial.name, workoutDayCal: initial.workoutCal, restDayCal: initial.restCal,
      proteinTarget: initial.protein, cookDays, dayTypes, selections,
      eatOutDays: eatOut, weightLbs: initial.weightLbs,
    })
  }
  function build() {
    setError('')
    if (!sel.breakfasts.length || !sel.lunches.length || !sel.dinners.length) { setError('Pick at least one breakfast, one lunch, and one dinner.'); return }
    setPlan(buildFrom(sel))
  }

  // ✨ One-tap: auto-pick a full week she can still tweak, then build it.
  function autoBuild() {
    setError(''); setSaved(false)
    const c = PICK_COUNTS[cookDays]
    const pick = (cat: MealCategory, count: number, skip = 0) => {
      let pool = byCategory(cat)
      if (fitBudget) { const cheap = pool.filter((r) => costTier(r.name, r.budget) !== '$$$'); if (cheap.length >= count) pool = cheap }
      const sorted = [...pool].sort((a, b) => b.protein - a.protein)
      const out: Recipe[] = []
      for (let k = 0; out.length < count && k < sorted.length; k++) out.push(sorted[(skip + k) % sorted.length])
      return out
    }
    const picks: Record<SlotKey, Recipe[]> = {
      breakfasts: pick('breakfast', c.mains),
      lunches: pick('main', c.mains, 0),
      dinners: pick('main', c.mains, c.mains), // offset so lunch ≠ dinner
      snacks: pick('snack', c.snacks),
      desserts: pick('dessert', c.desserts),
    }
    setSel(picks)
    setPlan(buildFrom(picks))
  }
  async function save() {
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/plan/meals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cookDays, dayTypes, eatOutDays: eatOut,
          selections: Object.fromEntries(SLOTS.map((s) => [s.key, sel[s.key].map((r) => r.name)])),
        }),
      })
      const data = await res.json()
      if (data.success) { setPlan(data.plan); setSaved(true) } else setError(data.error || 'Could not save your plan.')
    } catch { setError('Could not save your plan.') }
    setSaving(false)
  }

  const chip = (active: boolean) => `px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${active ? 'bg-gold text-obsidian' : 'bg-charcoal border border-smoke text-ivory/60'}`
  const activeSlot = SLOTS.find((s) => s.key === tab)!

  return (
    <div className="space-y-6">
      {/* Targets banner */}
      <div className="bg-charcoal border-2 border-gold/30 rounded-2xl p-4 flex flex-wrap gap-x-6 gap-y-2 justify-between">
        <div><p className="text-ivory/40 text-[10px] uppercase tracking-wider">Workout day</p><p className="text-gold font-bold">{initial.workoutCal.toLocaleString()} cal</p></div>
        <div><p className="text-ivory/40 text-[10px] uppercase tracking-wider">Rest day</p><p className="text-green-400 font-bold">{initial.restCal.toLocaleString()} cal</p></div>
        <div><p className="text-ivory/40 text-[10px] uppercase tracking-wider">Protein</p><p className="text-white font-bold">{initial.protein}g</p></div>
      </div>

      {/* ✨ Auto-build — the seamless one-tap option */}
      <div className="bg-gradient-to-br from-gold/15 to-charcoal border border-gold/40 rounded-2xl p-5 text-center">
        <p className="text-white font-bold text-lg mb-1">Want me to build your week for you?</p>
        <p className="text-ivory/55 text-sm mb-4">One tap and I&apos;ll pick your meals, portion every day to your calories, and set your cook schedule. Tweak anything after.</p>
        <button onClick={autoBuild} className="luf-glow bg-gold text-obsidian px-8 py-3.5 font-bold text-sm uppercase tracking-wider rounded-2xl hover:scale-[1.02] active:scale-[.98] transition-transform">✨ Auto-build my week</button>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px bg-smoke flex-1" />
        <span className="text-ivory/40 text-xs uppercase tracking-wider">or build it yourself</span>
        <div className="h-px bg-smoke flex-1" />
      </div>

      {/* Cook days */}
      <div>
        <p className="text-white text-sm font-bold mb-2"><span className="text-gold">1.</span> How many days will you cook this week?</p>
        <div className="flex gap-2">
          {[1, 2, 3].map((n) => (
            <button key={n} onClick={() => { setCookDays(n as 1 | 2 | 3); setSaved(false) }} className={chip(cookDays === n)}>{n} cook {n === 1 ? 'day' : 'days'}</button>
          ))}
        </div>
        <div className="mt-3 bg-gold/10 border border-gold/30 rounded-xl px-4 py-3">
          <p className="text-gold text-xs font-bold uppercase tracking-wider mb-1">📋 What to pick for {cookDays} cook {cookDays === 1 ? 'day' : 'days'}</p>
          <p className="text-white text-sm leading-relaxed">
            <span className="font-bold text-gold">{guide.mains}</span> breakfasts, lunches &amp; dinners ·
            <span className="font-bold text-gold"> {guide.snacks}</span> snacks ·
            <span className="font-bold text-gold"> {guide.desserts}</span> desserts
          </p>
        </div>
      </div>

      {/* Grocery budget — seamless: prefilled, auto-hides pricey meals */}
      <div>
        <p className="text-ivory/50 text-xs uppercase tracking-wider mb-2">Weekly grocery budget (optional)</p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-obsidian border border-smoke rounded-xl px-3 py-2">
            <span className="text-ivory/50 text-sm mr-1">$</span>
            <input type="number" value={budget} onChange={(e) => { setBudget(e.target.value); setSaved(false) }} placeholder="90" className="w-20 bg-transparent text-white text-sm focus:outline-none" />
            <span className="text-ivory/40 text-xs ml-1">/week</span>
          </div>
          <button onClick={() => setFitBudget((v) => !v)} className={chip(fitBudget)}>
            {fitBudget ? '✓ ' : ''}Fit my budget
          </button>
          <span className="text-ivory/40 text-xs">Hides pricier <span className="text-red-400">$$$</span> meals so you only see what fits.</span>
        </div>
      </div>

      {/* Day types */}
      <div>
        <p className="text-white text-sm font-bold mb-2"><span className="text-gold">2.</span> Mark your workout &amp; rest days <span className="text-ivory/40 font-normal text-xs">(tap to switch — workout days eat more)</span></p>
        <div className="grid grid-cols-6 gap-2">
          {DAYS.map((d, i) => (
            <button key={d} onClick={() => toggleDay(i)} disabled={eatOut[i]} className={`py-2 rounded-xl text-xs font-semibold ${eatOut[i] ? 'bg-obsidian border border-smoke text-ivory/25' : dayTypes[i] === 'workout' ? 'bg-gold/15 text-gold border border-gold/40' : 'bg-green-500/10 text-green-400 border border-green-500/30'}`}>
              <span className="block">{d}</span><span className="block text-[9px] mt-0.5">{dayTypes[i] === 'workout' ? 'Work' : 'Rest'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Eating out — Escape Plan fast-food days (highlighted) */}
      <div className="bg-blue-500/[0.06] border border-blue-500/30 rounded-2xl p-4">
        <p className="text-white text-sm font-bold mb-1">🍔 Eating out any days? <span className="text-ivory/40 font-normal text-xs">(optional)</span></p>
        <p className="text-ivory/50 text-xs mb-3">Tap a day — it uses your fast-food Escape Plan (exact orders + macros) instead of cooking. No prep, no groceries.</p>
        <div className="grid grid-cols-6 gap-2">
          {DAYS.map((d, i) => (
            <button key={d} onClick={() => toggleEatOut(i)} className={`py-2 rounded-xl text-xs font-semibold transition-colors ${eatOut[i] ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50' : 'bg-obsidian border border-smoke text-ivory/50 hover:border-blue-500/40'}`}>
              <span className="block">{d}</span><span className="block text-[9px] mt-0.5">{eatOut[i] ? 'Out' : '—'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Meal picker */}
      <div>
        <p className="text-white text-sm font-bold mb-2"><span className="text-gold">3.</span> Pick your meals <span className="text-ivory/40 font-normal text-xs">— breakfasts, lunches, dinners, snacks &amp; desserts</span></p>
        <div className="flex gap-2 mb-3 flex-wrap">
          {SLOTS.map((s) => (
            <button key={s.key} onClick={() => setTab(s.key)} className={chip(tab === s.key)}>
              {s.label}{sel[s.key].length > 0 && <span className="ml-1 text-[10px]">({sel[s.key].length})</span>}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between bg-obsidian border border-gold/20 rounded-xl px-4 py-2.5 mb-3">
          <p className="text-white text-sm font-semibold">
            Pick <span className="text-gold">{activeSlot.hint(guide).replace(' each', '')}</span> {activeSlot.label.toLowerCase()}
            {activeSlot.optional && <span className="text-ivory/40 font-normal text-xs"> (optional)</span>}
          </p>
          <span className="text-ivory/50 text-xs whitespace-nowrap">{sel[tab].length} added</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {byCategory(activeSlot.cat).map((r) => {
            const on = has(tab, r)
            const tier = costTier(r.name, r.budget)
            if (fitBudget && tier === '$$$' && !on) return null  // seamless: hide pricey unless already picked
            return (
              <button key={r.name} onClick={() => toggle(tab, r)} className={`text-left rounded-2xl p-4 border transition-colors ${flash === r.name ? 'luf-pop' : ''} ${on ? 'bg-gold/10 border-gold' : 'bg-charcoal border-smoke hover:border-gold/50'}`}>
                <div className="flex justify-between items-start gap-2 mb-1">
                  <span className="text-white font-semibold text-sm leading-tight">{r.name}</span>
                  {r.budget && <span className="text-[9px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full whitespace-nowrap">Budget</span>}
                </div>
                <div className="flex gap-3 text-xs text-ivory/50 items-center">
                  <span className="text-gold font-semibold">{r.cal} cal</span><span>{r.protein}g P</span>
                  {tier && <span className={`font-bold ${tierColor(tier)}`}>{tier}</span>}
                </div>
                <span className={`text-xs mt-1 inline-block ${on ? 'text-gold' : 'text-ivory/40'}`}>{on ? '✓ Added' : '+ Add'}</span>
              </button>
            )
          })}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button onClick={build} className="luf-glow flex-1 bg-gold text-obsidian px-6 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all hover:scale-[1.01]">Build my week</button>
        {plan && <button onClick={save} disabled={saving} className="flex-1 bg-charcoal border border-gold text-gold px-6 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl disabled:opacity-40">{saving ? 'Saving...' : saved ? '✓ Saved' : 'Save to my plan'}</button>}
      </div>

      {plan && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-1 mt-4">What to Eat This Week</h2>
          <p className="text-ivory/50 text-sm mb-4">Portions are scaled to hit each day&apos;s target. {saved ? 'Saved to your plan ✓' : 'Tweak and rebuild, or save it.'}</p>
          {budgetNum > 0 && plan.groceryCost > 0 && (
            <div className={`rounded-2xl p-4 mb-4 border ${plan.groceryCost <= budgetNum ? 'bg-green-500/10 border-green-500/40' : 'bg-red-500/10 border-red-500/40'}`}>
              <p className="text-white text-sm font-semibold">
                {plan.groceryCost <= budgetNum
                  ? `✓ ~$${plan.groceryCost} — you're $${budgetNum - plan.groceryCost} under your $${budgetNum} budget.`
                  : `Heads up: ~$${plan.groceryCost} is $${plan.groceryCost - budgetNum} over your $${budgetNum} budget.`}
              </p>
              {plan.groceryCost > budgetNum && <p className="text-ivory/50 text-xs mt-1">Swap a <span className="text-red-400">$$$</span> meal for a <span className="text-green-400">Budget</span> pick, or keep &ldquo;Fit my budget&rdquo; on.</p>}
              <BudgetBar cost={plan.groceryCost} budget={budgetNum} />
            </div>
          )}
          <WeekPlanView plan={plan} />
        </div>
      )}
    </div>
  )
}
