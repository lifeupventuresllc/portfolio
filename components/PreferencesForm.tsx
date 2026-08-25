'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Current = {
  name: string; age: number; sex: string; height_in: number; weight_lbs: number
  target_lbs: number | null; activity_level: string; experience_level: string
  training_location: string; days_per_week: number; weekly_food_budget: number | null
  food_preferences: string; dislikes_allergies: string; injuries: string[]
  postpartum: boolean; other_info: string; cook_days_per_week: number
  focus_area: string; goals: string[]; training_styles: string[]
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
  const router = useRouter()
  const [goals, setGoals] = useState<string[]>(current.goals)
  const [focusArea, setFocusArea] = useState(current.focus_area)
  const [trainingStyles, setTrainingStyles] = useState<string[]>(current.training_styles)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const toggleGoal = (v: string) => setGoals((a) => (a.includes(v) ? a.filter((x) => x !== v) : [...a, v]))
  const toggleStyle = (v: string) => setTrainingStyles((a) => (v === 'none' ? ['none'] : (a.includes(v) ? a.filter((x) => x !== v) : [...a.filter((x) => x !== 'none'), v])))

  async function save() {
    if (!goals.length) { setError('Pick at least one goal.'); return }
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
          goals, goal: goals[0], focus_area: focusArea,
          training_styles: trainingStyles, training_style: trainingStyles[0] || 'none',
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to save')
      setSaved(true)
      router.refresh()
    } catch {
      setError("Couldn't save just now — try again in a sec.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-obsidian px-4 py-8">
      <div className="max-w-lg mx-auto">
        <a href="/plan" className="inline-flex items-center gap-1.5 bg-charcoal border border-gold/40 text-gold text-sm font-semibold px-4 py-2.5 rounded-full hover:border-gold active:scale-95 transition-all mb-6">← Back to my plan</a>
        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-1">Update your plan</p>
        <h1 className="text-white text-2xl font-bold mb-2">What do you want to work on?</h1>
        <p className="text-ivory/50 text-sm mb-8">Just your goals and workout style — everything else stays as it is. Saving rebuilds your plan right away.</p>

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
            <button key={o.v} onClick={() => setFocusArea(o.v)} className={opt(focusArea === o.v)}>
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

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        {saved && <p className="text-emerald-400 text-sm mb-4 font-semibold">Saved — your plan&apos;s updated. Check today&apos;s workout to see it.</p>}
        <button onClick={save} disabled={saving} className="w-full bg-gold text-obsidian px-6 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl disabled:opacity-50 active:scale-95 transition-transform">
          {saving ? 'Updating your plan…' : 'Save & update my plan'}
        </button>
      </div>
    </div>
  )
}
