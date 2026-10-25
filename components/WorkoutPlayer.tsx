'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Confetti from '@/components/Confetti'
import QuickFeedback from '@/components/QuickFeedback'
import EffortTap from '@/components/EffortTap'
import SetEffortTap, { type Effort } from '@/components/SetEffortTap'
import QuickstartGoalAsk from '@/components/QuickstartGoalAsk'
import WorkoutMusicPlayer from '@/components/WorkoutMusicPlayer'
import { broadcastRefresh, localTodayISO } from '@/lib/useLiveRefresh'
import { buildSteps, dayLabels, estimateWorkoutMinutes, trimStepsToTarget, type WorkoutStep } from '@/lib/workout-steps'
import type { WorkoutProgram } from '@/lib/workout'
import { hapticTap } from '@/lib/haptics'
import { playCountdownBeep, unlockAudioContext } from '@/lib/countdown-beep'

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function PlayIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
}
function PauseIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>
}
function CheckIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M4 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

// Guided in-workout player. Opens straight into TODAY'S session (no picker
// screen); a compact switcher lets her change the day. One countdown interval
// per step (not recreated every second) so the timer runs smooth.
export default function WorkoutPlayer({ program, firstName, hasRealName = true, startDay = 0, targetMinutes, askQuickstartGoal = false, isGuest = false }: {
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
  // Quickstart-built plan whose goal hasn't been answered — may show ONE goal
  // question on a rest step (after the effort question, never over it).
  askQuickstartGoal?: boolean
  // Anonymous guest — finish screen offers "Save my plan" (/plan/save).
  isGuest?: boolean
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

  // Layer four (progression memory's real-time half) — a rest step is the
  // one place in this step sequence that always directly follows a real
  // working set (see lib/workout-steps.ts: 'Rest' only ever appears after
  // a superset or accessory exercise, never warm-up/abs/cardio). Shown
  // once per rest step, never re-triggered by stepping back/forward across
  // the same one — handledRestIdx tracks that per the CURRENT day only,
  // matching how `steps` itself resets on a day switch.
  const [showEffortTap, setShowEffortTap] = useState(false)
  const handledRestIdx = useRef<Set<number>>(new Set())
  // Real bug found live, 2026-09-21 (item 3b live test): this used to seed
  // its initial value from a sessionStorage flag, but that flag is scoped to
  // the browser TAB, not the signed-in account — a brand-new guest on the
  // same tab/device silently inherited a PREVIOUS guest's skip and never saw
  // the strip at all, even though `askQuickstartGoal` (computed server-side
  // per account in app/plan/workout/page.tsx) correctly said to show it for
  // them. The real answered/skipped state now lives server-side per account
  // (challenge_intake.form_data.quickstart_goal_answered — see
  // QuickstartGoalAsk.tsx and app/api/plan/quickstart-goal/route.ts), which
  // is exactly what `askQuickstartGoal` already reflects, so this only needs
  // to track "hidden for the rest of THIS page session" after she actually
  // answers/skips — never seeded from anything written by a different visit.
  const [goalHidden, setGoalHidden] = useState(false)
  const [saveHidden, setSaveHidden] = useState(false)

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
  const isLastStep = i + 1 >= steps.length

  // Keep advance current without re-arming the interval every render.
  const advanceRef = useRef<() => void>(() => {})
  advanceRef.current = () => { if (i + 1 >= steps.length) finish(); else setI(i + 1) }

  // Real bug found live, 2026-09-21 (item 3b live test): repeatedly tapping
  // ONLY the small skip-forward arrow (never the real check-mark on a rep
  // step, never waiting out a real timer) reached the end of the workout and
  // still fired finish() via advanceRef above — a workout that was never
  // actually done still logged a "finished" + streak. advanceRef.current()
  // (and its finish() call) now only ever runs from a REAL completion: the
  // check-mark tap on a rep step, or a timed step's own countdown reaching
  // zero (the interval below). This skip function is for the two manual
  // "skip ahead" controls (the arrow, and "Skip rest") — skipping to a LATER
  // step mid-workout is still fine, it just can never be what closes out the
  // LAST step; on the last step it does nothing, same as the disabled
  // skip-back arrow at step 1.
  function skipStep() {
    if (isLastStep) return
    hapticTap()
    setI(i + 1)
  }

  function selectDay(d: number) {
    setDayIdx(clamp(d)); setSteps(buildDay(clamp(d)))
    setI(0); setDone(false); setPaused(false); setSwitching(false)
    handledRestIdx.current = new Set()
  }
  // Real gap, beta feedback (Priority 12, 2026-08-25): "log a workout at the
  // gym" — no way to mark today done outside this guided flow, e.g. she
  // trained with a real coach at her actual gym instead of following the
  // on-screen player. Reuses finish()'s exact save/streak/celebration path
  // (same daily-log call, same "That's done" screen) — this is a second
  // real entry point into that path, not a second logging mechanism.
  // Two-tap arm (same pattern as FoodLog's delete confirm) since one tap
  // instantly completes today's session with no undo.
  const [confirmElsewhere, setConfirmElsewhere] = useState(false)
  const elsewhereTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  function tapElsewhere() {
    if (elsewhereTimerRef.current) clearTimeout(elsewhereTimerRef.current)
    if (confirmElsewhere) { setConfirmElsewhere(false); finish(); return }
    setConfirmElsewhere(true)
    elsewhereTimerRef.current = setTimeout(() => setConfirmElsewhere(false), 2500)
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

  // Surface the effort tap the instant a real working-set rest begins —
  // once per rest step, never again if she navigates back over it.
  useEffect(() => {
    if (step?.rest && i > 0 && !handledRestIdx.current.has(i)) setShowEffortTap(true)
    else setShowEffortTap(false)
  }, [i, dayIdx, step?.rest])

  function handleSetEffort(effort: Effort) {
    handledRestIdx.current.add(i)
    setShowEffortTap(false)
    const exerciseName = steps[i - 1]?.name
    // Immediate half — applied instantly, no dependency on the network
    // call below resolving. Mirrors lib/progression.ts's immediateAdjustment
    // exactly (kept in sync there; duplicated here only because that
    // module also does a DB write this component has no business doing).
    const restBumpSec = effort === 'hard' ? 20 : effort === 'easy' ? -10 : 0
    if (restBumpSec !== 0) setLeft((l) => (l == null ? l : Math.max(5, l + restBumpSec)))
    hapticTap()
    // Long-term half — logs the real set + updates her live progression
    // state (lib/progression.ts). Fire-and-forget: the immediate effect
    // above already happened; her rest timer never waits on this.
    if (exerciseName) {
      fetch('/api/plan/workout/set-effort', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseName, effort, setIndex: i }),
      }).catch(() => {})
    }
  }

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
  // Real gap found live, 2026-09-21: a rest step already runs on this timer
  // and moves on by itself, but the easy/difficult question (SetEffortTap)
  // is shown over the SAME rest — if she was still answering when the clock
  // hit zero the step changed and the question (and its progression signal)
  // was silently lost. So the countdown holds while that question is open
  // and unanswered; the moment she answers or dismisses it, the same
  // interval resumes. Nothing about the question itself changed.
  useEffect(() => {
    if (!isTimed || paused || done || showEffortTap) return
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
  }, [i, dayIdx, paused, isTimed, done, showEffortTap])

  // ---------- Look (2026-10-25, Asa: same simple feel as the new intake) ----------
  // Only the look changed below — every timer, save, effort and skip rule
  // above is exactly as it was.
  const INK = '#EDE7DA', GOLD = '#E5A93C', BG = '#021F16', MUTE = 'rgba(237,231,218,.72)'
  const HEAD = "var(--font-barlow), 'Barlow Condensed', sans-serif"
  const MONO = "var(--font-jbmono), 'JetBrains Mono', monospace"
  const pill = { fontFamily: MONO, fontWeight: 700, letterSpacing: '.1em' } as const

  // ---------- Finished ----------
  if (done) {
    return (
      <div className="max-w-md mx-auto text-center nf-screen pt-10 pb-6 flex flex-col items-center" style={{ color: INK }}>
        <Confetti fire={done} />
        <span className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: GOLD }}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={BG} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12l5 5 9-10" /></svg>
        </span>
        <h1 className="nf-head" style={{ margin: 0, fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 58, lineHeight: 0.88, textTransform: 'uppercase' }}>That&apos;s done{hasRealName ? `, ${firstName}` : ''}.</h1>
        <p className="text-[15px] mt-3 mb-7" style={{ color: MUTE }}>You showed up and you finished. That&apos;s the whole game. It&apos;s logged for your streak.</p>
        <EffortTap />
        {isGuest && !saveHidden && (
          <div className="w-full mt-6 rounded-[22px] px-5 py-5" style={{ background: 'rgba(229,169,60,.12)', border: '1px solid rgba(229,169,60,.4)' }}>
            <p className="text-base font-bold">You did it. Tomorrow&apos;s is made for you.</p>
            <p className="text-sm mt-1 mb-4" style={{ color: MUTE }}>Keep your plan and progress? One tap.</p>
            <a href="/plan/save" className="nf-press flex items-center justify-center w-full h-14 rounded-full uppercase" style={{ ...pill, background: GOLD, color: BG, fontSize: 15 }}>Save my plan</a>
            <button onClick={() => setSaveHidden(true)} className="mt-3 text-xs underline underline-offset-4" style={{ color: 'rgba(237,231,218,.5)' }}>Not now</button>
          </div>
        )}
        <button onClick={() => { savedRef.current.finally(() => router.push('/plan')) }} className="nf-press w-full h-16 rounded-full mt-6 uppercase" style={{ ...pill, background: GOLD, color: BG, fontSize: 16 }}>Home</button>
        <QuickFeedback category="workout" context={`${labels[dayIdx]} · day ${dayIdx + 1}`} dark reviewGate emphasize />
      </div>
    )
  }

  if (!step) return null
  const progress = Math.round(((i + 1) / steps.length) * 100)
  const segmented = steps.length <= 20
  const nameSize = step.name.length > 28 ? 40 : step.name.length > 18 ? 50 : 60

  return (
    <div className="max-w-md mx-auto flex flex-col min-h-[100dvh] relative" style={{ color: INK, fontFamily: "var(--font-inter), Inter, system-ui, sans-serif" }}>
      {/* Photo — full width at the top; warm-up / rest / no-photo steps get a calm panel instead */}
      <div key={`ph-${dayIdx}-${i}`} className="nf-screen relative -mx-4 h-[46vh] min-h-[300px] overflow-hidden" style={{ background: step.rest ? 'linear-gradient(160deg, #0B3B2B, #021F16)' : '#0B2E22' }}>
        {step.imageUrl ? (
          <Image src={step.imageUrl} alt={step.name} fill sizes="(max-width: 480px) 100vw, 480px" className="object-cover" priority />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 96, textTransform: 'uppercase', color: 'rgba(237,231,218,.08)' }}>{step.rest ? 'Breathe' : step.phase}</span>
          </div>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(2,31,22,.65) 0%, rgba(2,31,22,0) 22%, rgba(2,31,22,0) 55%, #021F16 100%)' }} />
      </div>

      {/* Top bar over the photo */}
      <div className="absolute inset-x-0 top-0 flex flex-col gap-2.5" style={{ paddingTop: 'calc(4px + env(safe-area-inset-top))' }}>
        {segmented ? (
          <div className="flex gap-1">
            {steps.map((_, k) => <span key={k} className="flex-1 h-1 rounded-full" style={{ background: k < i ? GOLD : k === i ? INK : 'rgba(237,231,218,.25)' }} />)}
          </div>
        ) : (
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(237,231,218,.25)' }}>
            <div className="h-1 rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: GOLD }} />
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => { savedRef.current.finally(() => router.push('/plan')) }} aria-label="Close workout, go home" className="nf-press w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(2,31,22,.65)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          <button onClick={() => setSwitching((x) => !x)} className="nf-press min-w-0 rounded-full px-3 py-2 text-[12px] font-semibold truncate" style={{ background: 'rgba(2,31,22,.65)' }}>
            {labels[dayIdx].replace(/^Day \d+:\s*/, '')} · {estimateWorkoutMinutes(steps)} min ▾
          </button>
          <span className="rounded-full px-3 py-2 shrink-0" style={{ ...pill, fontSize: 12, background: INK, color: BG }}>{i + 1} OF {steps.length}</span>
        </div>
        {switching && (
          <div className="rounded-[20px] p-2 flex flex-col gap-1" style={{ background: 'rgba(2,31,22,.92)', border: '1px solid rgba(237,231,218,.14)' }}>
            {labels.map((l, d) => (
              <button key={d} onClick={() => selectDay(d)} className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: d === dayIdx ? 'rgba(229,169,60,.15)' : 'transparent', color: d === dayIdx ? GOLD : 'rgba(237,231,218,.8)' }}>{l}</button>
            ))}
          </div>
        )}
      </div>

      <div key={`${dayIdx}-${i}`} className="relative nf-screen flex-1 flex flex-col gap-2.5 -mt-16 px-1">
        {showEffortTap && steps[i - 1] && (
          <SetEffortTap
            exerciseName={steps[i - 1].name}
            onPick={handleSetEffort}
            onDismiss={() => { handledRestIdx.current.add(i); setShowEffortTap(false) }}
          />
        )}
        <span style={{ ...pill, fontSize: 12, letterSpacing: '.16em', color: step.rest ? '#9FDCC4' : GOLD }}>{step.phase.toUpperCase()}{program.progressionNote && !step.rest ? ' · LEVELED UP' : ''}</span>
        <h1 className="nf-head text-balance" style={{ margin: 0, fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: nameSize, lineHeight: 0.88, textTransform: 'uppercase' }}>{step.name}</h1>
        <div className="flex items-baseline gap-3 flex-wrap">
          {isTimed && left != null ? (
            <span className="tabular-nums" style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 64, lineHeight: 1, color: GOLD }}>{formatClock(left)}</span>
          ) : step.detail ? (
            <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 46, lineHeight: 1, color: GOLD, textTransform: 'uppercase' }}>{step.detail}</span>
          ) : null}
          {isTimed && step.detail && <span className="text-[15px] font-semibold" style={{ color: MUTE }}>{step.detail}</span>}
        </div>
        {step.cue && <p className="text-[15px] leading-relaxed" style={{ color: MUTE }}>{step.cue}</p>}
        {program.progressionNote && i === 0 && <p className="text-[13px]" style={{ color: GOLD }}>{program.progressionNote}</p>}
      </div>

      {/* Controls — one big gold button, two small ones */}
      <div className="mt-5 flex flex-col gap-2.5 pb-2">
        <WorkoutMusicPlayer duck={musicDucked} />
        {step.rest ? (
          <button onClick={skipStep} disabled={showEffortTap || isLastStep} className="nf-press w-full h-16 rounded-full uppercase disabled:opacity-40"
            style={{ ...pill, fontSize: 16, background: '#9FDCC4', color: BG }}>Skip rest</button>
        ) : (
          <button
            onClick={isTimed ? () => setPaused((x) => !x) : () => { hapticTap(); advanceRef.current() }}
            aria-label={isTimed ? (paused ? 'Resume' : 'Pause') : 'Done, next exercise'}
            className="nf-press w-full h-16 rounded-full uppercase flex items-center justify-center gap-2.5"
            style={{ ...pill, fontSize: 17, letterSpacing: '.12em', background: GOLD, color: BG }}>
            {isTimed ? (paused ? <><PlayIcon /> Resume</> : <><PauseIcon /> Pause</>) : <><CheckIcon /> {isLastStep ? 'Finish' : 'Done · next'}</>}
          </button>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          <button onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0} className="nf-press h-12 rounded-full uppercase disabled:opacity-30"
            style={{ ...pill, fontSize: 13, border: '2px solid rgba(237,231,218,.22)', color: INK }}>Back</button>
          {step.rest && isTimed ? (
            <button onClick={() => setPaused((x) => !x)} className="nf-press h-12 rounded-full uppercase" style={{ ...pill, fontSize: 13, border: '2px solid rgba(237,231,218,.22)', color: INK }}>{paused ? 'Resume' : 'Pause'}</button>
          ) : (
            <button onClick={skipStep} disabled={isLastStep} className="nf-press h-12 rounded-full uppercase disabled:opacity-30" style={{ ...pill, fontSize: 13, border: '2px solid rgba(237,231,218,.22)', color: INK }}>Skip</button>
          )}
        </div>
        {askQuickstartGoal && !goalHidden && step.rest && !showEffortTap && handledRestIdx.current.has(i) && (
          <QuickstartGoalAsk onDone={() => setGoalHidden(true)} onSkip={() => setGoalHidden(true)} />
        )}
        <p className="text-center text-[13px] mt-1" style={{ color: 'rgba(237,231,218,.55)' }}>
          {i + 1 < steps.length ? <>Next: <span style={{ color: 'rgba(237,231,218,.85)' }}>{steps[i + 1].name}</span></> : "Last one. You're almost done."}
        </p>
        <div className="flex items-center justify-center gap-3 text-xs mt-1" style={{ color: 'rgba(237,231,218,.5)' }}>
          <button onClick={() => router.push('/plan/workout/week')} className="underline underline-offset-4">My week</button>
          <span>·</span>
          <button onClick={tapElsewhere} className="underline underline-offset-4" style={{ color: confirmElsewhere ? GOLD : undefined }}>{confirmElsewhere ? 'Tap again to confirm' : 'Trained elsewhere?'}</button>
        </div>
      </div>
    </div>
  )
}
