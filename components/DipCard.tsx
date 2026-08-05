'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ShortMove } from '@/lib/workout-short'

// The literal "shrink the ask + identity language instead of guilt" moment
// from the Denise scenario. Shown ABOVE the normal workout section when a
// dip is detected — never replaces her full plan, just leads with something
// smaller so showing up today never requires a decision.
export default function DipCard({ moves }: { moves: ShortMove[] }) {
  const router = useRouter()
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

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
      <p className="text-white font-semibold text-sm mb-1">You&apos;ve been carrying a lot 💛</p>
      <p className="text-ivory/60 text-xs mb-4">No pressure to bounce back to full speed. Just this today — that still counts.</p>
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
    </div>
  )
}
