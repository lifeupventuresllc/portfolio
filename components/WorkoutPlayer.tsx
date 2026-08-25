'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Confetti from '@/components/Confetti'
import QuickFeedback from '@/components/QuickFeedback'
import EffortTap from '@/components/EffortTap'
import WorkoutMusicPlayer from '@/components/WorkoutMusicPlayer'
import { broadcastRefresh, localTodayISO } from '@/lib/useLiveRefresh'
import { buildSteps, dayLabels, estimateWorkoutMinutes, trimStepsToTarget, type WorkoutStep } from '@/lib/workout-steps'
import { GOAL_LABEL, type WorkoutProgram } from '@/lib/workout'
import { hapticTap } from '@/lib/haptics'
import { playCountdownBeep, unlockAudioContext } from '@/lib/countdown-beep'

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function PlayIcon() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
}
function PauseIcon() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>
}
function CheckIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M4 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function SkipBackIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zM20 6v12l-8.5-6z" /></svg>
}
function SkipForwardIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zM4 6l8.5 6L4 18z" /></svg>
}
function DumbbellIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gold/40">
      <path d="M6.5 9v6M4 10v4M17.5 9v6M20 10v4M9 12h6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="5" y="8" width="3" height="8" rx="1" />
      <rect x="16" y="8" width="3" height="8" rx="1" />
    </svg>
  )
}

