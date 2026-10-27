'use client'

import type { ReactNode } from 'react'
import type { Drop } from '@/lib/reward-drop'

// Shared look for Reward Drops (rewards-plan.md, mockups RewardDrop +
// RewardProgress): the revealed card on the workout finish screen, the
// "Your wins" shelf tiles, and the reopen sheet all draw from here.

export const RW = {
  bg: '#021F16', card: '#0A3124', gold: '#FFB21E', goldSoft: '#FFC94D', emerald: '#1EE38A', coral: '#FF5A4E',
  cream: '#F7F2E7', mute: 'rgba(247,242,231,.78)',
  head: "var(--font-barlow), 'Barlow Condensed', sans-serif",
  mono: "var(--font-jbmono), 'JetBrains Mono', monospace",
}
export const rwHead = (size: number) => ({ fontFamily: RW.head, fontStyle: 'italic' as const, fontWeight: 800, fontSize: size, lineHeight: 0.95, textTransform: 'uppercase' as const })
export const rwMono = (size: number, ls = '.1em') => ({ fontFamily: RW.mono, fontWeight: 700, fontSize: size, letterSpacing: ls })

/** The tier's one loud color: gold everyday, emerald bonus, coral rare. */
export function ringFor(d: Pick<Drop, 'tier'>): string {
  return d.tier === 'rare' ? RW.coral : d.tier === 'bonus' ? RW.emerald : RW.gold
}

