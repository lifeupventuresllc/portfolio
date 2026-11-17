'use client'

import { useEffect, useState } from 'react'
import { hapticTap } from '@/lib/haptics'
import type { Drop } from '@/lib/reward-drop'
import WinsShelf from '@/components/WinsShelf'
import { ShieldIcon, FlameIcon } from '@/components/RewardCards'
import Link from 'next/link'
import type { PlanDay, PlanBlock } from '@/lib/week-plan'

// My Day → Progress (2026-10-25, Asa: the old garden/HUD "feels like a video
// game" — same simple look as the new intake). Her real week at a glance:
// workouts this week, a tappable day strip, weight change, food on target,
// streak, and her own why. Every number is real; nothing is shown that she
// hasn't actually logged.

export type DayDot = { label: string; iso: string; workout: boolean; foodOnTarget: boolean; isToday: boolean; isFuture: boolean; text: string }

const HEAD = "var(--font-barlow), 'Barlow Condensed', sans-serif"
const MONO = "var(--font-jbmono), 'JetBrains Mono', monospace"
const INK = '#EDE7DA', GOLD = '#E5A93C', MUTE = 'rgba(237,231,218,.72)', APP = '#021F16'
// Punchier color (rewards-plan.md §4): hot gold for the numbers that are
// hers, emerald for done, a deeper card. Base stays calm.
const HOT = '#FFB21E', EMERALD = '#1EE38A', CARD = '#0A3124'
const SOFT = "var(--font-fraunces), 'Fraunces', Georgia, serif"

export default function ProgressNew({ days, planDays, block, workoutsDone, workoutsGoal, weightChange, startWeight, foodDays, streak, why, wins = [], shields = 0 }: {
  days: DayDot[]; planDays?: PlanDay[]; block?: PlanBlock; workoutsDone: number; workoutsGoal: number
  weightChange: number | null; startWeight: number | null
  foodDays: number; streak: number; why: { title: string; line: string; lines?: { why: string; talk: string }[] } | null
  wins?: Drop[]; shields?: number
}) {
  const todayIdx = Math.max(0, days.findIndex((d) => d.isToday))
  const [sel, setSel] = useState(todayIdx)
  const lost = weightChange != null && weightChange < 0
  return (
    <div className="flex flex-col gap-3.5 pb-6">
      <div className="px-1">
        <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.16em', color: GOLD }}>THIS WEEK{block ? ` · BLOCK ${block.block} · WEEK ${block.week} OF ${block.total}` : ''}</span>
        <h1 className="nf-head" style={{ margin: '4px 0 0', fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 60, lineHeight: 0.86, textTransform: 'uppercase', color: INK }}>
          <span className="rw-glow-once" style={{ color: HOT }}>{workoutsDone} of {workoutsGoal}</span><br />workouts
        </h1>
        {planDays && <p style={{ margin: '8px 0 0', fontFamily: SOFT, fontStyle: 'italic', fontSize: 17, color: MUTE }}>{block?.light ? 'Light week. Same moves, easier sets.' : 'Your week, planned for you.'}</p>}
      </div>

      {planDays && block ? <MyPlan days={planDays} block={block} /> : (<>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d, i) => {
          const on = i === sel
          const dot = d.workout ? EMERALD : d.foodOnTarget ? HOT : 'transparent'
          return (
            <button key={d.iso} onClick={() => { hapticTap(); setSel(i) }} aria-label={d.text}
              className="nf-press h-16 rounded-2xl flex flex-col items-center justify-center gap-1"
              style={{ border: `2px solid ${on ? INK : d.workout ? 'rgba(30,227,138,.5)' : 'rgba(237,231,218,.14)'}`, background: d.workout ? 'rgba(30,227,138,.12)' : 'rgba(237,231,218,.05)', color: INK, opacity: d.isFuture ? 0.55 : 1 }}>
              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700 }}>{d.label}</span>
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: dot, boxShadow: d.workout ? '0 0 8px rgba(30,227,138,.8)' : 'none', border: dot === 'transparent' && !d.isFuture ? '1.5px solid rgba(237,231,218,.25)' : 'none' }} />
            </button>
          )
        })}
      </div>
      <p className="px-1 text-sm -mt-1" style={{ color: 'rgba(237,231,218,.85)' }}>{days[sel]?.text}</p>

      </>)}

      <div className="rounded-[22px] px-4 py-3.5 flex justify-between items-center gap-3" style={{ background: CARD, border: '1px solid rgba(255,178,30,.18)' }}>
        <span className="flex flex-col gap-0.5">
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: MUTE }}>WEIGHT</span>
          {weightChange != null ? (<>
            <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 40, lineHeight: 1, color: lost ? GOLD : INK }}>{weightChange > 0 ? '+' : weightChange < 0 ? '−' : ''}{Math.abs(weightChange).toFixed(1)} LB</span>
            <span className="text-xs" style={{ color: MUTE }}>since you started</span>
          </>) : (<>
            <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 34, lineHeight: 1, color: INK }}>{startWeight ? `${startWeight} LB` : '—'}</span>
            <span className="text-xs" style={{ color: MUTE }}>your start. Check in weekly to see it move.</span>
          </>)}
        </span>
        {weightChange != null && (
          <svg width="130" height="60" viewBox="0 0 130 60" aria-hidden>
            <path className="pg-draw" d={lost ? 'M4 10 L30 16 L56 22 L82 30 L108 40 L126 50' : 'M4 30 L30 28 L56 32 L82 29 L108 31 L126 30'} fill="none" stroke={GOLD} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-[20px] p-3.5" style={{ background: CARD, border: '1px solid rgba(255,178,30,.18)' }}>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: MUTE }}>FOOD ON TARGET</span>
          <div style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 34, lineHeight: 1.1, color: INK }}>{foodDays} {foodDays === 1 ? 'DAY' : 'DAYS'}</div>
          <span className="text-xs" style={{ color: MUTE }}>this week</span>
        </div>
        <div className="rw-chip-once rounded-[20px] p-3.5" style={{ background: CARD, border: '1px solid rgba(30,227,138,.35)' }}>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: MUTE }}>STREAK</span>
          <div className="flex items-center gap-1.5">
            <FlameIcon size={22} />
            <span className="rw-glow-once" style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 34, lineHeight: 1.1, color: HOT }}>{streak} {streak === 1 ? 'DAY' : 'DAYS'}</span>
          </div>
          {shields > 0 ? (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(247,242,231,.78)' }} aria-label={`${shields} streak shield${shields === 1 ? '' : 's'} banked`}>
              {Array.from({ length: Math.min(shields, 3) }, (_, k) => <ShieldIcon key={k} size={14} check={false} />)}
              {shields} shield{shields === 1 ? '' : 's'} banked
            </span>
          ) : (
            <span className="text-xs" style={{ color: MUTE }}>{streak ? 'keep it going' : 'starts today'}</span>
          )}
        </div>
      </div>

      <WinsShelf wins={wins} />

      {why && <WhyCard why={why} />}
      <style>{`.pg-draw{stroke-dasharray:400;stroke-dashoffset:400;animation:pgDraw 1.2s .3s ease forwards}@keyframes pgDraw{to{stroke-dashoffset:0}}`}</style>
    </div>
  )
}

