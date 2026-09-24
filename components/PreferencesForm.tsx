'use client'

import { useState, useRef, useEffect } from 'react'
import { effectiveGoal } from '@/lib/goals'
import { PAYOFF_OPTIONS } from '@/lib/payoff'

type Current = {
  name: string; age: number; sex: string; height_in: number; weight_lbs: number
  target_lbs: number | null; activity_level: string; experience_level: string
  training_location: string; days_per_week: number; weekly_food_budget: number | null
  food_preferences: string; dislikes_allergies: string; injuries: string[]
  postpartum: boolean; other_info: string; cook_days_per_week: number
  focus_area: string; goals: string[]; training_styles: string[]
  // 2026-09-24 — real "what's your why" answer, editable here so changing
  // it never means restarting the full intake (the exact trap Asa caught
  // once already for "change my goal" — see the memory on that fix).
  payoffs: string[]
}

const GOALS = [
  { v: 'lose', l: '🔥 Lose fat', d: 'Lean out, keep your curves' },
  { v: 'gain', l: '💪🏽 Build & tone', d: 'Add shape and strength' },
  { v: 'maintain', l: '⚖️ Maintain', d: 'Hold steady, feel great' },
]
const FOCUS_AREAS = [
  { v: 'core', l: 'Core & waistline' },
  { v: 'legs', l: 'Legs & glutes' },
  { v: 'arms', l: 'Arms & back' },
  { v: 'overall', l: 'All-over' },
]
const STYLES = [
  { v: 'compound', l: '🔗 Full body / compound', d: 'Moves that work multiple muscles each rep' },
  { v: 'split', l: '🎯 Split / one muscle group', d: 'Focused, isolated work per day' },
  { v: 'cardio', l: '🏃🏽 Cardio-first', d: 'Heart rate up, calorie burn' },
  { v: 'none', l: '🤷🏽 No strong preference', d: "I'll trust your programming" },
]

const opt = (active: boolean) =>
  `w-full text-left px-4 py-3 rounded-xl border transition-all ${active ? 'bg-gold/10 border-gold text-white' : 'bg-charcoal border-smoke text-ivory/70 hover:border-gold/40'}`

