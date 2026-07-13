'use client'

import { useMemo, useState } from 'react'
import { RECIPES, byCategory, type MealCategory } from '@/lib/recipes'
import { GYM_POOL, AB_POOL, HOME_POOL } from '@/lib/workout-exercises'
import { costTier } from '@/lib/ingredients'

type Tab = 'recipes' | 'moves'
const MEAL_TABS: { c: MealCategory; l: string }[] = [
  { c: 'breakfast', l: 'Breakfast' }, { c: 'main', l: 'Meals' }, { c: 'snack', l: 'Snacks' }, { c: 'dessert', l: 'Desserts' },
]

type Move = { name: string; group: string; tag: string; cue: string }
const GROUP: Record<string, string> = { glutes: 'Legs', hamstrings: 'Legs', quads: 'Legs', calves: 'Legs', back: 'Upper', shoulders: 'Upper', chest: 'Upper', biceps: 'Upper', triceps: 'Upper' }
const ALL_MOVES: Move[] = [
  ...GYM_POOL.map((e) => ({ name: e.name, group: GROUP[e.muscle] || 'Upper', tag: `${e.muscle} · ${e.equip}`, cue: e.cue })),
  ...AB_POOL.map((a) => ({ name: a.name, group: 'Core', tag: `abs · ${a.zone}`, cue: a.cue })),
  ...HOME_POOL.map((h) => ({ name: h.name, group: 'Home', tag: `home · ${h.type}`, cue: '' })),
]
const MOVE_GROUPS = ['All', 'Legs', 'Upper', 'Core', 'Home']

export default function LibraryBrowser() {
  const [tab, setTab] = useState<Tab>('recipes')
  const [cat, setCat] = useState<MealCategory>('breakfast')
  const [group, setGroup] = useState('All')
  const [q, setQ] = useState('')
  const [budgetOnly, setBudgetOnly] = useState(false)

  const budgetCount = useMemo(() => RECIPES.filter((r) => r.budget).length, [])
  const recipes = useMemo(() => byCategory(cat)
    .filter((r) => r.name.toLowerCase().includes(q.toLowerCase()))
    .filter((r) => !budgetOnly || r.budget), [cat, q, budgetOnly])
  const moves = useMemo(() => ALL_MOVES.filter((m) => (group === 'All' || m.group === group) && m.name.toLowerCase().includes(q.toLowerCase())), [group, q])

  const pill = (active: boolean) => `px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${active ? 'bg-gold text-obsidian' : 'bg-charcoal border border-smoke text-ivory/60'}`
  const tierColor = (t: string) => t === '$' ? 'text-green-400' : t === '$$' ? 'text-gold' : 'text-red-400'

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => { setTab('recipes'); setQ('') }} className={pill(tab === 'recipes')}>🍽️ The Menu · {RECIPES.length} recipes</button>
        <button onClick={() => { setTab('moves'); setQ('') }} className={pill(tab === 'moves')}>💪🏽 Every Move · {ALL_MOVES.length}</button>
      </div>

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === 'recipes' ? 'Search recipes…' : 'Search moves…'}
        className="w-full px-4 py-3 bg-obsidian border border-smoke rounded-xl text-white text-sm mb-4 focus:outline-none focus:border-gold" />

      {tab === 'recipes' ? (
        <>
          <div className="flex gap-2 mb-3 flex-wrap items-center">
            {MEAL_TABS.map((t) => <button key={t.c} onClick={() => setCat(t.c)} className={pill(cat === t.c)}>{t.l}</button>)}
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
          {recipes.length === 0 && <p className="text-ivory/40 text-sm text-center py-8">No recipes match &ldquo;{q}&rdquo;.</p>}
        </>
      ) : (
        <>
          <div className="flex gap-2 mb-4 flex-wrap">
            {MOVE_GROUPS.map((g) => <button key={g} onClick={() => setGroup(g)} className={pill(group === g)}>{g}</button>)}
          </div>
          <div className="space-y-2">
            {moves.map((m) => (
              <div key={m.name} className="bg-charcoal border border-smoke rounded-xl px-4 py-3">
                <div className="flex justify-between items-baseline gap-2">
                  <span className="text-white font-semibold text-sm">{m.name}</span>
                  <span className="text-ivory/40 text-[10px] uppercase tracking-wider whitespace-nowrap">{m.tag}</span>
                </div>
                {m.cue && <p className="text-ivory/45 text-xs mt-1 leading-relaxed">{m.cue}</p>}
              </div>
            ))}
          </div>
          {moves.length === 0 && <p className="text-ivory/40 text-sm text-center py-8">No moves match &ldquo;{q}&rdquo;.</p>}
        </>
      )}
    </div>
  )
}
