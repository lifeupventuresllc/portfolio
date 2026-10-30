'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Confetti from '@/components/Confetti'
import QuickFeedback from '@/components/QuickFeedback'
import EffortTap from '@/components/EffortTap'
import QuickstartGoalAsk from '@/components/QuickstartGoalAsk'
import WorkoutMusicPlayer from '@/components/WorkoutMusicPlayer'
import RewardDrop from '@/components/RewardDrop'
import WorkoutFlow from '@/components/WorkoutFlow'
import { buildBlocks, trimBlocksToTarget } from '@/lib/workout-blocks'
import { broadcastRefresh, localTodayISO } from '@/lib/useLiveRefresh'
import { dayLabels } from '@/lib/workout-steps'
import type { WorkoutProgram } from '@/lib/workout'
import { hapticTap } from '@/lib/haptics'
import { unlockAudioContext } from '@/lib/countdown-beep'

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
  const [dayIdx, setDayIdx] = useState(clamp(startDay))
  const [done, setDone] = useState(false)
  // Asked at most once, after an Easy/Hard tap (never over it).
  const [goalHidden, setGoalHidden] = useState(false)
  const [showGoal, setShowGoal] = useState(false)
  const [saveHidden, setSaveHidden] = useState(false)
  const musicDucked = false
  // 2026-10-29: the day as screens — one exercise (or two back to back) each.
  const blocks = (() => { const b = buildBlocks(program, dayIdx); return targetMinutes ? trimBlocksToTarget(b, targetMinutes) : b })()
  const total = blocks.length

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

  function selectDay(d: number) {
    setDayIdx(clamp(d)); setDone(false)
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
      localStorage.setItem('luf_workout_progress', JSON.stringify({ date: today, i: total, total, done: true }))
      // Pre-mark today's workout celebration so the dashboard shows ✅ without re-confetti.
      localStorage.setItem('luf_celebrated_workout-' + today, '1')
    } catch { /* ignore */ }
    savedRef.current = fetch('/api/plan/daily', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workout: true }) })
      .catch(() => {})
      .finally(() => broadcastRefresh())
  }

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
        {/* Done gets its own color (rewards-plan.md §4): an emerald check
            that pops once, so gold stays "go". */}
        <span className="rw-check w-[72px] h-[72px] rounded-full flex items-center justify-center mb-5">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={BG} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12l5 5 9-10" /></svg>
        </span>
        <h1 className="nf-head" style={{ margin: 0, fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 58, lineHeight: 0.88, textTransform: 'uppercase' }}>That&apos;s done{hasRealName ? `, ${firstName}` : ''}.</h1>
        <p className="text-[15px] mt-3 mb-5" style={{ color: MUTE }}>You showed up and you finished. That&apos;s the whole game.</p>
        {/* Reward Drop (rewards-plan.md phase 2): rolled on the server only
            after this workout's save lands — the reward is always on the
            other side of the action. */}
        <RewardDrop saved={savedRef.current} />
        <div className="w-full mt-6"><EffortTap /></div>
        {isGuest && !saveHidden && (
          <div className="w-full mt-6 rounded-[22px] px-5 py-5" style={{ background: 'rgba(229,169,60,.12)', border: '1px solid rgba(229,169,60,.4)' }}>
            <p className="text-base font-bold">You did it. Tomorrow&apos;s is made for you.</p>
            <p className="text-sm mt-1 mb-4" style={{ color: MUTE }}>Keep your plan and progress? One tap.</p>
            <a href="/plan/save" className="nf-press flex items-center justify-center w-full h-14 rounded-full uppercase" style={{ ...pill, background: GOLD, color: BG, fontSize: 15 }}>Save my plan</a>
            <button onClick={() => setSaveHidden(true)} className="mt-3 text-xs underline underline-offset-4" style={{ color: 'rgba(237,231,218,.5)' }}>Not now</button>
          </div>
        )}
        <button onClick={() => { savedRef.current.finally(() => router.push('/plan')) }} className="rw-cta nf-press w-full h-16 rounded-full mt-6 uppercase" style={{ ...pill, background: GOLD, color: BG, fontSize: 16 }}>Home</button>
        <QuickFeedback category="workout" context={`${labels[dayIdx]} · day ${dayIdx + 1}`} dark reviewGate emphasize />
      </div>
    )
  }

  const elsewhere = (
    <>
      <span style={{ ...pill, fontSize: 11, color: MUTE }}>TODAY</span>
      <div className="flex flex-col gap-1">
        {labels.map((l, d) => (
          <button key={d} onClick={() => selectDay(d)} className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: d === dayIdx ? 'rgba(229,169,60,.15)' : 'transparent', color: d === dayIdx ? GOLD : 'rgba(237,231,218,.8)' }}>{l}</button>
        ))}
      </div>
      <div className="flex items-center justify-center gap-3 text-xs pt-1" style={{ color: 'rgba(237,231,218,.6)' }}>
        <button onClick={() => router.push('/plan/workout/week')} className="underline underline-offset-4">My week</button>
        <span>·</span>
        <a href="/plan/coach" className="underline underline-offset-4">Training somewhere different? Tell Coach</a>
        <span>·</span>
        <button onClick={tapElsewhere} className="underline underline-offset-4" style={{ color: confirmElsewhere ? GOLD : undefined }}>{confirmElsewhere ? 'Tap again to confirm' : 'Trained elsewhere?'}</button>
      </div>
    </>
  )

  // 2026-10-29 (Asa's workout-screen spec): one exercise per screen, sets as
  // circles, one Done button (components/WorkoutFlow.tsx). Saving, streak,
  // rewards and the finish screen above are unchanged.
  return (
    <>
      <WorkoutFlow
        key={dayIdx}
        blocks={blocks}
        onFinish={finish}
        onEffort={(names, effort, setIndex) => {
          for (const exerciseName of names) {
            fetch('/api/plan/workout/set-effort', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ exerciseName, effort, setIndex }),
            }).catch(() => {})
          }
          if (askQuickstartGoal && !goalHidden) setShowGoal(true)
        }}
        onProgress={(doneEx, total) => {
          try { localStorage.setItem('luf_workout_progress', JSON.stringify({ date: localTodayISO(), i: doneEx, total, done: false })) } catch { /* ignore */ }
        }}
        onClose={() => { savedRef.current.finally(() => router.push('/plan')) }}
        menu={elsewhere}
      />
      {/* Music: one small pill, top right under the menu button, through
          every screen of the workout (stays mounted, so songs don't restart). */}
      <div className="fixed z-30" style={{ top: 'calc(66px + env(safe-area-inset-top))', right: 16 }}>
        <WorkoutMusicPlayer duck={musicDucked} compact />
      </div>
      {showGoal && !goalHidden && (
        <div className="fixed inset-x-4 z-40" style={{ bottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
          <QuickstartGoalAsk onDone={() => setGoalHidden(true)} onSkip={() => setGoalHidden(true)} />
        </div>
      )}
    </>
  )
}