// "Why you're doing this" (2026-10-29, Asa: "more illuminated", "should
// rotate", "paired with the self talk"): glows, steps through each reason
// she picked every few seconds, and shows the self-talk line made from that
// reason. A tap moves to the next one.
function WhyCard({ why }: { why: { title: string; line: string; lines?: { why: string; talk: string }[] } }) {
  const lines = why.lines && why.lines.length ? why.lines : [{ why: why.title, talk: '' }]
  const [k, setK] = useState(0)
  useEffect(() => {
    if (lines.length < 2) return
    const id = setInterval(() => setK((x) => (x + 1) % lines.length), 6000)
    return () => clearInterval(id)
  }, [lines.length])
  const cur = lines[k % lines.length]
  return (
    <button type="button" onClick={() => { hapticTap(); setK((x) => (x + 1) % lines.length) }}
      className="why-glow nf-press relative overflow-hidden rounded-[22px] px-4 py-4 flex flex-col gap-1.5 text-left"
      style={{ background: 'radial-gradient(120% 140% at 0% 0%, #FFD27A 0%, #E5A93C 45%, #C98A1E 100%)', color: '#021F16' }}>
      <style>{`.why-glow{box-shadow:0 0 0 1px rgba(255,210,122,.6),0 10px 34px rgba(229,169,60,.45);animation:whyGlow 3.2s ease-in-out infinite}@keyframes whyGlow{0%,100%{box-shadow:0 0 0 1px rgba(255,210,122,.6),0 10px 30px rgba(229,169,60,.35)}50%{box-shadow:0 0 0 1px rgba(255,230,170,.9),0 12px 44px rgba(255,178,30,.6)}}.why-in{animation:whyIn .5s ease both}@keyframes whyIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}@media (prefers-reduced-motion: reduce){.why-glow,.why-in{animation:none}}`}</style>
      <span className="flex items-center justify-between" style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.12em' }}>
        <span>WHY YOU&apos;RE DOING THIS</span>
        {lines.length > 1 && (
          <span className="flex gap-1" aria-hidden>{lines.map((_, i) => <span key={i} style={{ width: 6, height: 6, borderRadius: 9, background: i === k % lines.length ? '#021F16' : 'rgba(2,31,22,.3)' }} />)}</span>
        )}
      </span>
      <span key={k} className="why-in flex flex-col gap-1.5">
        <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 30, lineHeight: 0.95, textTransform: 'uppercase' }}>{cur.why}</span>
        {cur.talk && <span className="text-[16px] font-semibold" style={{ lineHeight: 1.3 }}>&ldquo;{cur.talk}&rdquo;</span>}
      </span>
      <span className="text-[13px]" style={{ opacity: 0.8 }}>{why.line}</span>
    </button>
  )
}

