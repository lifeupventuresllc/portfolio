'use client'

import { useState } from 'react'

// Nutrition side of the same dip mechanic as DipCard.tsx. No logging action
// required here on purpose — per the brief, it never asks her to account for
// the gap in detail. The moment she logs anything (via FoodLog below), the
// dip clears naturally on next load. This card is purely the reassurance.
export default function FoodDipCard() {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div className="bg-charcoal bg-gradient-to-br from-gold/10 to-charcoal border border-gold/40 rounded-2xl p-5">
      <p className="text-white font-semibold text-sm mb-1">Today doesn&apos;t have to be perfect 💛</p>
      <p className="text-ivory/60 text-xs mb-4">Let&apos;s not worry about the full plan today — just protein and water, that&apos;s the whole goal.</p>
      <button onClick={() => setDismissed(true)} className="text-gold text-xs font-semibold">Got it — reset tomorrow →</button>
    </div>
  )
}
