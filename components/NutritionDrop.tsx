'use client'

import { useEffect, useRef, useState } from 'react'
import { hapticTap } from '@/lib/haptics'
import type { Drop } from '@/lib/reward-drop'
import { RW, rwHead, rwMono, GiftIcon, BonusCard, RareCard, EverydayCard } from '@/components/RewardCards'

// Nutrition reward (2026-10-29, Asa: "adding the reward system for the
// nutrition too ... every day that they eat at their nutrition goals"). The
// morning after a day she ended on her food target, a gift card waits on
// Today. Same tiers as the workout drop: most days a kind line, sometimes a
// recipe or self-talk, a milestone at 3 / 7 / 14 / 30 days in a row. Rolled
// on the server once per day; shown until she opens it, then gone.

type Res = { drop: Drop | null; saved?: boolean }

export default function NutritionDrop() {
  const [res, setRes] = useState<Res | null>(null)
  const [opened, setOpened] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    fetch('/api/plan/reward-drop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trigger: 'nutrition' }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: Res | null) => {
        const d = j?.drop
        if (!d || d.openedAt) return
        // Until migration 048 runs nothing is saved: show it once per phone.
        const k = `luf_food_drop_${d.day}`
        try { if (!j?.saved && localStorage.getItem(k)) return; localStorage.setItem(k, '1') } catch { /* ignore */ }
        setRes(j)
      })
      .catch(() => null)
  }, [])

  const drop = res?.drop
  if (!drop) return null

  function open() {
    if (!drop || opened) return
    hapticTap(drop.tier === 'rare' ? 80 : 50)
    setOpened(true)
    if (drop.id) fetch('/api/plan/reward-drop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'open', id: drop.id }) }).catch(() => null)
  }

  if (!opened) {
    return (
      <button type="button" onClick={open} className="rw-gift nf-press nf-rise w-full flex items-center gap-4 text-left"
        style={{ borderRadius: 22, border: `2px solid ${RW.gold}`, background: `radial-gradient(circle at 18% 50%, rgba(255,178,30,.3), rgba(255,178,30,.05) 60%), ${RW.card}`, color: RW.cream, padding: '16px 16px' }}
        aria-label="You hit your food goal yesterday. Tap to open your reward.">
        <GiftIcon size={58} />
        <span className="flex flex-col gap-1 min-w-0">
          <span style={{ ...rwMono(11), color: RW.gold }}>YESTERDAY · FOOD ON TARGET</span>
          <span style={{ ...rwHead(26), lineHeight: 1 }}>You earned something</span>
          <span style={{ ...rwMono(11), color: RW.mute }}>TAP TO OPEN</span>
        </span>
      </button>
    )
  }
  return drop.tier === 'rare' ? <RareCard drop={drop} saved={!!res?.saved} />
    : drop.tier === 'bonus' ? <BonusCard drop={drop} saved={!!res?.saved} />
    : <EverydayCard drop={drop} />
}
