'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Ring from '@/components/Ring'
import Confetti from '@/components/Confetti'
import QuickFeedback from '@/components/QuickFeedback'
import EffortTap from '@/components/EffortTap'
import { broadcastRefresh, localTodayISO } from '@/lib/useLiveRefresh'
import { buildSteps, dayLabels, estimateWorkoutMinutes, trimStepsToTarget, type WorkoutStep } from '@/lib/workout-steps'
import { GOAL_LABEL, type WorkoutProgram } from '@/lib/workout'
import { hapticTap } from '@/lib/haptics'

// Guided in-workout player. Opens straight into TODAY'S session (no picker
// screen); a compact switcher lets her change the day. One countdown interval
// per step (not recreated every second) so the timer runs smooth.
export default function WorkoutPlayer({ program, firstName, startDay = 0, targetMinutes }: {
  program: WorkoutProgram
  firstName: string
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

  // Reset the countdown when the step (or day) changes.
  useEffect(() => { setLeft(step?.seconds ?? null) }, [i, dayIdx, step?.seconds])

  // Persist live progress so the dashboard's workout ring reflects mid-session state.
  useEffect(() => {
    try {
      localStorage.setItem('luf_workout_progress', JSON.stringify({
        date: localTodayISO(), i, total: steps.length, done,
      }))
    } catch { /* ignore */ }
  }, [i, steps.length, done])

  // ONE interval per step — decrements each second, advances at zero. No churn.
  useEffect(() => {
    if (!isTimed || paused || done) return
    const id = setInterval(() => {
      setLeft((l) => {
        if (l == null) return l
        if (l <= 1) { clearInterval(id); advanceRef.current(); return 0 }
        return l - 1
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
        <h1 className="text-3xl font-bold text-white mb-2">That&apos;s done, {firstName}.</h1>
        <p className="text-ivory/60 text-sm mb-8">You showed up and you finished. That&apos;s the whole game. I logged it for your streak.</p>
        <EffortTap />
        <button onClick={() => { savedRef.current.finally(() => router.push('/plan')) }} className="luf-glow w-full bg-gold text-obsidian px-8 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl mt-6">Back to my week</button>
        <p className="text-gold text-sm font-semibold mt-4">— Coach Asa</p>
        <QuickFeedback category="workout" context={`${labels[dayIdx]} · day ${dayIdx + 1}`} dark reviewGate emphasize />
      </div>
    )
  }

  if (!step) return null
  const pct = isTimed && left != null ? (left / step.seconds!) * 100 : 0
  const progress = Math.round(((i + 1) / steps.length) * 100)

  return (
    <div className="max-w-lg mx-auto flex flex-col min-h-[86vh]">
      {/* Header: today's session + day switcher + back to week */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <button onClick={() => router.push('/plan')} className="text-ivory/50 hover:text-gold text-xs font-semibold">← My week</button>
        <button onClick={() => setSwitching((s) => !s)} className="text-center">
          <p className="text-gold text-[10px] font-semibold tracking-[0.2em] uppercase">
            {targetMinutes ? '⚡ Shortened for today' : "Today's session"} · about {estimateWorkoutMinutes(steps)} min
            {/* Real, not cosmetic — reps/sets and cardio duration are now
                actually built for this goal (see lib/workout.ts's
                repScheme()), not just labeled with it. */}
            {(GOAL_LABEL as Record<string, string>)[program.goal] && ` · ${(GOAL_LABEL as Record<string, string>)[program.goal]}`}
          </p>
          <p className="text-white text-sm font-bold leading-tight">{labels[dayIdx]} <span className="text-ivory/40">▾</span></p>
        </button>
        <span className="text-ivory/50 text-xs tabular-nums w-10 text-right">{i + 1}/{steps.length}</span>
      </div>

      {/* progress bar */}
      <div className="h-1.5 bg-charcoal rounded-full overflow-hidden mb-8">
        <div className="h-full bg-gold rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

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

      <div key={`${dayIdx}-${i}`} className="q-in-fwd flex-1 flex flex-col items-center justify-center text-center">
        <p className={`text-xs font-semibold tracking-[0.2em] uppercase mb-5 ${step.rest ? 'text-green-400' : 'text-gold'}`}>{step.phase}</p>

        {isTimed ? (
          <Ring pct={pct} size={200} stroke={10} color={step.rest ? '#46c46f' : '#f5a623'} track="rgba(255,255,255,0.08)" animateOnMount={false}>
            <div>
              <p className="text-5xl font-bold text-white tabular-nums">{left}</p>
              <p className="text-ivory/50 text-xs uppercase tracking-wider">seconds</p>
            </div>
          </Ring>
        ) : step.imageUrl ? (
          <div className="w-[200px] h-[200px] rounded-full border-2 border-gold/20 overflow-hidden mb-2">
            <Image src={step.imageUrl} alt={step.name} width={200} height={200} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-[200px] h-[200px] rounded-full border-2 border-gold/20 flex items-center justify-center mb-2"><span className="text-6xl">🏋🏽</span></div>
        )}

        <h1 className="text-3xl font-bold text-white mt-7 mb-1 leading-tight text-balance">{step.name}</h1>
        {step.detail && <p className="text-gold font-semibold mb-3">{step.detail}</p>}
        {step.cue && <p className="text-ivory/60 text-sm max-w-sm leading-relaxed">{step.cue}</p>}
      </div>

      {/* controls */}
      <div className="mt-8">
        <div className="flex gap-3">
          <button onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0} className="px-5 py-4 rounded-2xl bg-charcoal border border-smoke text-ivory/60 disabled:opacity-30 active:scale-95 transition-transform">←</button>
          {isTimed ? (
            <button onClick={() => setPaused((p) => !p)} className="flex-1 bg-charcoal border border-gold/40 text-gold px-6 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl active:scale-[.98] transition-transform">{paused ? 'Resume' : 'Pause'}</button>
          ) : (
            <button onClick={() => { hapticTap(); advanceRef.current() }} className="luf-glow flex-1 bg-gold text-obsidian px-6 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl active:scale-[.98] transition-transform">Done — Next →</button>
          )}
          <button onClick={() => advanceRef.current()} className="px-5 py-4 rounded-2xl bg-charcoal border border-smoke text-ivory/60 active:scale-95 transition-transform">→</button>
        </div>
        {isTimed && <button onClick={() => advanceRef.current()} className="w-full text-center text-ivory/50 text-xs mt-3 hover:text-gold">Skip →</button>}
      </div>
    </div>
  )
}
