'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ShortMove } from '@/lib/workout-short'

// The single, unified surface for the life-pattern engine — replaces the old
// separate DipCard + FoodDipCard, which could both render at once even
// though they were really describing the same underlying rough week. One
// coherent read, one coherent card. A shortened-workout action only shows
// when the caller decides it's relevant (see lib/fos/pattern.ts on the
// server side); otherwise this is pure reassurance, same as the old
// FoodDipCard — never asks her to account for the gap in detail.
export default function LifePatternCard({ title, body, showWorkoutAction, moves }: { title: string; body: string; showWorkoutAction: boolean; moves: ShortMove[] }) {
  const router = useRouter()
  const [done, setDone] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [busy, setBusy] = useState(false)

  if (dismissed) return null

  async function markDone() {
    setBusy(true)
    try {
      await fetch('/api/plan/daily', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workout: true }) })
      setDone(true)
      router.refresh()
    } catch { /* stays not-done, she can try again */ }
    setBusy(false)
  }

  if (done) {
    return (
      <div className="rounded-2xl p-5 text-center" style={{ background: 'rgba(76,175,125,0.1)', border: '1px solid rgba(127,230,179,0.32)' }}>
        <p className="text-white font-semibold text-sm">You showed up on a hard week. That&apos;s what a consistent person does. 💛</p>
      </div>
    )
  }

  // HUD redesign (2026-09-04, Asa's vision, mocked up and approved before
  // any of this was built): moved from mid-scroll on /plan/today to the very
  // top of the page, above the Progress/Today toggle — pushes everything
  // else down instead of competing with the ring for attention. The whole
  // message shows every time (title + body, real fallback moves when
  // offered), not a truncated teaser, with an explicit × always available
  // so dismissing doesn't require reading to the very end first.
  return (
    <div className="relative rounded-2xl p-4 pt-4" style={{ background: 'rgba(76,175,125,0.1)', border: '1px solid rgba(127,230,179,0.32)' }}>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="absolute top-2.5 right-3 text-lg leading-none px-1 text-ivory/40 hover:text-white transition-colors"
      >
        &times;
      </button>
      <p className="text-white text-base pr-5 mb-1.5" style={{ fontFamily: 'var(--font-fraunces)', fontStyle: 'italic', fontWeight: 600 }}>{title}</p>
      <p className="text-ivory/70 text-xs leading-relaxed mb-3.5">{body}</p>
      {showWorkoutAction && (
        <>
          <div className="space-y-1.5 mb-3">
            {moves.map((m, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'rgba(0,0,0,0.28)' }}>
                <span className="text-white text-sm font-semibold">{m.name}</span>
                <span className="text-ivory/45 text-xs">{m.note}</span>
              </div>
            ))}
          </div>
          <button
            onClick={markDone}
            disabled={busy}
            className="w-full py-2.5 font-black text-[11.5px] uppercase tracking-wider rounded-lg disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7fe6b3, #4CAF7D 60%, #2f8a5c)', color: '#021F16' }}
          >
            {busy ? '…' : 'Done — that counts'}
          </button>
        </>
      )}
    </div>
  )
}
