'use client'

import { useState } from 'react'

// Real gap found live, 2026-09-21 (new-visitor test): a stranger's first
// workout is a placeholder plan; this is the ONE tap that makes tomorrow's
// theirs. A small strip on a rest step — never a takeover, and WorkoutPlayer
// only renders it once the easy/difficult question is out of the way.
const OPTIONS = ['Lose fat', 'Build & tone', 'Gain muscle'] as const

export default function QuickstartGoalAsk({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  async function pick(goal: string) {
    if (saving) return
    setSaving(true); setError(false)
    try {
      const res = await fetch('/api/plan/quickstart-goal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal }),
      })
      if (!res.ok) throw new Error('save failed')
      onDone()
    } catch {
      setError(true); setSaving(false)
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-4">
      <p className="text-gold text-xs font-semibold tracking-[0.15em] uppercase">Quick one while you rest</p>
      <p className="text-white text-base font-bold mt-1">What&apos;s your main goal?</p>
      <p className="text-ivory/60 text-xs mt-0.5 mb-3">One tap makes tomorrow&apos;s workout yours.</p>
      <div className="grid grid-cols-1 gap-2">
        {OPTIONS.map((o) => (
          <button key={o} onClick={() => pick(o)} disabled={saving}
            className="w-full py-3.5 rounded-xl bg-charcoal border border-gold/40 text-white font-bold text-sm active:scale-95 transition-transform disabled:opacity-50">
            {o}
          </button>
        ))}
      </div>
      {error && <p className="text-ivory/60 text-xs mt-2">Couldn&apos;t save that just now — no worries, keep going.</p>}
      <button onClick={onSkip} className="block mx-auto mt-3 text-ivory/40 text-xs underline underline-offset-4">Skip for now</button>
    </div>
  )
}
