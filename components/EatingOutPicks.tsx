'use client'

import { useState } from 'react'

// This is how we actually see what she's been eating out, without needing any
// delivery-app API (DoorDash/Uber Eats don't expose real order history to outside
// apps at any tier — confirmed 2026-08-07). She confirms it here instead, once,
// with exact known macros already filled in — more reliable than a scraped order
// history anyway (it's specifically what she ate, not a shared/family order), and
// less work than her current alternative of re-searching/estimating it herself
// later in food search. Feeds the same challenge_food_log the dip-detection engine
// already reads.
export type Pick = {
  restaurant: string; order: string; cal: number; protein: number; carbs: number; fat: number
  priceTier: string; doordashUrl: string; meal: 'breakfast' | 'lunch' | 'dinner' | 'snack'
}

export default function EatingOutPicks({ picks, linkedActionLogId }: { picks: Pick[]; linkedActionLogId?: string }) {
  const [logged, setLogged] = useState<Record<number, boolean>>({})
  const [logging, setLogging] = useState<number | null>(null)

  async function logIt(i: number, p: Pick) {
    setLogging(i)
    try {
      await fetch('/api/plan/food-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: p.order, brand: p.restaurant, meal: p.meal, servings: 1,
          calories: p.cal, protein_g: p.protein, carbs_g: p.carbs, fats_g: p.fat,
          source: 'escape_plan',
        }),
      })
      setLogged((l) => ({ ...l, [i]: true }))
      // Real bug fixed 2026-08-27: this button and the Next Action circle's
      // own Done button used to log independently — confirming a pick here
      // AND later tapping Done on the circle for the same suggestion
      // double-counted one meal. Resolving the circle's action here (with
      // skipFoodLog, since the real order is already logged above — it's
      // done, not a re-estimate of what circle originally suggested) closes
      // that gap. A second pick logged after the first already resolves it
      // just gets `already_resolved` back, handled silently — one log wins.
      if (linkedActionLogId) {
        await fetch('/api/plan/next-action', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logId: linkedActionLogId, action: 'done', skipFoodLog: true }),
        }).catch(() => {})
      }
    } catch { /* she can still log it manually via food search if this fails */ }
    setLogging(null)
  }

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {picks.map((p, i) => (
        <div key={i} className="bg-charcoal bg-gradient-to-br from-gold/10 to-charcoal border border-gold/30 rounded-2xl p-5 flex flex-col">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-white font-bold text-sm">{p.restaurant}</p>
            <span className="text-ivory/40 text-xs shrink-0">{p.priceTier}</span>
          </div>
          <p className="text-ivory/70 text-sm mb-3 flex-1">{p.order}</p>
          <p className="text-gold text-xs font-semibold mb-3">{p.cal} cal · {p.protein}g protein</p>
          <div className="flex gap-2">
            <a href={p.doordashUrl} target="_blank" rel="noopener noreferrer"
              className="flex-1 text-center bg-gold text-obsidian px-3 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform">
              Find it
            </a>
            <button
              type="button" onClick={() => logIt(i, p)} disabled={logging === i || !!logged[i]}
              className={`flex-1 text-center px-3 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform ${logged[i] ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-charcoal border border-gold/40 text-gold hover:bg-gold/10 disabled:opacity-40'}`}>
              {logged[i] ? '✓ Logged' : logging === i ? '…' : 'I ordered this'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
