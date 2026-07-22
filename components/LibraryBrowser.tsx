'use client'

import { useMemo, useState } from 'react'
import { RECIPES, byCategory, type MealCategory } from '@/lib/recipes'
import { costTier } from '@/lib/ingredients'

// The Cookbook — recipes only. Workouts live in their own Workout Library
// (components/MoveBrowser.tsx) so this stays a pure "what to eat" browser.
// Lunch and Dinner both draw from the 'main' pool (same recipes serve either) —
// tracked by label, not category, so they highlight independently in the UI.
const MEAL_TABS: { label: string; cat: MealCategory }[] = [
  { label: 'Breakfast', cat: 'breakfast' },
  { label: 'Lunch', cat: 'main' },
  { label: 'Dinner', cat: 'main' },
  { label: 'Snacks', cat: 'snack' },
  { label: 'Desserts', cat: 'dessert' },
]

export default function LibraryBrowser() {
  const [tabLabel, setTabLabel] = useState('Breakfast')
  const [q, setQ] = useState('')
  const [budgetOnly, setBudgetOnly] = useState(false)

  const cat = MEAL_TABS.find((t) => t.label === tabLabel)?.cat || 'breakfast'
  const budgetCount = useMemo(() => RECIPES.filter((r) => r.budget).length, [])
  const recipes = useMemo(() => byCategory(cat)
    .filter((r) => r.name.toLowerCase().includes(q.toLowerCase()))
    .filter((r) => !budgetOnly || r.budget), [cat, q, budgetOnly])

  const pill = (active: boolean) => `px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${active ? 'bg-gold text-obsidian' : 'bg-charcoal border border-smoke text-ivory/60'}`
  const tierColor = (t: string) => t === '$' ? 'text-green-400' : t === '$$' ? 'text-gold' : 'text-red-400'

  return (
    <div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search recipes…"
        className="w-full px-4 py-3 bg-obsidian border border-smoke rounded-xl text-white text-sm mb-4 focus:outline-none focus:border-gold" />

      <div className="flex gap-2 mb-3 flex-wrap items-center">
        {MEAL_TABS.map((t) => <button key={t.label} onClick={() => setTabLabel(t.label)} className={pill(tabLabel === t.label)}>{t.label}</button>)}
        <button
          onClick={() => setBudgetOnly((b) => !b)}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${budgetOnly ? 'bg-green-500 text-obsidian' : 'bg-charcoal border border-green-500/40 text-green-400'}`}>
          {budgetOnly ? '✓ ' : '💚 '}Budget-friendly · {budgetCount}
        </button>
      </div>
      {budgetOnly && (
        <p className="text-green-400/80 text-xs mb-4">Showing only budget-friendly picks — the cheapest way to hit your macros. Tap the toggle to see everything again.</p>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        {recipes.map((r) => {
          const tier = costTier(r.name, r.budget)
          return (
            <div key={r.name} className="bg-charcoal border border-smoke rounded-2xl p-4 hover:border-gold/40 transition-colors">
              <div className="flex justify-between items-start gap-2 mb-1">
                <span className="text-white font-semibold text-sm leading-tight">{r.name}</span>
                {r.budget && <span className="text-[9px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full whitespace-nowrap">Budget</span>}
              </div>
              <div className="flex gap-3 text-xs text-ivory/50 items-center">
                <span className="text-gold font-semibold">{r.cal} cal</span><span>{r.protein}g P</span>
                {r.carbs > 0 && <span>{r.carbs}g C</span>}{r.fat > 0 && <span>{r.fat}g F</span>}
                {tier && <span className={`font-bold ml-auto ${tierColor(tier)}`}>{tier}</span>}
              </div>
            </div>
          )
        })}
      </div>
      {recipes.length === 0 && <p className="text-ink/50 text-sm text-center py-8">No recipes match &ldquo;{q}&rdquo;.</p>}
    </div>
  )
}
