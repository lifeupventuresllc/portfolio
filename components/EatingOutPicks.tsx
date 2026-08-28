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

  // Visual hierarchy (2026-08-28, Asa's ask): the circle now tells her "2
  // real options ready" instead of locking into one up front, so THIS is
  // where the actual choice happens — the primary pick reads big and
  // obvious ("Order this"), the second is still fully real and tappable,
  // just visually secondary. Equal-weight side-by-side cards made the
  // "which one do I even pick" decision harder, not easier, on the one
  // screen that's supposed to remove that decision.
  const [primary, secondary] = picks

  return (
    <div className="flex flex-col gap-4">
      {primary && (
        <div className="bg-charcoal bg-gradient-to-br from-gold/10 to-charcoal border border-gold/40 rounded-3xl p-6">
          <p className="text-gold text-[11px] font-bold uppercase tracking-[0.2em] mb-2">Order this</p>
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-white font-bold text-xl">{primary.restaurant}</p>
            <span className="text-ivory/40 text-xs shrink-0 mt-1.5">{primary.priceTier}</span>
          </div>
          <p className="text-ivory/80 text-base mb-4">{primary.order}</p>
          <p className="text-gold text-sm font-semibold mb-4">{primary.cal} cal · {primary.protein}g protein</p>
          <div className="flex gap-2">
            <a href={primary.doordashUrl} target="_blank" rel="noopener noreferrer"
              className="flex-1 text-center bg-gold text-obsidian px-3 py-3 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform">
              Find it
            </a>
            <button
              type="button" onClick={() => logIt(0, primary)} disabled={logging === 0 || !!logged[0]}
              className={`flex-1 text-center px-3 py-3 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform ${logged[0] ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-charcoal border border-gold/40 text-gold hover:bg-gold/10 disabled:opacity-40'}`}>
              {logged[0] ? '✓ Logged' : logging === 0 ? '…' : 'I ordered this'}
            </button>
          </div>
        </div>
      )}

      {secondary && (
        <div>
          <p className="text-ivory/35 text-[10px] font-semibold uppercase tracking-wider mb-2">Or, if you&apos;d rather</p>
          <div className="bg-charcoal border border-smoke rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{secondary.restaurant}</p>
              <p className="text-ivory/55 text-xs truncate">{secondary.order}</p>
              <p className="text-ivory/40 text-[11px] mt-0.5">{secondary.cal} cal · {secondary.protein}g protein</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <a href={secondary.doordashUrl} target="_blank" rel="noopener noreferrer"
                className="text-center bg-white/10 border border-white/20 text-ivory px-2.5 py-2 font-bold text-[10px] uppercase tracking-wider rounded-lg active:scale-95 transition-transform">
                Find it
              </a>
              <button
                type="button" onClick={() => logIt(1, secondary)} disabled={logging === 1 || !!logged[1]}
                className={`text-center px-2.5 py-2 font-bold text-[10px] uppercase tracking-wider rounded-lg active:scale-95 transition-transform ${logged[1] ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-transparent border border-white/20 text-ivory/70 disabled:opacity-40'}`}>
                {logged[1] ? '✓' : logging === 1 ? '…' : 'I ordered this'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
