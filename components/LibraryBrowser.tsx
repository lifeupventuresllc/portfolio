'use client'

import { useMemo, useState } from 'react'
import { RECIPES, byCategory, type MealCategory } from '@/lib/recipes'
import { costTier, portionIngredients, hasIngredients } from '@/lib/ingredients'
import { RECIPE_INSTRUCTIONS } from '@/lib/recipe-instructions'

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
  const [selected, setSelected] = useState<string | null>(null)

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
            <button key={r.name} onClick={() => setSelected(r.name)} className="text-left bg-charcoal border border-smoke rounded-2xl p-4 hover:border-gold/40 transition-colors">
              <div className="flex justify-between items-start gap-2 mb-1">
                <span className="text-white font-semibold text-sm leading-tight">{r.name}</span>
                {r.budget && <span className="text-[9px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full whitespace-nowrap">Budget</span>}
              </div>
              <div className="flex gap-3 text-xs text-ivory/50 items-center">
                <span className="text-gold font-semibold">{r.cal} cal</span><span>{r.protein}g P</span>
                {r.carbs > 0 && <span>{r.carbs}g C</span>}{r.fat > 0 && <span>{r.fat}g F</span>}
                {tier && <span className={`font-bold ml-auto ${tierColor(tier)}`}>{tier}</span>}
              </div>
            </button>
          )
        })}
      </div>
      {recipes.length === 0 && <p className="text-ink/50 text-sm text-center py-8">No recipes match &ldquo;{q}&rdquo;.</p>}

      {selected && (() => {
        const r = RECIPES.find((x) => x.name === selected)
        if (!r) return null
        const ings = hasIngredients(r.name) ? portionIngredients(r.name, 1) : []
        const steps = RECIPE_INSTRUCTIONS[r.name] || []
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
            <div className="relative bg-obsidian border-t sm:border border-smoke rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto p-6">
              <button onClick={() => setSelected(null)} aria-label="Close" className="absolute right-4 top-4 text-ivory/50 hover:text-white text-2xl leading-none">×</button>
              <p className="text-gold text-[10px] uppercase tracking-[0.2em] font-semibold mb-1">{r.servings || '1 serving'}</p>
              <h3 className="text-white text-xl font-bold mb-2 pr-8">{r.name}</h3>
              <div className="flex gap-3 text-xs text-ivory/60 mb-5">
                <span className="text-gold font-semibold">{r.cal} cal</span><span>{r.protein}g P</span>
                {r.carbs > 0 && <span>{r.carbs}g C</span>}{r.fat > 0 && <span>{r.fat}g F</span>}
              </div>

              {ings.length > 0 && (
                <div className="mb-5">
                  <p className="text-gold/80 text-[10px] uppercase tracking-wider font-semibold mb-2">Ingredients</p>
                  <ul className="space-y-1">
                    {ings.map((i, idx) => <li key={idx} className="text-ivory/80 text-sm">• {i.amount} {i.item}</li>)}
                  </ul>
                </div>
              )}

              {steps.length > 0 ? (
                <div>
                  <p className="text-gold/80 text-[10px] uppercase tracking-wider font-semibold mb-2">Directions</p>
                  <ol className="space-y-2">
                    {steps.map((s, idx) => (
                      <li key={idx} className="text-ivory/80 text-sm flex gap-2.5">
                        <span className="text-gold font-bold shrink-0">{idx + 1}.</span>{s}
                      </li>
                    ))}
                  </ol>
                </div>
              ) : ings.length === 0 ? (
                <p className="text-ivory/40 text-sm">No prep needed — grab and go.</p>
              ) : (
                <p className="text-ivory/40 text-sm">Combine ingredients as listed — no further steps needed.</p>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
