'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Real gap found live, 2026-09-21 (new-visitor test, item 3b): a stranger with
// no plan had no real first step on Home — the old Next Step was a generic
// water instruction and the only call to action opened a Google sign-in before
// any question. This is the one big Start (Asa's approved "Option B"): one tap
// builds the same real beginner full-body plan QuickstartWorkout.tsx builds,
// then goes straight to it. No sign-in anywhere on this path.
export default function FirstWorkoutStartCard() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  async function start() {
    setBusy(true)
    setError(false)
    try {
      const res = await fetch('/api/plan/quickstart-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: 'home' }),
      })
      if (!res.ok) throw new Error('failed')
      router.push('/plan/workout')
      router.refresh()
    } catch {
      // Never a dead button: re-enable so she can just tap again.
      setError(true)
      setBusy(false)
    }
  }

  return (
    <div className="mb-2.5 rounded-[22px] p-4" style={{ background: 'rgba(6,35,26,0.9)', border: '1.5px solid #E5A93C', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', fontFamily: 'var(--font-poppins)' }}>
      <p className="text-[10px] font-bold uppercase" style={{ color: '#E5A93C', letterSpacing: '0.18em' }}>Your first step</p>
      <p className="text-white leading-snug mt-1.5 mb-3" style={{ fontFamily: 'var(--font-fraunces)', fontStyle: 'italic', fontWeight: 600, fontSize: 19 }}>
        Your first workout is ready. 30 min, no equipment.
      </p>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="w-full rounded-2xl font-bold text-xl active:scale-[0.98] transition-transform disabled:opacity-70"
        style={{ minHeight: 56, background: '#E5A93C', color: '#0A0A0F', fontFamily: 'var(--font-poppins)' }}
      >
        {busy ? 'Building your workout…' : 'Start'}
      </button>
      {error && <p className="text-[#F3A6A6] text-xs mt-2" role="alert">Couldn&apos;t build that just now — tap Start to try again.</p>}
    </div>
  )
}