export function CheckMark({ size = 30, color = RW.bg }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12l5 5 9-10" /></svg>
}
export function TalkIcon({ size = 60 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={RW.emerald} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9h8M8 12h5" /></svg>
}
export function ShieldIcon({ size = 64, check = true }: { size?: number; check?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill={RW.emerald} />
      {check && <path d="M8 12l3 3 5-6" fill="none" stroke={RW.bg} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  )
}
export function BadgeIcon({ size = 70 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="10" r="7" fill={RW.gold} /><circle cx="12" cy="10" r="4.6" fill="none" stroke={RW.bg} strokeWidth="1.4" />
      <path d="M8 15l-2 7 6-3 6 3-2-7" fill={RW.emerald} />
      <path d="M12 7.4l.9 1.8 2 .3-1.4 1.4.3 2-1.8-.9-1.8.9.3-2-1.4-1.4 2-.3z" fill={RW.bg} />
    </svg>
  )
}
export function FlameIcon({ size = 14, color = RW.emerald }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden><path d="M12 2c1 4 6 6 6 12a6 6 0 01-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4-1-6 1-9z" /></svg>
}
export function GiftIcon({ size = 96 }: { size?: number }) {
  return (
    <svg className="rw-wiggle" width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect x="8" y="26" width="48" height="32" rx="5" fill={RW.gold} />
      <rect x="4" y="18" width="56" height="12" rx="4" fill={RW.goldSoft} />
      <rect x="28" y="18" width="8" height="40" fill={RW.bg} opacity=".85" />
      <path d="M32 18c-6-10-16-10-16-4s10 4 16 4zM32 18c6-10 16-10 16-4s-10 4-16 4z" fill="none" stroke={RW.goldSoft} strokeWidth="4" strokeLinejoin="round" />
    </svg>
  )
}

export function NoteIcon({ size = 60, color = RW.emerald }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4M9 11h7M9 14h7M9 17h4" /></svg>
}

/** A written note from Coach Asa (2026-10-27 — in place of video clips):
 * her real numbers, his words, signed. */
export function CoachNote({ text, color = RW.emerald }: { text: string; color?: string }) {
  return (
    <div className="rw-note w-full text-left" style={{ borderRadius: 18, background: 'rgba(247,242,231,.06)', borderLeft: `4px solid ${color}`, padding: '12px 14px' }}>
      <span style={{ ...rwMono(10, '.16em'), color }}>A NOTE FROM COACH ASA</span>
      <p style={{ margin: '6px 0 0', fontSize: 15, lineHeight: 1.4, color: RW.cream }}>{text}</p>
      <span className="block mt-2" style={{ ...rwHead(20), color }}>— Coach Asa</span>
    </div>
  )
}

/** The art strip on top of a bonus card / shelf tile. */
export function DropArt({ drop, height, small = false }: { drop: Drop; height: number; small?: boolean }) {
  const ring = ringFor(drop)
  const photo = drop.payload.photo
  return (
    <span className={`relative flex items-center justify-center w-full ${photo ? 'rw-photo' : ''}`}
      style={{ height, backgroundColor: photo ? undefined : `${ring}1F`, backgroundImage: photo ? `url(${photo})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      {!photo && drop.kind === 'selftalk' && <TalkIcon size={small ? 38 : 64} />}
      {!photo && drop.kind === 'shield' && <ShieldIcon size={small ? 42 : 70} />}
      {!photo && drop.kind === 'badge' && <BadgeIcon size={small ? 44 : 74} />}
      {!photo && drop.kind === 'milestone' && <FlameIcon size={small ? 40 : 64} color={RW.coral} />}
      {!photo && drop.kind === 'note' && <NoteIcon size={small ? 40 : 64} />}
    </span>
  )
}

export function tagFor(drop: Drop): string {
  if (drop.tier === 'rare') return 'RARE'
  return ({ selftalk: 'SELF-TALK', recipe: 'RECIPE', shield: 'SHIELD', badge: 'BADGE', note: 'COACH NOTE' } as Record<string, string>)[drop.kind] || drop.payload.tag
}

/** The opened Bonus card (emerald) — also the body of the reopen sheet. */
export function BonusCard({ drop, saved }: { drop: Drop; saved: boolean }) {
  const p = drop.payload
  return (
    <div className="rw-reveal w-full flex flex-col overflow-hidden" style={{ borderRadius: 28, border: `2px solid ${RW.emerald}`, background: RW.card, boxShadow: 'var(--glow-emerald)' }}>
      <span className="relative block">
        <DropArt drop={drop} height={150} />
        <span className="absolute left-3 top-3 rounded-full" style={{ background: RW.emerald, color: RW.bg, padding: '6px 10px', ...rwMono(11) }}>BONUS · {p.tag}</span>
      </span>
      <div className="flex flex-col gap-2 text-left" style={{ padding: '16px 20px 20px' }}>
        <span style={{ ...rwHead(p.quote ? 26 : 34), lineHeight: 0.98, textTransform: p.quote ? 'none' : 'uppercase', color: RW.cream }}>{p.quote ? `“${p.title}”` : p.title}</span>
        {p.note ? <CoachNote text={p.note} /> : <span style={{ fontSize: 14, color: RW.mute }}>{p.body}</span>}
        {saved && (
          <span className="self-start flex items-center gap-1.5 mt-1" style={{ ...rwMono(11), color: RW.emerald }}>
            <CheckMark size={14} color={RW.emerald} />SAVED TO YOUR WINS
          </span>
        )}
      </div>
    </div>
  )
}

const SPARK_COLORS = [RW.coral, RW.gold, RW.emerald, RW.cream]

/** The opened Rare card (coral + gold). */
export function RareCard({ drop, saved, share }: { drop: Drop; saved: boolean; share?: ReactNode }) {
  const p = drop.payload
  return (
    <div className="rw-reveal relative w-full" style={{ borderRadius: 28, padding: 3, background: `linear-gradient(135deg, ${RW.coral}, ${RW.gold} 55%, ${RW.coral})`, boxShadow: 'var(--glow-coral)' }}>
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2
        return <span key={i} className="rw-spark" style={{ left: '50%', top: '40%', background: SPARK_COLORS[i % 4], ['--dx' as string]: `${Math.round(Math.cos(a) * 170)}px`, ['--dy' as string]: `${Math.round(Math.sin(a) * 190)}px`, animationDelay: `${(i % 4) * 0.05}s` }} />
      })}
      <div className="flex flex-col items-center gap-2.5 text-center" style={{ borderRadius: 25, background: RW.card, padding: '22px 20px 22px' }}>
        <span className="rounded-full" style={{ background: RW.coral, color: RW.bg, padding: '6px 12px', ...rwMono(11, '.14em') }}>RARE · {p.tag}</span>
        <span style={{ ...rwHead(62), lineHeight: 0.84, color: RW.gold, textShadow: '0 0 24px rgba(255,178,30,.5)', whiteSpace: 'pre-line' }}>{p.big || p.title}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: RW.cream }}>{p.body}</span>
        {p.note && <CoachNote text={p.note} color={RW.gold} />}
        {share}
        {saved && <span className="flex items-center gap-1.5" style={{ ...rwMono(11), color: RW.gold }}><CheckMark size={14} color={RW.gold} />SAVED TO YOUR WINS</span>}
      </div>
    </div>
  )
}

/** The opened Everyday card (hot gold). */
export function EverydayCard({ drop }: { drop: Drop }) {
  const p = drop.payload
  return (
    <div className="rw-reveal w-full flex flex-col items-center gap-3.5 text-center" style={{ borderRadius: 28, border: `2px solid ${RW.gold}`, background: RW.card, padding: '26px 22px', boxShadow: '0 0 26px rgba(255,178,30,.3)' }}>
      <span style={{ ...rwMono(11, '.14em'), color: RW.gold }}>TODAY&apos;S WIN</span>
      <span className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: RW.gold }}><CheckMark size={30} /></span>
      <span style={{ ...rwHead(36), color: RW.cream }}>{p.title}</span>
      <span style={{ fontSize: 15, color: RW.mute }}>{p.body}</span>
    </div>
  )
}
