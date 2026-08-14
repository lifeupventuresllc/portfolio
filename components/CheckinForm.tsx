'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import QuickFeedback from '@/components/QuickFeedback'

export default function CheckinForm({ firstName }: { firstName: string }) {
  const router = useRouter()
  const [f, setF] = useState({ weight_lbs: '', waist: '', hips: '', thighs: '', arms: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }))
  const input = 'w-full px-4 py-3 bg-obsidian border border-smoke rounded-xl text-white text-sm focus:outline-none focus:border-gold transition-colors'
  const label = 'text-ivory/50 text-xs uppercase tracking-wider mb-2 block'

  async function submit() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/plan/checkin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f),
      })
      const data = await res.json()
      if (data.success) { setDone(true); router.refresh() }
      else setError(data.error || 'Something went wrong.')
    } catch { setError('Something went wrong. Try again.') }
    setLoading(false)
  }

  if (done) {
    return (
      <div className="bg-charcoal border border-green-500/40 rounded-3xl p-8 text-center">
        <p className="text-3xl mb-3">🙌🏽</p>
        <p className="text-white font-semibold text-lg mb-2">Got it, {firstName}.</p>
        <p className="text-ivory/60 text-sm">I&apos;ve got your check-in. I&apos;ll look it over personally and get back to you with your adjustments and what I want from you next week. Proud of you for showing up.</p>
        <p className="text-gold text-sm font-semibold mt-3">— Coach Asa</p>
        <QuickFeedback category="checkin" context="Weekly check-in" dark />
      </div>
    )
  }

  return (
    <div className="bg-charcoal border border-smoke rounded-3xl p-6 sm:p-8 space-y-5">
      <div>
        <label className={label}>Where&apos;s your weight today? (lbs)</label>
        <input type="number" inputMode="decimal" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={f.weight_lbs} onChange={(e) => set('weight_lbs', e.target.value)} placeholder="e.g. 168" className={input} />
      </div>
      <div>
        <label className={label}>Measurements (inches) — optional, but they tell the real story</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[['waist', 'Waist'], ['hips', 'Hips'], ['thighs', 'Thighs'], ['arms', 'Arms']].map(([k, l]) => (
            <input key={k} type="number" inputMode="decimal" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={f[k as keyof typeof f]} onChange={(e) => set(k, e.target.value)} placeholder={l} className={input} />
          ))}
        </div>
      </div>
      <div>
        <label className={label}>Talk to me — how did the week actually go?</label>
        <textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} rows={4}
          placeholder="Wins, struggles, cravings, energy, workouts you hit or missed — be real with me. This is how I coach you."
          className={`${input} resize-none`} />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button onClick={submit} disabled={loading}
        className="w-full bg-gold text-obsidian px-8 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed">
        {loading ? 'Sending to Asa...' : 'Send my check-in to Asa'}
      </button>
    </div>
  )
}
