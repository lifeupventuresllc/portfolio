'use client'

import Link from 'next/link'
import { useState } from 'react'
import Ring from '@/components/Ring'
import Celebration from '@/components/Celebration'
import { useLiveRefresh, localTodayISO } from '@/lib/useLiveRefresh'
import { winAffirmation } from '@/lib/affirmations'

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
  const ringColor = doneToday ? '#46c46f' : '#f5a623'
  const cta = doneToday ? 'Do it again' : inProgress ? 'Resume session' : 'Start session'
  const eyebrow = doneToday ? 'Workout complete 🎉' : inProgress ? `In progress · ${pct}%` : 'Your workout 💪🏽'

  // Compact (stacked) variant — used side-by-side with the calories card on the home screen.
  if (compact) {
    return (
      <Link href="/plan/workout" className="luf-glow group flex flex-col items-center text-center bg-charcoal bg-gradient-to-br from-gold/20 to-charcoal border border-gold/40 rounded-[1.75rem] p-4 hover:border-gold/70 transition-all">
        <p className="text-gold text-[9px] uppercase tracking-wider font-semibold mb-2.5">{doneToday ? 'Complete 🎉' : inProgress ? `In progress · ${pct}%` : 'Your workout'}</p>
        <Ring pct={pct} size={84} stroke={8} color={ringColor}>
          <span className="text-2xl">{doneToday ? '✅' : inProgress ? '⏱️' : '💪🏽'}</span>
        </Ring>
        {title ? (
          <>
            <p className="text-white font-bold text-sm leading-tight mt-2.5 line-clamp-2">{title}</p>
            {adjusted && !doneToday && <p className="text-gold text-[10px] mt-1 font-semibold">✨ {adjusted.toMinutes ? `${adjusted.toMinutes}-min` : 'adapted'}</p>}
            <p className="text-gold/70 text-[10px] mt-2 group-hover:text-gold transition-colors">{doneToday ? '↻ Do it again' : inProgress ? '▶ Resume' : '▶ Start session'}</p>
          </>
        ) : <p className="text-ivory/60 text-xs mt-2">Being prepared…</p>}
        <Celebration trigger={doneToday} message={winAffirmation('workout')} dedupeKey={`workout-${today}`} />
      </Link>
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
          {title ? (
            <>
              <p className="text-white font-bold text-lg leading-tight truncate">{title}</p>
              {muscles?.length ? <p className="text-ivory/50 text-xs mt-0.5 truncate">{muscles.join(' · ')}</p> : null}
              {adjusted && !doneToday && (
                <p className="text-gold text-[11px] mt-1 font-semibold">✨ Adjusted: {adjusted.toMinutes ? `${adjusted.toMinutes}-min ` : ''}{adjusted.swapTo || 'adapted for today'}</p>
              )}
            </>
          ) : (
            <p className="text-ivory/60 text-sm">Being prepared — refresh in a moment.</p>
          )}
        </div>
      </div>
      {title && (
        <span className={`luf-pulse mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 font-bold text-xs uppercase tracking-wider rounded-2xl group-hover:scale-[1.03] transition-transform ${doneToday ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-gold text-obsidian'}`}>
          {doneToday ? '↻ ' : '▶ '}{cta}
        </span>
      )}
      <Celebration trigger={doneToday} message={winAffirmation('workout')} dedupeKey={`workout-${today}`} />
    </Link>
  )
}
