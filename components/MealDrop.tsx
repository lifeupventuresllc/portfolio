'use client'

import { useEffect, useRef, useState } from 'react'
import { hapticTap } from '@/lib/haptics'
import type { Drop } from '@/lib/reward-drop'
import { RW, rwHead, rwMono, CheckMark, TalkIcon } from '@/components/RewardCards'

// The small meal drop (rewards-plan.md phase 4): after she logs or orders a
// meal from her Nutrition picks, a gold check slides in. Sometimes a bonus
// card shows under it — a recipe that fits her calories AND her money, or a
// self-talk card. Most times it's just the check. Rolled on the server, one
// per day, so logging twice can't farm it.

export default function MealDrop({ slot, left }: { slot: string; left: number }) {
  const [bonus, setBonus] = useState<{ drop: Drop; saved: boolean } | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    hapticTap(30)
    fetch('/api/plan/reward-drop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trigger: 'meal' }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { drop: Drop | null; fresh?: boolean; saved?: boolean } | null) => {
        const d = j?.drop
        if (!d || d.tier === 'every' || j?.fresh === false) return
        // Until the table exists the roll isn't saved — remember on this
        // phone that today's meal bonus was shown, so a second meal is just the check.
        const k = `luf_meal_drop_${d.day}`
        try { if (!j?.saved && localStorage.getItem(k)) return; localStorage.setItem(k, '1') } catch { /* ignore */ }
        setTimeout(() => { hapticTap(50); setBonus({ drop: d, saved: !!j?.saved }) }, 700)
      })
      .catch(() => null)
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <span className="rw-slide self-start flex items-center gap-2.5 rounded-full" style={{ background: 'rgba(255,178,30,.14)', border: `1px solid rgba(255,178,30,.55)`, padding: '6px 14px 6px 6px' }}>
        <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: RW.gold }}><CheckMark size={16} /></span>
        <span style={{ ...rwMono(12), color: RW.gold }}>{slot.toUpperCase()} HANDLED · {left.toLocaleString()} LEFT</span>
      </span>
      {bonus && (
        <div className="rw-reveal flex overflow-hidden" style={{ borderRadius: 22, border: `2px solid ${RW.emerald}`, background: RW.card, boxShadow: 'var(--glow-emerald)' }}>
          {bonus.drop.payload.photo
            ? <div className="w-[96px] shrink-0 rw-photo" style={{ backgroundImage: `url(${bonus.drop.payload.photo})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            : <div className="w-[76px] shrink-0 flex items-center justify-center" style={{ background: 'rgba(30,227,138,.12)' }}><TalkIcon size={36} /></div>}
          <div className="flex flex-col gap-1 px-3.5 py-3 min-w-0">
            <span style={{ ...rwMono(10), color: RW.emerald }}>{bonus.drop.kind === 'recipe' ? 'BONUS · NEW RECIPE UNLOCKED' : `BONUS · ${bonus.drop.payload.tag}`}</span>
            <span style={{ ...rwHead(bonus.drop.payload.quote ? 19 : 22), lineHeight: 1, color: RW.cream, textTransform: bonus.drop.payload.quote ? 'none' : 'uppercase' }}>
              {bonus.drop.payload.quote ? `“${bonus.drop.payload.title}”` : bonus.drop.payload.title}
            </span>
            {bonus.drop.kind === 'recipe' && <span style={{ fontSize: 13, color: RW.mute }}>{bonus.drop.payload.body}</span>}
            {bonus.saved && <span style={{ ...rwMono(10), color: RW.emerald }}>SAVED TO YOUR WINS</span>}
          </div>
        </div>
      )}
    </div>
  )
}