export default function PreferencesForm({ current }: { current: Current }) {
  const [goals, setGoals] = useState<string[]>(current.goals)
  const [focusArea, setFocusArea] = useState(current.focus_area)
  const [trainingStyles, setTrainingStyles] = useState<string[]>(current.training_styles)
  const [payoffs, setPayoffs] = useState<string[]>(current.payoffs)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Real gap found live, 2026-09-21 (beta feedback item 3, "everything ONE
  // tap"): pick goal + focus + style, THEN find and tap Save = 3-5 taps plus a
  // Save. Now every pick saves itself. Latest picks live in a ref so a burst
  // of taps (multi-select goals/styles) is debounced ~400ms into ONE save of
  // the final selection, and a tap during an in-flight save queues one more
  // save instead of being lost. Same endpoint + payload as the old button.
  const latest = useRef({ goals, focusArea, trainingStyles, payoffs })
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlight = useRef(false)
  const queued = useRef(false)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  function change(next: Partial<typeof latest.current>) {
    latest.current = { ...latest.current, ...next }
    if (next.goals) setGoals(next.goals)
    if (next.focusArea !== undefined) setFocusArea(next.focusArea)
    if (next.trainingStyles) setTrainingStyles(next.trainingStyles)
    if (next.payoffs) setPayoffs(next.payoffs)
    setSaved(false); setError('')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(save, 400)
  }
  const toggleGoal = (v: string) => { const a = latest.current.goals; change({ goals: a.includes(v) ? a.filter((x) => x !== v) : [...a, v] }) }
  const toggleStyle = (v: string) => {
    const a = latest.current.trainingStyles
    change({ trainingStyles: v === 'none' ? ['none'] : (a.includes(v) ? a.filter((x) => x !== v) : [...a.filter((x) => x !== 'none'), v]) })
  }
  const togglePayoff = (v: string) => { const a = latest.current.payoffs; change({ payoffs: a.includes(v) ? a.filter((x) => x !== v) : [...a, v] }) }

  async function save() {
    const { goals, focusArea, trainingStyles, payoffs } = latest.current
    if (!goals.length) { setError('Pick at least one goal.'); return }
    if (inFlight.current) { queued.current = true; return }
    inFlight.current = true
    setSaving(true); setError(''); setSaved(false)
    try {
      const res = await fetch('/api/challenge/intake', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Everything she already answered, unchanged — only goals/focus/
          // training_styles below are what this screen actually lets her edit.
          name: current.name, age: current.age, sex: current.sex, height_in: current.height_in,
          weight_lbs: current.weight_lbs, target_lbs: current.target_lbs,
          activity_level: current.activity_level, experience_level: current.experience_level,
          training_location: current.training_location, days_per_week: current.days_per_week,
          cook_days_per_week: current.cook_days_per_week, weekly_food_budget: current.weekly_food_budget,
          food_preferences: current.food_preferences, dislikes_allergies: current.dislikes_allergies,
          injuries: current.injuries, postpartum: current.postpartum, other_info: current.other_info,
          refining: true,
          goals, goal: effectiveGoal(goals), focus_area: focusArea,
          training_styles: trainingStyles, training_style: trainingStyles[0] || 'none',
          payoffs,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to save')
      setSaved(true)
    } catch {
      // Selection is kept on screen; only the message changes.
      setError("Couldn't save just now — tap again to retry.")
    } finally {
      inFlight.current = false
      setSaving(false)
      if (queued.current) { queued.current = false; save() }
    }
  }

  return (
    <div className="min-h-[100dvh] bg-obsidian px-4 py-8">
      <div className="max-w-lg mx-auto">
        <a href="/plan" className="inline-flex items-center gap-1.5 bg-charcoal border border-gold/40 text-gold text-sm font-semibold px-4 py-2.5 rounded-full hover:border-gold active:scale-95 transition-all mb-6">← Back to my plan</a>
        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-1">Update your plan</p>
        <h1 className="text-white text-2xl font-bold mb-2">What do you want to work on?</h1>
        <p className="text-ivory/50 text-sm mb-8">Just your goals and workout style — everything else stays as it is. Every tap saves and rebuilds your plan right away.</p>

        <p className="text-ivory/40 text-xs font-semibold uppercase tracking-wider mb-2">Goal — pick all that apply</p>
        <div className="space-y-2 mb-6">
          {GOALS.map((o) => (
            <button key={o.v} onClick={() => toggleGoal(o.v)} className={opt(goals.includes(o.v))}>
              <span className="block font-semibold">{o.l}</span>
              <span className="block text-xs opacity-60 mt-0.5">{o.d}</span>
            </button>
          ))}
        </div>

        <p className="text-ivory/40 text-xs font-semibold uppercase tracking-wider mb-2">Focus area</p>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {FOCUS_AREAS.map((o) => (
            <button key={o.v} onClick={() => change({ focusArea: o.v })} className={opt(focusArea === o.v)}>
              <span className="text-sm font-semibold">{o.l}</span>
            </button>
          ))}
        </div>

        <p className="text-ivory/40 text-xs font-semibold uppercase tracking-wider mb-2">Workout style — pick all that apply</p>
        <div className="space-y-2 mb-8">
          {STYLES.map((o) => (
            <button key={o.v} onClick={() => toggleStyle(o.v)} className={opt(trainingStyles.includes(o.v))}>
              <span className="block font-semibold">{o.l}</span>
              <span className="block text-xs opacity-60 mt-0.5">{o.d}</span>
            </button>
          ))}
        </div>

        {/* 2026-09-24 — real edit path for "what's your why," so changing it
            never means restarting the whole intake (the same trap already
            found + fixed once for the goal question). */}
        <p className="text-ivory/40 text-xs font-semibold uppercase tracking-wider mb-2">Your why — pick all that apply</p>
        <div className="space-y-2 mb-8">
          {PAYOFF_OPTIONS.map((o) => (
            <button key={o.v} onClick={() => togglePayoff(o.v)} className={opt(payoffs.includes(o.v))}>
              <span className="block font-semibold">{o.label}</span>
              <span className="block text-xs opacity-60 mt-0.5">{o.desc}</span>
            </button>
          ))}
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        {saving && <p className="text-ivory/50 text-sm mb-4">Saving…</p>}
        {saved && !saving && <p className="text-emerald-400 text-sm mb-4 font-semibold">Saved — your plan&apos;s updated.</p>}
        {/* The old Save button also jumped to today's workout (?focusUpdated=1,
            beta Priority 1, 2026-08-25). Auto-jumping would interrupt multi-picks,
            so that same destination is now one tap away once she's done. */}
        <a href="/plan/today?focusUpdated=1" className="block w-full text-center bg-gold text-obsidian px-6 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl active:scale-95 transition-transform">See today&apos;s workout</a>
      </div>
    </div>
  )
}