// My Plan (2026-11-17, workout-system step 1; Asa: "more stylistic for a
// woman… keep the font size, keep the coloring"). Her 6-week block as a
// string of beads, then Monday to Sunday as soft rows. Tap a day to see its
// moves. Same fonts and colors as the rest of Progress, plus a soft italic
// serif for the small lines.
function MyPlan({ days, block }: { days: PlanDay[]; block: PlanBlock }) {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div className="flex flex-col gap-3">
      <div className="px-1 pt-1">
        <div className="relative flex items-center justify-between" style={{ height: 22 }}>
          <span className="absolute left-2 right-2 top-1/2" style={{ height: 2, background: 'linear-gradient(90deg, rgba(30,227,138,.6), rgba(255,178,30,.5) 50%, rgba(237,231,218,.18))', transform: 'translateY(-50%)' }} aria-hidden />
          {Array.from({ length: block.total }, (_, i) => {
            const w = i + 1, past = w < block.week, now = w === block.week, light = w === block.total
            return (
              <span key={i} className="relative rounded-full" aria-label={`Week ${w}${now ? ', this week' : ''}${light ? ', light week' : ''}`}
                style={{ width: now ? 22 : 14, height: now ? 22 : 14, background: past ? EMERALD : now ? `radial-gradient(circle at 35% 35%, #FFE3A3, ${HOT} 60%)` : APP,
                  border: past || now ? 'none' : light ? '1.5px dashed rgba(237,231,218,.55)' : '1.5px solid rgba(237,231,218,.3)',
                  boxShadow: now ? '0 0 0 5px rgba(255,178,30,.18), 0 0 16px rgba(255,178,30,.7)' : past ? '0 0 8px rgba(30,227,138,.5)' : 'none' }} />
            )
          })}
        </div>
        <div className="flex justify-between mt-1.5" style={{ fontFamily: SOFT, fontStyle: 'italic', fontSize: 13, color: MUTE }}>
          <span>week 1</span><span style={{ color: HOT }}>you&apos;re here</span><span>light week</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {days.map((d, i) => {
          const isOpen = open === i && d.moves.length > 0
          const today = d.kind === 'today', done = d.kind === 'done', rest = d.kind === 'rest'
          return (
            <div key={d.iso} className="rounded-[24px] overflow-hidden" style={{
              background: today ? 'radial-gradient(120% 140% at 0% 0%, rgba(255,178,30,.2), rgba(255,178,30,.05) 60%)' : done ? 'rgba(30,227,138,.08)' : rest ? 'transparent' : 'rgba(237,231,218,.05)',
              border: today ? `2px solid ${HOT}` : done ? '1px solid rgba(30,227,138,.4)' : rest ? '1px dashed rgba(237,231,218,.16)' : '1px solid rgba(237,231,218,.12)',
              boxShadow: today ? '0 8px 26px rgba(255,178,30,.18)' : 'none' }}>
              <div className="flex items-center gap-3 px-3 py-2.5">
                <button type="button" onClick={() => { if (!d.moves.length) return; hapticTap(); setOpen(isOpen ? null : i) }} aria-expanded={d.moves.length ? isOpen : undefined}
                  className="flex flex-1 min-w-0 items-center gap-3 text-left" style={{ color: INK, cursor: d.moves.length ? 'pointer' : 'default' }}>
                  <span className="shrink-0 rounded-full flex flex-col items-center justify-center" style={{ width: 46, height: 46,
                    background: done ? `radial-gradient(circle at 35% 30%, #7DF5BC, ${EMERALD} 70%)` : today ? `radial-gradient(circle at 35% 30%, #FFE3A3, ${HOT} 70%)` : 'rgba(237,231,218,.07)',
                    color: done || today ? APP : INK }}>
                    <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: '.08em', lineHeight: 1 }}>{d.label}</span>
                    <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 19, lineHeight: 1 }}>{done ? '✓' : d.date}</span>
                  </span>
                  <span className="flex flex-col min-w-0">
                    <span className="truncate" style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.2, color: rest ? MUTE : INK }}>{d.title}</span>
                    <span style={{ fontFamily: SOFT, fontStyle: 'italic', fontSize: 14, lineHeight: 1.3, color: MUTE }}>{d.note}{d.moves.length ? (isOpen ? ' · hide moves' : ' · see moves') : ''}</span>
                  </span>
                </button>
                {today ? (
                  <Link href="/plan/workout" onClick={() => hapticTap()} className="nf-press shrink-0 rounded-full px-4 py-2.5" style={{ background: HOT, color: APP, fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.1em' }}>START</Link>
                ) : rest ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden className="shrink-0"><path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" fill="rgba(237,231,218,.35)" /></svg>
                ) : null}
              </div>
              {isOpen && (
                <div className="flex flex-wrap gap-1.5 px-3 pb-3">
                  {d.moves.map((m, k) => <span key={k} className="rounded-full px-3 py-1.5 text-[13px] font-semibold" style={{ background: 'rgba(237,231,218,.08)', color: INK }}>{m}</span>)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
