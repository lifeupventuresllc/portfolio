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
      <div className="bg-charcoal border border-gold/40 rounded-2xl p-5 text-center">
        <p className="text-white font-semibold text-sm">You showed up on a hard week. That&apos;s what a consistent person does. 💛</p>
      </div>
    )
  }

  return (
    <div className="bg-charcoal bg-gradient-to-br from-gold/10 to-charcoal border border-gold/40 rounded-2xl p-5">
      <p className="text-white font-semibold text-sm mb-1">{title}</p>
      <p className="text-ivory/60 text-xs mb-4">{body}</p>
      {showWorkoutAction ? (
        <>
          <div className="space-y-2 mb-4">
            {moves.map((m, i) => (
              <div key={i} className="flex items-center justify-between bg-obsidian/40 rounded-xl px-3 py-2">
                <span className="text-white text-sm">{m.name}</span>
                <span className="text-ivory/40 text-xs">{m.note}</span>
              </div>
            ))}
          </div>
          <button onClick={markDone} disabled={busy} className="w-full bg-gold text-obsidian py-3 font-bold text-xs uppercase tracking-wider rounded-xl disabled:opacity-50">
            {busy ? '…' : 'Done — that counts'}
          </button>
        </>
      ) : (
        <button onClick={() => setDismissed(true)} className="text-gold text-xs font-semibold">Got it — reset tomorrow →</button>
      )}
    </div>
  )
}
