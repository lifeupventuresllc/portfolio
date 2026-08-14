'use client'

import { useState } from 'react'

const INJURIES = [
  { v: 'knee', l: 'Knee' }, { v: 'lower_back', l: 'Lower back' }, { v: 'shoulder', l: 'Shoulder' },
  { v: 'wrist', l: 'Wrist' }, { v: 'elbow', l: 'Elbow' }, { v: 'hip', l: 'Hip' }, { v: 'ankle', l: 'Ankle' },
]
const MUSCLES = [
  { v: 'glutes', l: 'Glutes' }, { v: 'hamstrings', l: 'Hamstrings' }, { v: 'quads', l: 'Quads' },
  { v: 'back', l: 'Back' }, { v: 'shoulders', l: 'Shoulders' }, { v: 'chest', l: 'Chest' },
  { v: 'biceps', l: 'Biceps' }, { v: 'triceps', l: 'Triceps' }, { v: 'calves', l: 'Calves' },
]

function downloadPDF(base64: string, filename: string) {
  const bin = atob(base64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  const url = URL.createObjectURL(new Blob([arr], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

export default function CoachWorkoutTool() {
  const [f, setF] = useState({ name: '', track: 'gym', level: '1', goal: 'lose', daysPerWeek: '3', weekNumber: '1', weightLb: '', heightIn: '', age: '' })
  const [injuries, setInjuries] = useState<string[]>([])
  const [targets, setTargets] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }))
  const toggle = (arr: string[], setArr: (a: string[]) => void, v: string) =>
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

  const input = 'w-full px-4 py-3 bg-obsidian border border-smoke rounded-xl text-white text-sm focus:outline-none focus:border-gold transition-colors'
  const chip = (active: boolean) => `px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${active ? 'bg-gold text-obsidian' : 'bg-obsidian border border-smoke text-ivory/60'}`

  async function generate() {
    setError('')
    if (!f.name) { setError('Enter a client name.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/workout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, injuries, targets }),
      })
      const data = await res.json()
      if (data.success) downloadPDF(data.pdfBase64, data.filename)
      else setError(data.error || 'Something went wrong.')
    } catch { setError('Something went wrong.') }
    setLoading(false)
  }

  return (
    <div className="min-h-[100dvh] bg-obsidian px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-2">Coach Tool</p>
        <h1 className="text-3xl font-bold text-white mb-2">Workout Generator</h1>
        <p className="text-ivory/50 text-sm mb-8">Fill it out, hit generate, and the client&apos;s branded program PDF downloads instantly.</p>

        <div className="bg-charcoal border border-smoke rounded-3xl p-6 sm:p-8 space-y-5">
          <div>
            <label className="text-ivory/50 text-xs uppercase tracking-wider mb-2 block">Client name</label>
            <input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Ava" className={input} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-ivory/50 text-xs uppercase tracking-wider mb-2 block">Track</label>
              <div className="grid grid-cols-2 gap-2">
                {[{ v: 'gym', l: 'Gym' }, { v: 'home', l: 'Home' }].map((t) => (
                  <button key={t.v} onClick={() => set('track', t.v)} className={chip(f.track === t.v)}>{t.l}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-ivory/50 text-xs uppercase tracking-wider mb-2 block">Goal</label>
              <select value={f.goal} onChange={(e) => set('goal', e.target.value)} className={input}>
                <option value="lose">Lose fat</option><option value="gain">Build muscle</option><option value="maintain">Maintain</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-ivory/50 text-xs uppercase tracking-wider mb-2 block">Level</label>
              <select value={f.level} onChange={(e) => set('level', e.target.value)} className={input}>
                <option value="1">Beginner</option><option value="2">Intermediate</option><option value="3">Advanced</option>
              </select>
            </div>
            <div>
              <label className="text-ivory/50 text-xs uppercase tracking-wider mb-2 block">Days/wk</label>
              <input type="number" value={f.daysPerWeek} onChange={(e) => set('daysPerWeek', e.target.value)} className={input} />
            </div>
            <div>
              <label className="text-ivory/50 text-xs uppercase tracking-wider mb-2 block">Week #</label>
              <input type="number" value={f.weekNumber} onChange={(e) => set('weekNumber', e.target.value)} className={input} />
            </div>
          </div>

          <div>
            <label className="text-ivory/50 text-xs uppercase tracking-wider mb-2 block">Client stats (optional — powers the at-home calorie-burn estimate)</label>
            <div className="grid grid-cols-3 gap-3">
              <input type="number" value={f.weightLb} onChange={(e) => set('weightLb', e.target.value)} placeholder="Weight (lb)" className={input} />
              <input type="number" value={f.heightIn} onChange={(e) => set('heightIn', e.target.value)} placeholder="Height (in)" className={input} />
              <input type="number" value={f.age} onChange={(e) => set('age', e.target.value)} placeholder="Age" className={input} />
            </div>
          </div>

          <div>
            <label className="text-ivory/50 text-xs uppercase tracking-wider mb-2 block">Previous injuries (avoid)</label>
            <div className="flex flex-wrap gap-2">
              {INJURIES.map((i) => (
                <button key={i.v} onClick={() => toggle(injuries, setInjuries, i.v)} className={chip(injuries.includes(i.v))}>{i.l}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-ivory/50 text-xs uppercase tracking-wider mb-2 block">Target areas (emphasize)</label>
            <div className="flex flex-wrap gap-2">
              {MUSCLES.map((m) => (
                <button key={m.v} onClick={() => toggle(targets, setTargets, m.v)} className={chip(targets.includes(m.v))}>{m.l}</button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button onClick={generate} disabled={loading}
            className="w-full bg-gold text-obsidian px-8 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed">
            {loading ? 'Generating...' : 'Generate Workout PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}
