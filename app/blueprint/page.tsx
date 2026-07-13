'use client'

import { useState } from 'react'

const ACTIVITY = [
  { value: 'sedentary', label: 'Sedentary — desk job, minimal movement' },
  { value: 'light', label: 'Lightly active — some walking / errands' },
  { value: 'moderate', label: 'Moderately active — on your feet part of the day' },
  { value: 'active', label: 'Active — on your feet most of the day' },
  { value: 'very_active', label: 'Very active — physical job / athlete' },
]
const WORKOUT_LENGTH = [
  { value: '30_cardio', label: '~30 min — light cardio only' },
  { value: '45_strength', label: '~45 min — strength only' },
  { value: '45_60_both', label: '45–60 min — strength + cardio' },
  { value: '60_both', label: '~60 min — strength + cardio' },
  { value: '90_intense', label: '~90 min — intense training' },
]

type Preview = { workoutEat: number; restEat: number; protein_g: number; splitLabel: string }

function downloadPDF(base64: string, filename: string) {
  const bin = atob(base64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  const url = URL.createObjectURL(new Blob([arr], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function BlueprintPage() {
  const [form, setForm] = useState({
    goal: 'lose', name: '', email: '', phone: '', age: '', sex: 'female',
    feet: '', inches: '', weight_lbs: '', goal_weight_lbs: '',
    activity: 'moderate', workout_days_per_week: '4', workout_length: '45_60_both', cardio: 'no',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ preview: Preview; base64: string; filename: string } | null>(null)

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const input = 'w-full px-4 py-3 bg-obsidian border border-smoke rounded-2xl text-white text-sm placeholder-ivory/30 focus:outline-none focus:border-gold transition-colors'
  const goalWord = form.goal === 'gain' ? 'gain' : form.goal === 'maintain' ? 'maintain' : 'lose'

  async function submit() {
    setError('')
    const height_in = (Number(form.feet) || 0) * 12 + (Number(form.inches) || 0)
    if (!form.email || !form.age || !height_in || !form.weight_lbs) {
      setError('Please fill out all fields so I can build your blueprint.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/blueprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, email: form.email, phone: form.phone, age: form.age, sex: form.sex,
          height_in, weight_lbs: form.weight_lbs, goal_weight_lbs: form.goal_weight_lbs,
          goal: form.goal, activity: form.activity,
          workout_days_per_week: form.workout_days_per_week, workout_length: form.workout_length,
          cardio: form.cardio === 'yes',
        }),
      })
      const data = await res.json()
      if (data.success) {
        downloadPDF(data.pdfBase64, data.filename)
        setDone({ preview: data.preview, base64: data.pdfBase64, filename: data.filename })
      } else {
        setError(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-obsidian">
      <section className="relative pt-32 pb-10 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(201,168,76,0.08),transparent_70%)]" />
        <div className="max-w-2xl mx-auto text-center relative">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-4">Free Calorie Blueprint</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">Get Your Blueprint</h1>
          <p className="text-ivory/60 max-w-xl mx-auto leading-relaxed">
            Answer a few questions and I&apos;ll build your personalized 7-page Calorie Blueprint —
            your exact numbers for gym days and rest days, macros, and your game plan.
            It downloads instantly and lands in your inbox.
          </p>
        </div>
      </section>

      {!done ? (
        <section className="pb-24 px-4">
          <div className="max-w-lg mx-auto bg-charcoal border border-smoke rounded-3xl p-6 sm:p-8 space-y-4">
            {/* Goal */}
            <div>
              <label className="text-ivory/50 text-xs uppercase tracking-wider mb-2 block">Your goal</label>
              <div className="grid grid-cols-3 gap-2">
                {[{ v: 'lose', l: 'Lose Fat' }, { v: 'gain', l: 'Build Muscle' }, { v: 'maintain', l: 'Maintain' }].map((g) => (
                  <button key={g.v} onClick={() => set('goal', g.v)}
                    className={`py-3 rounded-xl text-xs font-semibold transition-colors ${form.goal === g.v ? 'bg-gold text-obsidian' : 'bg-obsidian border border-smoke text-ivory/60'}`}>
                    {g.l}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-ivory/50 text-xs uppercase tracking-wider mb-2 block">Age</label>
                <input type="number" value={form.age} onChange={(e) => set('age', e.target.value)} placeholder="28" className={input} />
              </div>
              <div>
                <label className="text-ivory/50 text-xs uppercase tracking-wider mb-2 block">Sex</label>
                <select value={form.sex} onChange={(e) => set('sex', e.target.value)} className={input}>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-ivory/50 text-xs uppercase tracking-wider mb-2 block">Feet</label>
                <input type="number" value={form.feet} onChange={(e) => set('feet', e.target.value)} placeholder="5" className={input} />
              </div>
              <div>
                <label className="text-ivory/50 text-xs uppercase tracking-wider mb-2 block">Inches</label>
                <input type="number" value={form.inches} onChange={(e) => set('inches', e.target.value)} placeholder="6" className={input} />
              </div>
              <div>
                <label className="text-ivory/50 text-xs uppercase tracking-wider mb-2 block">Weight</label>
                <input type="number" value={form.weight_lbs} onChange={(e) => set('weight_lbs', e.target.value)} placeholder="150" className={input} />
              </div>
              <div>
                <label className="text-ivory/50 text-xs uppercase tracking-wider mb-2 block">Goal wt</label>
                <input type="number" value={form.goal_weight_lbs} onChange={(e) => set('goal_weight_lbs', e.target.value)} placeholder="140" className={input} />
              </div>
            </div>

            <div>
              <label className="text-ivory/50 text-xs uppercase tracking-wider mb-2 block">Activity outside the gym</label>
              <select value={form.activity} onChange={(e) => set('activity', e.target.value)} className={input}>
                {ACTIVITY.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-ivory/50 text-xs uppercase tracking-wider mb-2 block">Workout days / week</label>
                <select value={form.workout_days_per_week} onChange={(e) => set('workout_days_per_week', e.target.value)} className={input}>
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n} days</option>)}
                </select>
              </div>
              <div>
                <label className="text-ivory/50 text-xs uppercase tracking-wider mb-2 block">Cardio?</label>
                <select value={form.cardio} onChange={(e) => set('cardio', e.target.value)} className={input}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-ivory/50 text-xs uppercase tracking-wider mb-2 block">Average workout length</label>
              <select value={form.workout_length} onChange={(e) => set('workout_length', e.target.value)} className={input}>
                {WORKOUT_LENGTH.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
              </select>
            </div>

            <div className="border-t border-smoke pt-4 space-y-3">
              <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Your first name" className={input} />
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="Your email (your blueprint lands here too)" className={input} />
              <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Phone (so Coach Asa can follow up)" className={input} />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button onClick={submit} disabled={loading}
              className="w-full bg-gold text-obsidian px-8 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)] disabled:opacity-40 disabled:cursor-not-allowed">
              {loading ? 'Building your blueprint...' : 'Get My Blueprint (PDF)'}
            </button>
            <p className="text-ivory/30 text-xs text-center">Free. Downloads instantly + emailed to you.</p>
          </div>
        </section>
      ) : (
        <section className="pb-24 px-4">
          <div className="max-w-lg mx-auto">
            <div className="bg-charcoal border-2 border-gold/40 rounded-3xl p-8 text-center">
              <p className="text-green-400 text-sm font-semibold mb-1">✓ Your blueprint downloaded</p>
              <p className="text-ivory/50 text-xs mb-1">📩 I also emailed a copy to {form.email}</p>
              <p className="text-ivory/40 text-xs mb-6">Don&apos;t see it in a couple minutes? Check your <span className="text-ivory/60">spam / promotions</span> folder (and add asaluke.io to your contacts).</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-obsidian border border-gold/30 rounded-2xl py-4">
                  <p className="text-3xl font-bold text-gold">{done.preview.workoutEat.toLocaleString()}</p>
                  <p className="text-ivory/40 text-xs uppercase tracking-wider mt-1">Workout day</p>
                </div>
                <div className="bg-obsidian border border-gold/30 rounded-2xl py-4">
                  <p className="text-3xl font-bold text-gold">{done.preview.restEat.toLocaleString()}</p>
                  <p className="text-ivory/40 text-xs uppercase tracking-wider mt-1">Rest day</p>
                </div>
              </div>
              <p className="text-ivory/50 text-sm mb-4">Protein target: <span className="text-white font-semibold">{done.preview.protein_g}g/day</span> · Split {done.preview.splitLabel}</p>
              <button onClick={() => downloadPDF(done.base64, done.filename)}
                className="text-gold text-sm font-semibold underline underline-offset-4 hover:text-gold/80">
                Download my blueprint again
              </button>
            </div>

            <div className="bg-gradient-to-br from-[#1a1608] to-charcoal border border-gold/30 rounded-3xl p-8 mt-6 text-center">
              <h3 className="text-white text-xl font-bold mb-2">Knowing your numbers is step one.</h3>
              <p className="text-ivory/60 text-sm mb-6 leading-relaxed">
                Actually hitting them — with the meals built for you, workouts, and me checking in every week —
                is where the change happens. That&apos;s my Snatched Without Starving challenge.
              </p>
              <a href="/challenge"
                className="inline-block bg-gold text-obsidian px-10 py-4 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all duration-500 hover:scale-105 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)]">
                Get Snatched Without Starving →
              </a>
            </div>
            <p className="text-center text-ivory/40 text-xs mt-4">Want to {goalWord} for real? Let&apos;s do it together.</p>
          </div>
        </section>
      )}

    </div>
  )
}
