'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Targets = { calories: number; protein_g: number; carbs_g: number; fats_g: number; bmr: number; tdee: number }

const INJURIES = [
  { v: 'knee', l: 'Knee' }, { v: 'lower_back', l: 'Lower back' }, { v: 'shoulder', l: 'Shoulder' },
  { v: 'wrist', l: 'Wrist' }, { v: 'elbow', l: 'Elbow' }, { v: 'hip', l: 'Hip' }, { v: 'ankle', l: 'Ankle' },
]

export default function ClientIntake() {
  const router = useRouter()
  const [f, setF] = useState({
    name: '', age: '', sex: 'female', heightFt: '5', heightIn: '4', weight_lbs: '',
    goal: 'lose', target_lbs: '', activity_level: 'moderate', experience_level: 'beginner',
    training_location: 'gym', days_per_week: '3', cook_days_per_week: '2',
    weekly_food_budget: '', food_preferences: '', dislikes_allergies: '', injuries_limitations: '',
  })
  const [injuries, setInjuries] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [targets, setTargets] = useState<Targets | null>(null)

  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }))
  const toggleInjury = (v: string) => setInjuries((a) => (a.includes(v) ? a.filter((x) => x !== v) : [...a, v]))
  const input = 'w-full px-4 py-3 bg-obsidian border border-smoke rounded-xl text-white text-sm focus:outline-none focus:border-gold transition-colors'
  const label = 'text-ivory/50 text-xs uppercase tracking-wider mb-2 block'
  const chip = (active: boolean) => `px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${active ? 'bg-gold text-obsidian' : 'bg-obsidian border border-smoke text-ivory/60'}`

  async function submit() {
    setError('')
    if (!f.age || !f.weight_lbs) { setError('Add your age and weight so we can build your plan.'); return }
    setLoading(true)
    try {
      const height_in = Number(f.heightFt) * 12 + Number(f.heightIn)
      const res = await fetch('/api/challenge/intake', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: f.name, age: Number(f.age), sex: f.sex, height_in,
          weight_lbs: Number(f.weight_lbs), goal: f.goal, target_lbs: Number(f.target_lbs) || null,
          activity_level: f.activity_level, experience_level: f.experience_level,
          training_location: f.training_location, days_per_week: Number(f.days_per_week),
          cook_days_per_week: Number(f.cook_days_per_week), weekly_food_budget: Number(f.weekly_food_budget) || null,
          food_preferences: f.food_preferences, dislikes_allergies: f.dislikes_allergies,
          injuries, injuries_limitations: f.injuries_limitations,
        }),
      })
      const data = await res.json()
      if (data.success) setTargets(data.targets)
      else setError(data.error || 'Something went wrong.')
    } catch { setError('Something went wrong. Please try again.') }
    setLoading(false)
  }

  if (targets) {
    return (
      <div className="min-h-screen bg-obsidian px-4 py-16">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-3">You&apos;re all set</p>
          <h1 className="text-3xl font-bold text-white mb-3">Your plan is ready 🎉</h1>
          <p className="text-ivory/60 text-sm mb-8">We built your numbers, generated your workout, and set up your meal budget. Here&apos;s your daily target:</p>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {[
              { l: 'Daily calories', v: targets.calories.toLocaleString(), c: 'text-gold' },
              { l: 'Protein', v: `${targets.protein_g}g`, c: 'text-green-400' },
              { l: 'Carbs', v: `${targets.carbs_g}g`, c: 'text-white' },
              { l: 'Fats', v: `${targets.fats_g}g`, c: 'text-white' },
            ].map((t) => (
              <div key={t.l} className="bg-charcoal border border-smoke rounded-2xl p-5">
                <p className="text-ivory/40 text-xs uppercase tracking-wider mb-1">{t.l}</p>
                <p className={`text-2xl font-bold ${t.c}`}>{t.v}</p>
              </div>
            ))}
          </div>
          <button onClick={() => router.push('/plan')} className="w-full bg-gold text-obsidian px-8 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-[1.02]">
            Go to my plan
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-obsidian px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-2">Your Intake</p>
        <h1 className="text-3xl font-bold text-white mb-2">Let&apos;s build your plan</h1>
        <p className="text-ivory/50 text-sm mb-8">Answer these once and we&apos;ll generate your custom workout and calorie-matched meal plan. You can update it anytime.</p>

        <div className="bg-charcoal border border-smoke rounded-3xl p-6 sm:p-8 space-y-5">
          <div>
            <label className={label}>First name</label>
            <input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Ava" className={input} />
          </div>

          {/* Age / Sex / Weight */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={label}>Age</label>
              <input type="number" value={f.age} onChange={(e) => set('age', e.target.value)} className={input} />
            </div>
            <div>
              <label className={label}>Sex</label>
              <select value={f.sex} onChange={(e) => set('sex', e.target.value)} className={input}>
                <option value="female">Female</option><option value="male">Male</option>
              </select>
            </div>
            <div>
              <label className={label}>Weight (lbs)</label>
              <input type="number" value={f.weight_lbs} onChange={(e) => set('weight_lbs', e.target.value)} className={input} />
            </div>
          </div>

          {/* Height */}
          <div>
            <label className={label}>Height</label>
            <div className="grid grid-cols-2 gap-3">
              <select value={f.heightFt} onChange={(e) => set('heightFt', e.target.value)} className={input}>
                {[4, 5, 6].map((n) => <option key={n} value={n}>{n} ft</option>)}
              </select>
              <select value={f.heightIn} onChange={(e) => set('heightIn', e.target.value)} className={input}>
                {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{i} in</option>)}
              </select>
            </div>
          </div>

          {/* Goal */}
          <div>
            <label className={label}>Goal</label>
            <div className="grid grid-cols-3 gap-2">
              {[{ v: 'lose', l: 'Lose fat' }, { v: 'gain', l: 'Build / tone' }, { v: 'maintain', l: 'Maintain' }].map((g) => (
                <button key={g.v} onClick={() => set('goal', g.v)} className={chip(f.goal === g.v)}>{g.l}</button>
              ))}
            </div>
          </div>
          <div>
            <label className={label}>How many lbs is your goal? (optional)</label>
            <input type="number" value={f.target_lbs} onChange={(e) => set('target_lbs', e.target.value)} placeholder="e.g. 15" className={input} />
          </div>

          {/* Activity */}
          <div>
            <label className={label}>Daily activity level</label>
            <select value={f.activity_level} onChange={(e) => set('activity_level', e.target.value)} className={input}>
              <option value="sedentary">Sedentary — desk job, little movement</option>
              <option value="light">Light — some walking</option>
              <option value="moderate">Moderate — on your feet often</option>
              <option value="active">Active — physical job / lots of steps</option>
              <option value="very_active">Very active — very physical days</option>
            </select>
          </div>

          {/* Training */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Experience</label>
              <select value={f.experience_level} onChange={(e) => set('experience_level', e.target.value)} className={input}>
                <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className={label}>Train where?</label>
              <select value={f.training_location} onChange={(e) => set('training_location', e.target.value)} className={input}>
                <option value="gym">Gym</option><option value="home">Home</option><option value="both">Both</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Training days / week</label>
              <input type="number" min="1" max="7" value={f.days_per_week} onChange={(e) => set('days_per_week', e.target.value)} className={input} />
            </div>
            <div>
              <label className={label}>Cook days / week</label>
              <select value={f.cook_days_per_week} onChange={(e) => set('cook_days_per_week', e.target.value)} className={input}>
                <option value="1">1 — cook once</option><option value="2">2 — cook twice</option><option value="3">3 — cook 3x</option>
              </select>
            </div>
          </div>

          {/* Food */}
          <div>
            <label className={label}>Weekly food budget ($, optional)</label>
            <input type="number" value={f.weekly_food_budget} onChange={(e) => set('weekly_food_budget', e.target.value)} placeholder="e.g. 90" className={input} />
          </div>
          <div>
            <label className={label}>Foods you love</label>
            <input value={f.food_preferences} onChange={(e) => set('food_preferences', e.target.value)} placeholder="e.g. chicken, rice bowls, tacos" className={input} />
          </div>
          <div>
            <label className={label}>Dislikes / allergies</label>
            <input value={f.dislikes_allergies} onChange={(e) => set('dislikes_allergies', e.target.value)} placeholder="e.g. no mushrooms, dairy-free" className={input} />
          </div>
          <div>
            <label className={label}>Any injuries? Tap all that apply — we&apos;ll route your workout around them</label>
            <div className="flex flex-wrap gap-2">
              {INJURIES.map((i) => (
                <button key={i.v} onClick={() => toggleInjury(i.v)} className={chip(injuries.includes(i.v))}>{i.l}</button>
              ))}
            </div>
          </div>
          <div>
            <label className={label}>Anything else we should know? (optional)</label>
            <input value={f.injuries_limitations} onChange={(e) => set('injuries_limitations', e.target.value)} placeholder="e.g. recovering from surgery, pregnant, low energy in mornings" className={input} />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button onClick={submit} disabled={loading}
            className="w-full bg-gold text-obsidian px-8 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed">
            {loading ? 'Building your plan...' : 'Build my plan'}
          </button>
        </div>
      </div>
    </div>
  )
}
