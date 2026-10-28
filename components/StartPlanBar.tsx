'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { hapticTap } from '@/lib/haptics'

// Bottom bar of the feed for someone with NO plan yet (Asa's two-core-screens
// spec, 2026-09-28): it just says "Start your plan" — no mention of workouts.
// One tap opens the intake. No sign-in anywhere on this path. Without this
// bar a brand-new visitor has no way to get a plan at all.
export default function StartPlanBar() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  // 2026-10-28 (Asa: "start plan takes you to a workout instead of the
  // intake"): every "start your plan" goes to the intake now. The old
  // one-tap quickstart workout skipped her real answers.
  function start() {
    if (busy) return
    setBusy(true)
    setError(false)
    router.push('/plan/intake')
  }

  // 2026-10-26 (Asa's screenshot of this bar): same new look as the feed's
  // WinBar — no ring, mono label, Barlow italic line, one gold mono pill.
  const MONO = "var(--font-jbmono), 'JetBrains Mono', monospace"
  return (
    <div className="px-3 pb-3">
      <div
        className="w-full flex items-center gap-3 rounded-[20px] pl-4 pr-2 py-2"
        style={{ background: 'rgba(2,31,22,0.92)', border: '1px solid rgba(237,231,218,.14)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', boxShadow: '0 8px 24px rgba(0,0,0,.4)' }}
      >
        <span className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.14em', color: '#E5A93C' }}>YOUR PLAN</span>
          <span className="block truncate" style={{ fontFamily: "var(--font-barlow), 'Barlow Condensed', sans-serif", fontStyle: 'italic', fontWeight: 800, fontSize: 20, lineHeight: 1.05, textTransform: 'uppercase', color: '#EDE7DA' }}>
            {error ? "Couldn't start. Tap again." : 'Start your plan'}
          </span>
        </span>
        <button
          type="button"
          onClick={() => { hapticTap(); start() }}
          disabled={busy}
          className="nf-press shrink-0 h-10 px-5 rounded-full disabled:opacity-70"
          style={{ background: '#E5A93C', color: '#021F16', fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.1em' }}
        >
          {busy ? 'OPENING…' : 'START'}
        </button>
      </div>
    </div>
  )
}
