'use client'

import { useMemo, useState } from 'react'
import { RECIPES, byCategory, type Recipe, type MealCategory } from '@/lib/recipes'
import { budgetStatus } from '@/lib/meal-plan'

const TABS: { c: MealCategory; l: string }[] = [
  { c: 'breakfast', l: 'Breakfast' }, { c: 'main', l: 'Meals' }, { c: 'snack', l: 'Snacks' }, { c: 'dessert', l: 'Desserts' },
]

export default function MealBuilder() {
  const [workoutCal, setWorkoutCal] = useState(1800)
  const [restCal, setRestCal] = useState(1500)
  const [isWorkoutDay, setIsWorkoutDay] = useState(true)
  const [tab, setTab] = useState<MealCategory>('breakfast')
  const [plate, setPlate] = useState<Recipe[]>([])

  const target = isWorkoutDay ? workoutCal : restCal
  const b = useMemo(() => budgetStatus(target, plate), [target, plate])

  const add = (r: Recipe) => setPlate((p) => [...p, r])
  const removeAt = (i: number) => setPlate((p) => p.filter((_, x) => x !== i))

  const barPct = Math.min(100, b.pct)
  const barColor = b.over ? 'bg-red-500' : b.pct > 85 ? 'bg-gold' : 'bg-green-500'
  const input = 'w-24 px-3 py-2 bg-obsidian border border-smoke rounded-xl text-white text-sm focus:outline-none focus:border-gold'

  return (
    <div className="min-h-[100dvh] bg-paper px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-2">Meal Plan Builder</p>
        <h1 className="text-3xl font-bold text-ink mb-1">Spend Your Calories</h1>
        <p className="text-ink/60 text-sm mb-6">Think of your calories like money. Pick your meals and spend your daily budget — don&apos;t go over.</p>

        {/* Day toggle + budgets */}
        <div className="bg-charcoal border border-smoke rounded-2xl p-4 mb-4 flex flex-wrap items-center gap-4 justify-between">
          <div className="flex gap-2">
            <button onClick={() => setIsWorkoutDay(true)} className={`px-4 py-2 rounded-xl text-sm font-semibold ${isWorkoutDay ? 'bg-gold text-obsidian' : 'bg-obsidian border border-smoke text-ivory/60'}`}>💪🏽 Workout Day</button>
            <button onClick={() => setIsWorkoutDay(false)} className={`px-4 py-2 rounded-xl text-sm font-semibold ${!isWorkoutDay ? 'bg-gold text-obsidian' : 'bg-obsidian border border-smoke text-ivory/60'}`}>😌 Rest Day</button>
          </div>
          <div className="flex items-center gap-3 text-xs text-ivory/50">
            <label className="flex items-center gap-1">Workout $<input type="number" value={workoutCal} onChange={(e) => setWorkoutCal(Number(e.target.value))} className={input} /></label>
            <label className="flex items-center gap-1">Rest $<input type="number" value={restCal} onChange={(e) => setRestCal(Number(e.target.value))} className={input} /></label>
          </div>
        </div>

        {/* The budget bar (calories-as-money) */}
        <div className="bg-charcoal border-2 border-gold/30 rounded-2xl p-5 mb-6 sticky top-2 z-10">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-ivory/40 text-xs uppercase tracking-wider">Today&apos;s budget</p>
              <p className="text-2xl font-bold text-white">${b.target.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-ivory/40 text-xs uppercase tracking-wider">{b.remaining >= 0 ? 'Left to spend' : 'Over budget'}</p>
              <p className={`text-2xl font-bold ${b.over ? 'text-red-400' : 'text-gold'}`}>${Math.abs(b.remaining).toLocaleString()}</p>
            </div>
          </div>
          <div className="h-4 bg-obsidian rounded-full overflow-hidden border border-smoke">
            <div className={`h-full ${barColor} transition-all duration-500 rounded-full`} style={{ width: `${barPct}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-xs text-ivory/50">
            <span>Spent: <span className="text-white font-semibold">${b.spent.toLocaleString()}</span></span>
            <span>Protein: <span className="text-green-400 font-semibold">{b.protein}g</span></span>
            <span>{b.pct}% of budget</span>
          </div>
        </div>

        {/* Today's plate */}
        {plate.length > 0 && (
          <div className="mb-6">
            <p className="text-ink/60 text-xs uppercase tracking-wider mb-2">Today&apos;s plate ({plate.length})</p>
            <div className="space-y-2">
              {plate.map((m, i) => (
                <div key={i} className="flex items-center justify-between bg-charcoal border border-smoke rounded-xl px-4 py-2">
                  <span className="text-white text-sm">{m.name}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-gold text-sm font-semibold">${m.cal}</span>
                    <button onClick={() => removeAt(i)} className="text-ivory/40 hover:text-red-400 text-lg leading-none">&times;</button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meal picker */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {TABS.map((t) => (
            <button key={t.c} onClick={() => setTab(t.c)} className={`px-4 py-2 rounded-xl text-sm font-semibold ${tab === t.c ? 'bg-gold text-obsidian' : 'bg-charcoal border border-smoke text-ivory/60'}`}>{t.l}</button>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {byCategory(tab).map((r) => (
            <button key={r.name} onClick={() => add(r)} className="text-left bg-charcoal border border-smoke rounded-2xl p-4 hover:border-gold/50 transition-colors">
              <div className="flex justify-between items-start gap-2 mb-1">
                <span className="text-white font-semibold text-sm leading-tight">{r.name}</span>
                {r.budget && <span className="text-[9px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full whitespace-nowrap">Budget</span>}
              </div>
              <div className="flex gap-3 text-xs text-ivory/50">
                <span className="text-gold font-semibold">${r.cal}</span>
                <span>{r.protein}g P</span>
                {r.carbs > 0 && <span>{r.carbs}g C</span>}
                {r.fat > 0 && <span>{r.fat}g F</span>}
              </div>
              <span className="text-gold text-xs mt-1 inline-block">+ Add to plate</span>
            </button>
          ))}
        </div>
        <p className="text-ink/45 text-xs text-center mt-6">{RECIPES.length} recipes from The Menu + budget meals. Your weekly plan &amp; eating-out picks come next.</p>
      </div>
    </div>
  )
}
