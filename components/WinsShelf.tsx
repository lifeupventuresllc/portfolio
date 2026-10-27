'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { hapticTap } from '@/lib/haptics'
import type { Drop } from '@/lib/reward-drop'
import { RW, rwHead, rwMono, DropArt, ringFor, tagFor, CoachNote } from '@/components/RewardCards'

// "Your wins" on Progress (rewards-plan.md phase 3, mockup
// RewardProgress.dc.html): every self-talk card, recipe, shield, badge and
// milestone she earned from a Reward Drop. Tap one to open it again. It's
// her collection — hidden until she has one, so it never reads as empty.

function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function whenLabel(day: string): string {
  const today = localToday()
  const diff = Math.round((new Date(today + 'T12:00:00Z').getTime() - new Date(day + 'T12:00:00Z').getTime()) / 86400000)
  if (diff <= 0) return 'EARNED TODAY'
  if (diff === 1) return 'EARNED YESTERDAY'
  if (diff < 7) return `EARNED ${new Date(day + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toUpperCase()}`
  if (diff < 14) return 'EARNED LAST WEEK'
  return `EARNED ${new Date(day + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).toUpperCase()}`
}
const BUTTON: Record<string, string> = { selftalk: 'KEEP IT', recipe: 'GOT IT', shield: 'NICE', badge: 'NICE', milestone: 'PROUD OF YOU' }

export default function WinsShelf({ wins }: { wins: Drop[] }) {
  const [sel, setSel] = useState<Drop | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!wins.length) return null
  const close = () => { hapticTap(); setSel(null) }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex justify-between items-baseline px-1">
        <span style={{ ...rwHead(30), lineHeight: 1, color: RW.cream }}>Your wins</span>
        <span style={{ ...rwMono(11), color: RW.gold }}>{wins.length} EARNED</span>
      </div>
      <div className="rw-shelf flex gap-2.5 overflow-x-auto -mx-4 px-4 pb-1">
        {wins.map((w) => {
          const ring = ringFor(w)
          return (
            <button key={w.id || w.day + w.kind} type="button" onClick={() => { hapticTap(); setSel(w) }}
              aria-label={`${tagFor(w)}: ${w.payload.title}. Open it again.`}
              className="nf-press shrink-0 flex flex-col text-left overflow-hidden"
              style={{ width: 128, height: 160, borderRadius: 20, border: `2px solid ${ring}`, background: RW.card, color: RW.cream, padding: 0, boxShadow: w.tier === 'rare' ? '0 0 22px rgba(255,90,78,.45)' : 'none' }}>
              <span className="relative block w-full">
                <DropArt drop={w} height={84} small />
                <span className="absolute left-2 top-2 rounded-full" style={{ background: ring, color: RW.bg, padding: '4px 7px', ...rwMono(9, '.08em') }}>{tagFor(w)}</span>
              </span>
              <span className="line-clamp-3" style={{ padding: '8px 10px', ...rwHead(w.kind === 'selftalk' ? 15 : 19), lineHeight: 1, textTransform: w.kind === 'selftalk' ? 'none' : 'uppercase' }}>
                {w.kind === 'selftalk' ? `“${w.payload.title}”` : w.payload.title}
              </span>
            </button>
          )
        })}
      </div>

      {sel && mounted && createPortal(
        <div className="fixed inset-0 z-[80] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={sel.payload.title}>
          <div className="absolute inset-0 nf-rise" onClick={close} style={{ background: 'rgba(1,15,10,.72)', animationDuration: '.25s' }} />
          <div className="rw-sheet relative w-full max-w-md overflow-hidden" style={{ borderRadius: '28px 28px 0 0', background: RW.card, borderTop: `2px solid ${ringFor(sel)}`, paddingBottom: 'calc(26px + env(safe-area-inset-bottom))', boxShadow: `0 -10px 40px ${sel.tier === 'rare' ? 'rgba(255,90,78,.35)' : sel.tier === 'bonus' ? 'rgba(30,227,138,.25)' : 'rgba(255,178,30,.25)'}`, color: RW.cream }}>
            <span className="relative block">
              <DropArt drop={sel} height={170} />
              <span className="absolute left-4 top-4 rounded-full" style={{ background: ringFor(sel), color: RW.bg, padding: '6px 10px', ...rwMono(11) }}>{tagFor(sel)}</span>
            </span>
            <div className="flex flex-col gap-2" style={{ padding: '16px 20px 0' }}>
              <span style={{ ...rwHead(sel.kind === 'selftalk' ? 28 : 32), lineHeight: 1, textTransform: sel.kind === 'selftalk' ? 'none' : 'uppercase' }}>
                {sel.kind === 'selftalk' ? `“${sel.payload.title}”` : sel.payload.title}
              </span>
              <span style={{ fontSize: 15, color: 'rgba(247,242,231,.82)' }}>{sel.payload.body}</span>
              {sel.payload.note && <CoachNote text={sel.payload.note} color={ringFor(sel)} />}
              <span style={{ ...rwMono(11), color: 'rgba(247,242,231,.72)' }}>{whenLabel(sel.day)}</span>
              <button type="button" onClick={close} className="rw-cta nf-press mt-2 rounded-full" style={{ height: 54, ...rwMono(14, '.12em') }}>{BUTTON[sel.kind] || 'NICE'}</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
