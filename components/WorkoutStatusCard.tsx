'use client'

import Link from 'next/link'
import { useState } from 'react'
import Ring from '@/components/Ring'
import Celebration from '@/components/Celebration'
import RebuildPlanButton from '@/components/RebuildPlanButton'
import { useLiveRefresh, localTodayISO } from '@/lib/useLiveRefresh'
import { winAffirmation } from '@/lib/affirmations'

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4l3 2" />
    </svg>
  )
}

function DumbbellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 6.5l11 11M4 9l4-4M20 15l-4 4M2 11l2-2M22 13l-2 2M9 4l-2 2M15 20l2-2" />
    </svg>
  )
}

type Progress = { date: string; i: number; total: number; done: boolean }

// Home-dashboard "your workout" box with a live status ring:
//   not started → 💪🏽 empty ring → "Start session"
//   mid-session → ⏱️ ring fills to % done → "Resume session"  (progress kept in localStorage by the player)
//   finished    → ✅ green full ring → "Workout complete" + confetti
export default function WorkoutStatusCard({ title, muscles, doneTodayServer, adjusted, compact }: { title: string | null; muscles?: string[]; doneTodayServer: boolean; adjusted?: { toMinutes?: number; swapTo?: string; reason?: string } | null; compact?: boolean }) {
  const [doneToday, setDoneToday] = useState(doneTodayServer)
  const [progress, setProgress] = useState<Progress | null>(null)
  const today = localTodayISO()

  useLiveRefresh(() => {
    fetch('/api/plan/daily').then((r) => r.json()).then((d) => setDoneToday(!!d?.today?.workout)).catch(() => {})
    try {
      const raw = localStorage.getItem('luf_workout_progress')
      const p = raw ? (JSON.parse(raw) as Progress) : null
      setProgress(p && p.date === today ? p : null)
    } catch { setProgress(null) }
  })

  const inProgress = !doneToday && !!progress && progress.total > 0 && progress.i > 0 && !progress.done
  const pct = doneToday ? 100 : inProgress ? Math.min(100, Math.round((progress!.i / progress!.total) * 100)) : 0
  const ringColor = doneToday ? '#46c46f' : '#E5A93C'
  const cta = doneToday ? 'Do it again' : inProgress ? 'Resume session' : 'Start session'
  const eyebrow = doneToday ? 'Workout complete' : inProgress ? `In progress · ${pct}%` : 'Your workout'

  // Compact (stacked) variant — used side-by-side with the calories card on the home screen.
  if (compact) {
    // No plan generated — a real failure, not "in progress" (intake is already done
    // by the time this renders). Not a Link: nothing to navigate to yet, and it would
    // wrap the rebuild button in a nested interactive element.
    if (!title) {
      return (
        <div className="flex flex-col items-center text-center rounded-[1.5rem] p-3.5" style={{ background: '#083023', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Ring pct={0} size={62} stroke={7} color="#3a3a44"><span className="text-white/30"><DumbbellIcon /></span></Ring>
          <p className="text-white/50 text-xs mt-2.5">We hit a snag building this</p>
          <div className="mt-1"><RebuildPlanButton /></div>
          <Celebration trigger={doneToday} message={winAffirmation('workout')} dedupeKey={`workout-${today}`} />
        </div>
      )
    }
    return (
      <Link href="/plan/workout" className="group flex flex-col items-center text-center rounded-[1.5rem] p-3.5 transition-all" style={{ background: '#083023', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-white/40 text-[9px] uppercase tracking-wider font-bold mb-2">{doneToday ? 'Complete' : inProgress ? `In progress · ${pct}%` : "Today's workout"}</p>
        <Ring pct={pct} size={62} stroke={7} color={ringColor}>
          <span className="text-white">{doneToday ? <CheckIcon /> : inProgress ? <ClockIcon /> : <DumbbellIcon />}</span>
        </Ring>
        <p className="text-white font-bold text-[13px] leading-tight mt-2.5 line-clamp-2">{title}</p>
        {adjusted && !doneToday && <p className="text-[#E5A93C] text-[10px] mt-1 font-semibold">{adjusted.toMinutes ? `${adjusted.toMinutes}-min` : 'adapted'}</p>}
        <p className="text-[#E5A93C]/70 text-[10px] mt-2 group-hover:text-[#E5A93C] transition-colors">{doneToday ? 'Do it again' : inProgress ? 'Resume' : 'Start session'}</p>
        <Celebration trigger={doneToday} message={winAffirmation('workout')} dedupeKey={`workout-${today}`} />
      </Link>
    )
  }

  if (!title) {
    return (
      <div className="block bg-charcoal border border-smoke rounded-[2rem] p-6">
        <div className="flex items-center gap-5">
          <Ring pct={0} size={94} stroke={9} color="#3a3a44"><span className="text-2xl opacity-50">💪🏽</span></Ring>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm mb-1">We hit a snag building your workout</p>
            <p className="text-ivory/50 text-sm">Shouldn&apos;t take more than a second to fix.</p>
          </div>
        </div>
        <div className="mt-4"><RebuildPlanButton /></div>
        <Celebration trigger={doneToday} message={winAffirmation('workout')} dedupeKey={`workout-${today}`} />
      </div>
    )
  }

  return (
    <Link href="/plan/workout" className="luf-glow group block bg-charcoal bg-gradient-to-br from-gold/20 to-charcoal border border-gold/40 rounded-[2rem] p-6 hover:border-gold/70 hover:-translate-y-0.5 transition-all">
      <div className="flex items-center gap-5">
        <Ring pct={pct} size={94} stroke={9} color={ringColor}>
          <span className="text-2xl">{doneToday ? '✅' : inProgress ? '⏱️' : '💪🏽'}</span>
        </Ring>
        <div className="flex-1 min-w-0">
          <p className="text-gold text-[10px] uppercase tracking-wider font-semibold mb-1">{eyebrow}</p>
          <p className="text-white font-bold text-lg leading-tight truncate">{title}</p>
          {muscles?.length ? <p className="text-ivory/50 text-xs mt-0.5 truncate">{muscles.join(' · ')}</p> : null}
          {adjusted && !doneToday && (
            <p className="text-gold text-[11px] mt-1 font-semibold">✨ Adjusted: {adjusted.toMinutes ? `${adjusted.toMinutes}-min ` : ''}{adjusted.swapTo || 'adapted for today'}</p>
          )}
        </div>
      </div>
      <span className={`luf-pulse mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 font-bold text-xs uppercase tracking-wider rounded-2xl group-hover:scale-[1.03] transition-transform ${doneToday ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-gold text-obsidian'}`}>
        {doneToday ? '↻ ' : '▶ '}{cta}
      </span>
      <Celebration trigger={doneToday} message={winAffirmation('workout')} dedupeKey={`workout-${today}`} />
    </Link>
  )
}
