'use client'

import { useState } from 'react'
import { hapticTap } from '@/lib/haptics'

// My Day → Progress (2026-10-25, Asa: the old garden/HUD "feels like a video
// game" — same simple look as the new intake). Her real week at a glance:
// workouts this week, a tappable day strip, weight change, food on target,
// streak, and her own why. Every number is real; nothing is shown that she
// hasn't actually logged.

export type DayDot = { label: string; iso: string; workout: boolean; foodOnTarget: boolean; isToday: boolean; isFuture: boolean; text: string }

const HEAD = "var(--font-barlow), 'Barlow Condensed', sans-serif"
const MONO = "var(--font-jbmono), 'JetBrains Mono', monospace"
const INK = '#EDE7DA', GOLD = '#E5A93C', MUTE = 'rgba(237,231,218,.72)'

export default function ProgressNew({ days, workoutsDone, workoutsGoal, weightChange, startWeight, foodDays, streak, why }: {
  days: DayDot[]; workoutsDone: number; workoutsGoal: number
  weightChange: number | null; startWeight: number | null
  foodDays: number; streak: number; why: { title: string; line: string } | null
}) {
  const todayIdx = Math.max(0, days.findIndex((d) => d.isToday))
  const [sel, setSel] = useState(todayIdx)
  const lost = weightChange != null && weightChange < 0
  return (
    <div className="flex flex-col gap-3.5 pb-6">
      <div className="px-1">
        <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.16em', color: GOLD }}>THIS WEEK</span>
        <h1 className="nf-head" style={{ margin: '4px 0 0', fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 60, lineHeight: 0.86, textTransform: 'uppercase', color: INK }}>
          {workoutsDone} of {workoutsGoal}<br />workouts
        </h1>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d, i) => {
          const on = i === sel
          const dot = d.workout ? GOLD : d.foodOnTarget ? '#6EBEA0' : 'transparent'
          return (
            <button key={d.iso} onClick={() => { hapticTap(); setSel(i) }} aria-label={d.text}
              className="nf-press h-16 rounded-2xl flex flex-col items-center justify-center gap-1"
              style={{ border: `2px solid ${on ? INK : d.workout ? 'rgba(229,169,60,.5)' : 'rgba(237,231,218,.14)'}`, background: d.workout ? 'rgba(229,169,60,.14)' : 'rgba(237,231,218,.05)', color: INK, opacity: d.isFuture ? 0.55 : 1 }}>
              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700 }}>{d.label}</span>
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: dot, border: dot === 'transparent' && !d.isFuture ? '1.5px solid rgba(237,231,218,.25)' : 'none' }} />
            </button>
          )
        })}
      </div>
      <p className="px-1 text-sm -mt-1" style={{ color: 'rgba(237,231,218,.85)' }}>{days[sel]?.text}</p>

      <div className="rounded-[22px] px-4 py-3.5 flex justify-between items-center gap-3" style={{ background: 'rgba(237,231,218,.06)' }}>
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
        <div className="rounded-[20px] p-3.5" style={{ background: 'rgba(237,231,218,.06)' }}>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: MUTE }}>FOOD ON TARGET</span>
          <div style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 34, lineHeight: 1.1, color: INK }}>{foodDays} {foodDays === 1 ? 'DAY' : 'DAYS'}</div>
          <span className="text-xs" style={{ color: MUTE }}>this week</span>
        </div>
        <div className="rounded-[20px] p-3.5" style={{ background: 'rgba(237,231,218,.06)' }}>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: MUTE }}>STREAK</span>
          <div style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 34, lineHeight: 1.1, color: INK }}>{streak} {streak === 1 ? 'DAY' : 'DAYS'}</div>
          <span className="text-xs" style={{ color: MUTE }}>{streak ? 'keep it going' : 'starts today'}</span>
        </div>
      </div>

      {why && (
        <div className="rounded-[22px] px-4 py-3.5 flex flex-col gap-0.5" style={{ background: GOLD, color: '#021F16' }}>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.12em' }}>WHY YOU&apos;RE DOING THIS</span>
          <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 28, lineHeight: 1, textTransform: 'uppercase' }}>{why.title}</span>
          <span className="text-[13px]">{why.line}</span>
        </div>
      )}
      <style>{`.pg-draw{stroke-dasharray:400;stroke-dashoffset:400;animation:pgDraw 1.2s .3s ease forwards}@keyframes pgDraw{to{stroke-dashoffset:0}}`}</style>
    </div>
  )
}