// Guided in-workout player. Opens straight into TODAY'S session (no picker
// screen); a compact switcher lets her change the day. One countdown interval
// per step (not recreated every second) so the timer runs smooth.
export default function WorkoutPlayer({ program, firstName, hasRealName = true, startDay = 0, targetMinutes }: {
  program: WorkoutProgram
  firstName: string
  // Real bug found live: "there" (firstName's fallback for a nameless guest
  // account) only works in an idiomatic "Hey there," not the finish screen's
  // vocative "That's done, {name}." — gates whether that name actually
  // renders instead of ever substituting the fallback into a sentence shape
  // it was never written for. Defaults true so every other real caller
  // (there's only the one right now) keeps rendering the name exactly as
  // before without needing to pass this explicitly.
  hasRealName?: boolean
  startDay?: number
  // Set when Coach Asa's chat approved a time-crunch/low-energy/re-entry adjustment
  // for today — genuinely shortens the session instead of just relabeling it.
  targetMinutes?: number
}) {
  const router = useRouter()
  const labels = dayLabels(program)
  const clamp = (d: number) => Math.min(Math.max(d, 0), Math.max(labels.length - 1, 0))
  const buildDay = (d: number) => {
    const full = buildSteps(program, d)
    return targetMinutes ? trimStepsToTarget(full, targetMinutes) : full
  }

  const [dayIdx, setDayIdx] = useState(clamp(startDay))
  const [steps, setSteps] = useState<WorkoutStep[]>(() => buildDay(clamp(startDay)))
  const [i, setI] = useState(0)
  const [left, setLeft] = useState<number | null>(null)
  const [paused, setPaused] = useState(false)
  const [done, setDone] = useState(false)
  const [switching, setSwitching] = useState(false)
  // True for the last 10 seconds of ANY timed step — a real exercise hold
  // or a rest period, both drive off the same `left` countdown below, so
  // one flag covers "even for the rest of it" the way it was asked for.
  const [musicDucked, setMusicDucked] = useState(false)

  // Real bug found live: the countdown beep's AudioContext only ever got
  // created/resumed from inside the countdown's own setInterval tick, never
  // from a direct click — browsers require that resume to happen inside a
  // real user-gesture call stack or they leave it permanently suspended
  // (silent, no error). One tap anywhere on this screen — which happens
  // almost immediately in practice (pause, next, day switch) — unlocks it
  // well before any real countdown needs it.
  useEffect(() => {
    const unlock = () => unlockAudioContext()
    document.addEventListener('pointerdown', unlock, { once: true })
    return () => document.removeEventListener('pointerdown', unlock)
  }, [])

  // finish() fires this save without awaiting it, so the confetti/"that's done"
  // screen never waits on a network round trip. But a fast tap on "Back to my
  // week" could still beat the save to the server — the dashboard's first render
  // reads stale (not-done) data, then a moment later the client re-fetch catches
  // up and it flips to done. Real, reported lag. Fix: await this ref before
  // navigating, not before showing the completion screen — by the time she's
  // read "That's done" the save has almost always already resolved, so this
  // costs nothing in the common case and only actually waits when she's fast.
  const savedRef = useRef<Promise<unknown>>(Promise.resolve())

  const step = steps[i]
  const isTimed = step?.seconds != null

  // Keep advance current without re-arming the interval every render.
  const advanceRef = useRef<() => void>(() => {})
  advanceRef.current = () => { if (i + 1 >= steps.length) finish(); else setI(i + 1) }

  function selectDay(d: number) {
    setDayIdx(clamp(d)); setSteps(buildDay(clamp(d)))
    setI(0); setDone(false); setPaused(false); setSwitching(false)
  }
  function finish() {
    setDone(true)
    hapticTap(30) // one satisfying buzz on the moment she actually finishes
    const today = localTodayISO()
    try {
      localStorage.setItem('luf_workout_progress', JSON.stringify({ date: today, i: steps.length, total: steps.length, done: true }))
      // Pre-mark today's workout celebration so the dashboard shows ✅ without re-confetti.
      localStorage.setItem('luf_celebrated_workout-' + today, '1')
    } catch { /* ignore */ }
    savedRef.current = fetch('/api/plan/daily', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workout: true }) })
      .catch(() => {})
      .finally(() => broadcastRefresh())
  }

  // Reset the countdown when the step (or day) changes. A step that starts
  // at 10 seconds or under (a short rest, say) should already read as
  // "ducked" from its very first tick, not wait a second for the interval
  // below to catch up — so this checks the starting value too, not just
  // the interval's own tick-by-tick countdown.
  useEffect(() => {
    const secs = step?.seconds ?? null
    setLeft(secs)
    setMusicDucked(secs != null && secs <= 10 && secs >= 1)
  }, [i, dayIdx, step?.seconds])

  // Persist live progress so the dashboard's workout ring reflects mid-session state.
  useEffect(() => {
    try {
      localStorage.setItem('luf_workout_progress', JSON.stringify({
        date: localTodayISO(), i, total: steps.length, done,
      }))
    } catch { /* ignore */ }
  }, [i, steps.length, done])

  // ONE interval per step — decrements each second, advances at zero. No churn.
  // Also drives the 10-second countdown beep + music duck (lib/countdown-beep.ts)
  // — same interval as the visible countdown, so the beep is always in sync
  // with what she's actually looking at, on both real exercise holds and
  // rest periods (both just have a `seconds` value, nothing rest-specific
  // needed here).
  useEffect(() => {
    if (!isTimed || paused || done) return
    const id = setInterval(() => {
      setLeft((l) => {
        if (l == null) return l
        const next = l <= 1 ? 0 : l - 1
        if (next >= 1 && next <= 10) { playCountdownBeep(next); setMusicDucked(true) }
        else setMusicDucked(false)
        if (l <= 1) { clearInterval(id); advanceRef.current(); return 0 }
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [i, dayIdx, paused, isTimed, done])

  // ---------- Finished ----------
  if (done) {
    return (
      <div className="max-w-lg mx-auto text-center q-in-fwd py-10">
        <Confetti fire={done} />
        <p className="text-6xl mb-4">🔥</p>
        <h1 className="text-3xl font-bold text-white mb-2">That&apos;s done{hasRealName ? `, ${firstName}` : ''}.</h1>
        <p className="text-ivory/60 text-sm mb-8">You showed up and you finished. That&apos;s the whole game. I logged it for your streak.</p>
        <EffortTap />
        <button onClick={() => { savedRef.current.finally(() => router.push('/plan')) }} className="luf-glow w-full bg-gold text-obsidian px-8 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl mt-6">Back to my week</button>
        <p className="text-gold text-sm font-semibold mt-4">— Coach Asa</p>
        <QuickFeedback category="workout" context={`${labels[dayIdx]} · day ${dayIdx + 1}`} dark reviewGate emphasize />
      </div>
    )
  }

  if (!step) return null
  const progress = Math.round(((i + 1) / steps.length) * 100)

  return (
    <div className="max-w-lg mx-auto flex flex-col min-h-[86vh]">
      {/* Header: today's session + day switcher + back to week */}
      <div className="flex items-center justify-between gap-3 mb-3">
        {/* Real gap found live (beta feedback Priority 10, 2026-08-25): this
            said "My week" but only ever went back to the dashboard — no real
            week view existed. Now points at an actual one (app/plan/workout/
            week), the direct proof that a saved preference change reshapes
            the whole week, not just today. */}
        <button onClick={() => router.push('/plan/workout/week')} className="text-ivory/50 hover:text-gold text-xs font-semibold">← My week</button>
        <button onClick={() => setSwitching((s) => !s)} className="text-center">
          <p className="text-gold text-[10px] font-semibold tracking-[0.2em] uppercase">
            {targetMinutes ? 'Shortened for today' : "Today's session"} · about {estimateWorkoutMinutes(steps)} min
            {/* Real, not cosmetic — reps/sets and cardio duration are now
                actually built for this goal (see lib/workout.ts's
                repScheme()), not just labeled with it. */}
            {(GOAL_LABEL as Record<string, string>)[program.goal] && ` · ${(GOAL_LABEL as Record<string, string>)[program.goal]}`}
          </p>
          <p className="text-white text-sm font-bold leading-tight">{labels[dayIdx]} <span className="text-ivory/40">▾</span></p>
        </button>
        <span className="text-ivory/50 text-xs tabular-nums w-10 text-right">{i + 1}/{steps.length}</span>
      </div>

      {/* Real progressive-overload callout — see applyProgressiveOverload in
          lib/workout.ts. Only ever appears once she's actually earned it. */}
      {program.progressionNote && (
        <p className="text-gold/90 text-xs font-medium text-center mb-3 -mt-1">{program.progressionNote}</p>
      )}

      {/* progress bar */}
      <div className="h-1.5 bg-charcoal rounded-full overflow-hidden mb-4">
        <div className="h-full bg-gold rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <WorkoutMusicPlayer duck={musicDucked} />

      {/* Day switcher sheet */}
      {switching && (
        <div className="mb-6 bg-charcoal border border-smoke rounded-2xl p-2 space-y-1">
          {labels.map((l, d) => (
            <button key={d} onClick={() => selectDay(d)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${d === dayIdx ? 'bg-gold/15 text-gold' : 'text-ivory/70 hover:bg-obsidian'}`}>
              {l}
            </button>
          ))}
        </div>
      )}

      <div key={`${dayIdx}-${i}`} className="q-in-fwd flex-1 flex flex-col">
        {/* Info + timer band — the countdown lives here now, not layered over
            the image, so a real photo and a running clock can both show at
            once instead of being an either/or (real gap that used to mean
            the image never rendered for ANY timed step, home track included,
            since every home exercise is timed). */}
        <div className={`rounded-t-3xl px-5 py-4 flex items-center justify-between border border-b-0 ${step.rest ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-gold/10 border-gold/30'}`}>
          <div>
            <p className={`text-xs font-semibold tracking-[0.2em] uppercase ${step.rest ? 'text-emerald-400' : 'text-gold'}`}>{step.phase}</p>
            <p className="text-ivory/50 text-xs font-medium mt-0.5 tabular-nums">Exercise {i + 1}/{steps.length}</p>
          </div>
          {isTimed && left != null && <p className="text-4xl font-bold text-white tabular-nums">{formatClock(left)}</p>}
        </div>

        {/* Main card — image, name, reps/sets (large font throughout, per spec) */}
        <div className="bg-charcoal border border-t-0 border-smoke rounded-b-3xl px-5 pt-6 pb-8 flex flex-col items-center text-center">
          {step.imageUrl ? (
            <div className="w-full max-w-sm aspect-[4/3] rounded-2xl overflow-hidden mb-5 bg-obsidian">
              <Image src={step.imageUrl} alt={step.name} width={480} height={360} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-full max-w-sm aspect-[4/3] rounded-2xl mb-5 bg-obsidian border border-gold/20 flex items-center justify-center">
              <DumbbellIcon />
            </div>
          )}

          <h1 className="text-4xl font-bold text-white mb-2 leading-tight text-balance">{step.name}</h1>
          {step.detail && <p className="text-gold text-2xl font-bold mb-3">{step.detail}</p>}
          {step.cue && <p className="text-ivory/60 text-sm max-w-sm leading-relaxed">{step.cue}</p>}
        </div>
      </div>

      {/* Transport controls — one big circular action in the center (pause/
          resume for a timed step, a checkmark to advance for a rep-based
          one), skip back/forward on either side. */}
      <div className="mt-6">
        <div className="flex items-center justify-center gap-6">
          <button onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0} aria-label="Previous step"
            className="w-14 h-14 rounded-full bg-charcoal border border-smoke text-ivory/60 disabled:opacity-30 flex items-center justify-center active:scale-95 transition-transform">
            <SkipBackIcon />
          </button>
          <button
            onClick={isTimed ? () => setPaused((p) => !p) : () => { hapticTap(); advanceRef.current() }}
            aria-label={isTimed ? (paused ? 'Resume' : 'Pause') : 'Done, next exercise'}
            className="luf-glow w-20 h-20 rounded-full bg-gold text-obsidian flex items-center justify-center active:scale-95 transition-transform">
            {isTimed ? (paused ? <PlayIcon /> : <PauseIcon />) : <CheckIcon />}
          </button>
          <button onClick={() => advanceRef.current()} aria-label="Skip to next step"
            className="w-14 h-14 rounded-full bg-charcoal border border-smoke text-ivory/60 flex items-center justify-center active:scale-95 transition-transform">
            <SkipForwardIcon />
          </button>
        </div>
        <p className="text-center text-ivory/40 text-xs mt-4">
          {i + 1 < steps.length
            ? <>Up next · <span className="text-ivory/70 font-medium">{steps[i + 1].name}</span></>
            : "Last one — you're almost done"}
        </p>
      </div>
    </div>
  )
}
