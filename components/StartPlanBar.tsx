'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Bottom bar of the feed for someone with NO plan yet (Asa's two-core-screens
// spec, 2026-09-28): it just says "Start your plan" — no mention of workouts.
// One tap builds the same real beginner plan the old first-run card did
// (components/FirstWorkoutStartCard.tsx, app/api/plan/quickstart-workout),
// then goes straight into it. No sign-in anywhere on this path. Without this
// bar a brand-new visitor has no way to get a plan at all.
export default function StartPlanBar() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  async function start() {
    if (busy) return
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
    <div className="px-3 pb-3" style={{ fontFamily: 'var(--font-poppins)' }}>
      <div
        className="w-full flex items-center gap-2.5 rounded-2xl px-3 py-2.5"
        style={{ background: 'rgba(2,31,22,0.92)', border: '1px solid rgba(229,169,60,0.6)', backdropFilter: 'blur(4px)' }}
      >
        <span aria-hidden className="shrink-0 rounded-full grid place-items-center" style={{ width: 24, height: 24, border: '2px solid #7fbf94' }}>
          <span className="block rounded-full" style={{ width: 8, height: 8, background: '#E5A93C', boxShadow: '0 0 6px 2px rgba(229,169,60,0.7)' }} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[8.5px] font-bold uppercase" style={{ color: '#E5A93C', letterSpacing: '0.16em' }}>Your plan</span>
          <span className="block truncate text-white text-[14px]" style={{ fontFamily: 'var(--font-fraunces)', fontStyle: 'italic', fontWeight: 600 }}>
            {error ? "Couldn't start just now. Tap Start to try again." : 'Start your plan'}
          </span>
        </span>
        <button
          type="button"
          onClick={start}
          disabled={busy}
          className="shrink-0 rounded-full px-5 h-[36px] text-[13px] font-bold active:scale-95 transition-transform disabled:opacity-70"
          style={{ background: '#E5A93C', color: '#0A0A0F' }}
        >
          {busy ? 'Building…' : 'Start'}
        </button>
      </div>
    </div>
  )
}
