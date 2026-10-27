'use client'

import { useEffect, useRef, useState } from 'react'
import { hapticTap } from '@/lib/haptics'
import type { Drop } from '@/lib/reward-drop'
import { RW, rwHead, rwMono, GiftIcon, FlameIcon, BonusCard, RareCard, EverydayCard } from '@/components/RewardCards'

// The Reward Drop on the workout finish screen (rewards-plan.md phase 2,
// mockup RewardDrop.dc.html). A gift card she taps open: most days a kind
// line from her own why, sometimes a bonus card, rarely a milestone. The
// roll happens on the server AFTER her workout is saved (never for just
// opening the app). She never sees odds, points or countdowns.

type DropResponse = { drop: Drop | null; fresh?: boolean; saved?: boolean; streak?: number; shields?: number; partnerName?: string | null; shared?: boolean }

// If the server can't be reached she still gets the baseline — never an
// empty box, never an error.
const FALLBACK: Drop = {
  id: null, trigger: 'workout', day: '', tier: 'every', kind: 'kind', itemKey: null, createdAt: '', openedAt: null,
  payload: { tag: "TODAY'S WIN", title: 'You showed up.', body: 'You did this one for you. It counts for your streak.' },
}

export default function RewardDrop({ saved }: { saved: Promise<unknown> }) {
  const [res, setRes] = useState<DropResponse | null>(null)
  const [opened, setOpened] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [sent, setSent] = useState<'idle' | 'sending' | 'sent'>('idle')
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    saved
      .catch(() => null)
      .then(() => fetch('/api/plan/reward-drop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trigger: 'workout' }) }))
      .then((r) => (r.ok ? r.json() : { drop: null }))
      .catch(() => ({ drop: null }))
      .then((j: DropResponse) => {
        setRes(j)
        // A second workout the same day: today's card is already hers.
        if (j.drop && j.fresh === false && j.drop.openedAt) setOpened(true)
      })
  }, [saved])

  const drop = res?.drop || (res ? FALLBACK : null)

  // Tapped before the roll came back → open the moment it lands.
  useEffect(() => {
    if (waiting && drop) { setWaiting(false); reveal(drop) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting, drop])

  function reveal(d: Drop) {
    hapticTap(d.tier === 'rare' ? 80 : 50)
    if (d.tier === 'rare') setTimeout(() => hapticTap(60), 180)
    setOpened(true)
    if (d.id) fetch('/api/plan/reward-drop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'open', id: d.id }) }).catch(() => null)
  }

  function tap() {
    if (opened) return
    if (drop) reveal(drop)
    else { hapticTap(20); setWaiting(true) }
  }

  const streak = res?.streak || 0
  const isRare = opened && drop?.tier === 'rare'
  return (
    <div className="w-full flex flex-col items-center gap-3 relative">
      {isRare && <span className="rw-rays" style={{ top: '55%' }} aria-hidden />}
      {streak > 0 && (
        <span className="nf-rise relative flex items-center gap-2 rounded-full" style={{ background: 'rgba(30,227,138,.14)', border: '1px solid rgba(30,227,138,.55)', color: RW.emerald, padding: '7px 12px', ...rwMono(11) }}>
          <FlameIcon size={14} />DAY {streak} STREAK · ALWAYS COUNTS
          {(res?.shields || 0) > 0 && <span style={{ opacity: 0.85 }}>· {res?.shields} SHIELD{res?.shields === 1 ? '' : 'S'}</span>}
        </span>
      )}
      <div className="w-full relative mt-1" aria-live="polite">
        {!opened ? (
          <button type="button" onClick={tap} className="rw-gift nf-press w-full flex flex-col items-center justify-center gap-3.5"
            style={{ height: 280, borderRadius: 28, border: `2px solid ${RW.gold}`, background: `radial-gradient(circle at 50% 38%, rgba(255,178,30,.32), rgba(255,178,30,.06) 62%), ${RW.card}`, color: RW.cream }}
            aria-label="You earned something. Tap to open.">
            <GiftIcon size={92} />
            <span style={{ ...rwHead(34), lineHeight: 1 }}>You earned something</span>
            <span className="rounded-full" style={{ background: RW.gold, color: RW.bg, padding: '10px 18px', ...rwMono(13, '.12em') }}>{waiting ? 'OPENING…' : 'TAP TO OPEN'}</span>
          </button>
        ) : drop?.tier === 'rare' ? (
          <RareCard drop={drop} saved={!!res?.saved} share={res?.partnerName ? (
            // "Send to <partner>?" (rewards-plan phase 5) — her choice, one tap, never automatic.
            res.shared || sent === 'sent' ? (
              <span style={{ ...rwMono(12), color: RW.coral }}>SENT TO {res.partnerName.toUpperCase()}</span>
            ) : (
              <button type="button" disabled={sent === 'sending'} className="nf-press rounded-full mt-1"
                onClick={() => {
                  hapticTap(30); setSent('sending')
                  fetch('/api/plan/reward-drop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'share' }) })
                    .then((r) => r.json()).then((j) => setSent(j.ok ? 'sent' : 'idle')).catch(() => setSent('idle'))
                }}
                style={{ background: RW.coral, color: RW.bg, padding: '12px 20px', ...rwMono(13, '.12em') }}>
                {sent === 'sending' ? 'SENDING…' : `SEND TO ${res.partnerName.toUpperCase()}?`}
              </button>
            )
          ) : null} />
        ) : drop?.tier === 'bonus' ? (
          <BonusCard drop={drop} saved={!!res?.saved} />
        ) : drop ? (
          <EverydayCard drop={drop} />
        ) : null}
      </div>
    </div>
  )
}
