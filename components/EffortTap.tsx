'use client'

import { useState } from 'react'
import { hapticTap } from '@/lib/haptics'

// "How did that feel?" — one tap at the end of every workout (2026-11-17,
// Asa's spec: Too easy / Just right / Too hard, fed into the next session).
// Saved on today's row as effort 1 / 2 / 3; lib/gentle-start.ts reads it:
// Too hard → the next workout is gentler and one weight lighter, Too easy
// twice → the gentle start ends early. Never blocks her exit. Waits for the
// workout save first so the two never race to create today's row.
const OPTIONS = [
  { value: 1, label: 'Too easy', then: 'Got it. We’ll step it up.' },
  { value: 2, label: 'Just right', then: 'Perfect. Same plan next time.' },
  { value: 3, label: 'Too hard', then: 'Got it. Next one is lighter.' },
] as const

export default function EffortTap({ after }: { after?: Promise<unknown> }) {
  const [picked, setPicked] = useState<number | null>(null)

  async function tap(value: number) {
    if (picked != null) return
    hapticTap()
    setPicked(value)
    try {
      await after
      await fetch('/api/plan/daily', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workout: true, effort: value }),
      })
    } catch { /* best-effort — she already got her completion screen either way */ }
  }

  const chosen = OPTIONS.find((o) => o.value === picked)
  return (
    <div className="w-full">
      <p className="text-[17px] font-bold mb-3">How did that feel?</p>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => tap(o.value)}
            disabled={picked != null}
            aria-pressed={picked === o.value}
            className="nf-press h-14 rounded-2xl text-[15px] font-bold transition-all"
            style={{
              border: `2px solid ${picked === o.value ? '#E5A93C' : 'rgba(237,231,218,.22)'}`,
              background: picked === o.value ? 'rgba(229,169,60,.18)' : 'transparent',
              color: '#EDE7DA', opacity: picked != null && picked !== o.value ? 0.4 : 1,
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
      {chosen && <p className="text-[14px] mt-3" style={{ color: 'rgba(237,231,218,.72)' }}>{chosen.then}</p>}
    </div>
  )
}
