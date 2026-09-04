'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { hapticTap } from '@/lib/haptics'
import DeepgramVoiceInput from '@/components/DeepgramVoiceInput'
import { SHOW_CALORIE_COUNTER } from '@/lib/feature-flags'
import { useLiveRefresh, broadcastRefresh } from '@/lib/useLiveRefresh'

// Prompt 1's "Next Action" — the single-instruction circle, now the
// dashboard's primary surface (Asa's call, 2026-08-25: "this is the new
// dashboard"). No categories are ever shown (never a "workout" vs "meal"
// label), just the one thing to do right now. Prompt 3's expansion routing
// lives here too: tapping the instruction (not the buttons) opens the
// supporting screen the engine already decided on — never a menu.
type ActionKind = 'workout' | 'meal' | 'fallback' | 'location' | 'complete'
type NextAction = {
  logId: string; kind: ActionKind; actionKey: string; instruction: string; score: number
  restaurant?: string; mealSlot?: string
  // Reward system (2026-08-28 refinement) — used to be silently woven into
  // `instruction` itself, by original design. Asa reversed that after
  // seeing it live and not noticing anything had happened: these now drive
  // a real, visible celebration instead (see maybeCelebrate below).
  isReward?: boolean; rewardLabel?: string
}

// Real gap found live, 2026-09-01 (Asa's report): this box used to POST
// only to /api/plan/next-action's `action:'message'` handler, which
// understands a narrow hand of signals (energy/minutes/day-changed/eating-
// out) and NOTHING else — no location, no workout style, no focus area, no
// injuries. "I'm at a hotel, build me a cardio workout for 15 minutes" had
// no recognized signal beyond the minutes number, so it silently produced
// nothing she could see. The full operator engine (/api/plan/operator,
// already powering /plan/coach and just fixed for its own location/injury-
// gate loop) is the one place that actually understands all of that — same
// engine, same real gate questions, same approve/decline flow. Routes
// through it now instead of duplicating a second, weaker parser.
type ChatTurn = { role: 'user' | 'operator'; content: string }
type WorkoutChange = { toMinutes?: number; swapTo?: string; reason?: string; injuryBodyPart?: string; trackOverride?: 'gym' | 'home'; contentSwap?: 'cardio'; focusOverride?: ('core' | 'legs' | 'arms' | 'chest' | 'back' | 'shoulders')[] }
type NutritionChange = { calorieDelta?: number; dinnerSuggestion?: string; reason?: string; eatingOut?: boolean }
type PendingAdjustment = { id: string | null; workoutChange?: WorkoutChange; nutritionChange?: NutritionChange }

function joinAreas(areas: string[]): string {
  if (areas.length <= 1) return areas[0] || ''
  if (areas.length === 2) return `${areas[0]} and ${areas[1]}`
  return `${areas.slice(0, -1).join(', ')}, and ${areas[areas.length - 1]}`
}
function adjLines(a: PendingAdjustment): string[] {
  const out: string[] = []
  const w = a.workoutChange, n = a.nutritionChange
  if (w?.injuryBodyPart) out.push(`Workout → swapped to protect your ${w.injuryBodyPart.replace('_', ' ')}, from now on`)
  // Same gap as CoachHero.tsx/OperatorChat.tsx: contentSwap is the thing she
  // actually asked for ("hiit cardio at home"), so it wins the headline;
  // trackOverride still rides along in the same line when both are set.
  else if (w?.contentSwap === 'cardio') out.push(`Workout → cardio & conditioning session${w.trackOverride ? ` at ${w.trackOverride === 'home' ? 'home' : 'the gym'}` : ''} today`)
  else if (w?.trackOverride) out.push(`Workout → swapped to a ${w.trackOverride === 'home' ? 'bodyweight home' : 'gym'} session${w.toMinutes ? `, ${w.toMinutes} min` : ''}`)
  else if (w?.focusOverride?.length) out.push(`Workout → focused on ${joinAreas(w.focusOverride)} today`)
  else if (w?.toMinutes) out.push(`Workout → ${w.toMinutes}-min ${w.swapTo || 'session'}`)
  else if (w?.reason) out.push(`Workout → re-slotted (${w.reason})`)
  if (w?.focusOverride?.length && w?.trackOverride) out.push(`Focus → ${joinAreas(w.focusOverride)} today`)
  if (n?.dinnerSuggestion) out.push(`Nutrition → ${n.dinnerSuggestion}`)
  if (n?.calorieDelta) out.push(`Calories → ${n.calorieDelta > 0 ? '+' : ''}${n.calorieDelta}`)
  return out
}

// The ONE destination per kind — fully determined by what the engine
// decided, never a choice presented to her (prompt 3's core rule). Fallback
// actions have nothing to expand into; tapping does nothing.
const EXPANSION_ROUTE: Partial<Record<ActionKind, string>> = {
  workout: '/plan/workout',
  // Hidden from testers for now (Asa's ask, 2026-08-30) — /plan/nutrition
  // itself redirects away while this is off, so a meal instruction has
  // nowhere real to send her; same "nothing to expand into" treatment
  // fallback/complete kinds already get.
  ...(SHOW_CALORIE_COUNTER ? { meal: '/plan/nutrition' } : {}),
  location: '/plan/eating-out',
}

// "Keep it simple" (renamed from "My day changed," Asa's ask, 2026-08-27 —
// the old label read as "give me a different workout," not "give me one
// simplified thing, whatever kind it is") shows one of these inside the
// circle, above the real instruction, right after she taps it — softens the
// disruption moment instead of just silently swapping the text. Rotates so
// regular use doesn't repeat the same line every time; purely decorative
// (never sent to the server, never affects scoring).
const ENCOURAGEMENTS = [
  'One small step still counts, love.',
  "You showed up — that's enough today.",
  'Be gentle with yourself right now.',
  'This still moves you forward.',
  'No pressure — just this one thing.',
  "Progress doesn't have to be big.",
]

export default function NextActionCard({ variant = 'full', hasPlan = true }: { variant?: 'full' | 'dock'; hasPlan?: boolean }) {
  const router = useRouter()
  const [action, setAction] = useState<NextAction | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [message, setMessage] = useState('')
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [quickReplies, setQuickReplies] = useState<string[] | null>(null)
  const [pendingAdjustment, setPendingAdjustment] = useState<PendingAdjustment | null>(null)
  // A real "take me there" link right in the chat reply the instant she
  // approves — Asa's explicit ask, 2026-09-01: "the chat box should be able
  // to generate whatever they just came up with... right there in front of
  // them... just like the Coach box does." Matches OperatorChat.tsx's own
  // justApproved exactly (same copy, same routing) rather than leaving her
  // to notice the circle above changed on its own.
  const [justApproved, setJustApproved] = useState<PendingAdjustment | null>(null)
  // Real gap found live, 2026-09-04 (Asa's report): unlike CoachHero.tsx, a
  // cold-start build here (planBuilt) only ever produced a plain text reply
  // describing what got built — no clickable "go see it" card, so she had
  // to type something else just to get anywhere. Same justBuilt pattern
  // CoachHero.tsx already has, ported here so this card behaves the same
  // way for the one thing most anonymous/new visitors actually do first.
  const [justBuilt, setJustBuilt] = useState<{ workout: boolean; nutrition: boolean } | null>(null)
  const [encouragement, setEncouragement] = useState<string | null>(null)
  const [celebration, setCelebration] = useState<string | null>(null)
  // Guards against re-showing the same reward's celebration every time this
  // same still-open row gets re-fetched (a fresh page load, "Keep it
  // simple" refetching after a failed request, etc.) — celebrate once per
  // distinct logId, not once per render.
  const celebratedRef = useRef<Set<string>>(new Set())
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  // Real gap Asa caught live, 2026-09-02: unlike OperatorChat.tsx/
  // CoachHero.tsx (both already auto-scroll), this transcript never did —
  // she had to scroll down herself to see a new reply. Replies arrive
  // whole, not token-streamed, so one instant snap per new turn is enough:
  // no smooth-scroll fighting a still-arriving stream, no repeated
  // re-triggers to glitch over. Two anchors, one for each transcript
  // (compact dock + expanded "Ask your coach" card) — only whichever is
  // actually mounted ever has a non-null ref, so this is a safe no-op for
  // the other.
  const turnsEndRef = useRef<HTMLDivElement>(null)
  const turnsEndRef2 = useRef<HTMLDivElement>(null)
  useEffect(() => {
    turnsEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' })
    turnsEndRef2.current?.scrollIntoView({ behavior: 'auto', block: 'end' })
  }, [turns.length, justBuilt])

  // Real, visible celebration (2026-08-28, Asa's direct call) — the reward
  // used to be silently woven into the instruction text, by original
  // design, specifically so it was never a distinct moment. Asa saw it live
  // and didn't notice anything had happened, and wants the opposite: an
  // unmissable one. Auto-dismisses so it never blocks the actual task.
  const maybeCelebrate = (a: NextAction) => {
    if (a.isReward && a.rewardLabel && !celebratedRef.current.has(a.logId)) {
      celebratedRef.current.add(a.logId)
      setCelebration(a.rewardLabel)
    }
  }
  useEffect(() => {
    if (!celebration) return
    const t = setTimeout(() => setCelebration(null), 6000)
    return () => clearTimeout(t)
  }, [celebration])

  // Auto-grow the transcript box to fit whatever's in it — a long voice
  // transcript (or a long typed message) must stay fully visible, never
  // clipped or side-scrolling in a fixed-height field, same as any normal
  // AI chat box (Asa's ask, 2026-08-26). Re-runs on every change, including
  // the live interim-transcript updates while she's still talking.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [message])

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/plan/next-action')
      if (res.ok) {
        const a = await res.json()
        setAction(a)
        maybeCelebrate(a)
      }
      setEncouragement(null)
    } finally {
      setLoading(false)
    }
  }

  // Real gap found live, 2026-09-01: this only ever ran once on mount, so
  // approving a change over on the full Coach chat page never reached the
  // dashboard circle without a hard reload — every other live card on this
  // app (WorkoutStatusCard, CoachHero, CaloriesTodayCard, StreakChip, ...)
  // already refetches on focus/visibility/broadcastRefresh() via this same
  // hook; this one had simply never been wired up to it.
  useLiveRefresh(load)

  const markDone = async () => {
    if (!action || busy) return
    hapticTap()
    setBusy(true)
    setDone(true)
    try {
      // Real gap found live, 2026-09-03 (Asa's report: "not showing up"):
      // on a fast connection, the fetch + load() below could resolve in
      // well under 200ms — the instruction swapped to the next thing
      // almost instantly, so the gold fill/pop had no real moment to
      // register before her eye moved on. minDelay guarantees the "done"
      // state holds for a real beat no matter how fast the network is.
      const minDelay = new Promise((resolve) => setTimeout(resolve, 700))
      await Promise.all([
        fetch('/api/plan/next-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ logId: action.logId, action: 'done' }) }),
        minDelay,
      ])
      await load()
    } finally {
      setDone(false)
      setBusy(false)
    }
  }

  const dayChanged = async () => {
    if (!action || busy) return
    hapticTap()
    setBusy(true)
    try {
      const res = await fetch('/api/plan/next-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ logId: action.logId, action: 'day_changed' }) })
      if (res.ok) {
        const a = await res.json()
        setAction(a)
        maybeCelebrate(a)
        // Purely decorative, softens the disruption moment — never sent
        // anywhere, never affects what the engine actually picked.
        setEncouragement(ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)])
      } else {
        // Real bug caught live, 2026-08-26: a stale logId (already resolved
        // elsewhere — another tab, a real day-boundary auto-supersede, a
        // race) made this a silent no-op forever, with zero visible feedback,
        // until a manual page reload. Refetch the real current action
        // instead of leaving the tap looking like it did nothing.
        await load()
      }
    } finally {
      setBusy(false)
    }
  }

  // Shared by expand() (tapping the circle) and sendMessage/onVoiceFinal
  // below (2026-08-27, Asa's ask: "do everything from the circle," no new
  // buttons) — a location result is unambiguous, there's nothing else she'd
  // want to do with it besides see the real order, so telling the circle
  // "I'm eating out" now jumps straight to the picks screen on its own,
  // cutting the extra "now tap the circle" step out of that one flow
  // entirely without adding any new UI surface.
  const goToExpansion = (a: NextAction) => {
    const dest = EXPANSION_ROUTE[a.kind]
    if (!dest) return
    if (a.kind === 'location' && (a.restaurant || a.mealSlot)) {
      const params = new URLSearchParams()
      if (a.restaurant) params.set('restaurant', a.restaurant)
      if (a.mealSlot) params.set('slot', a.mealSlot)
      router.push(`${dest}?${params.toString()}`)
      return
    }
    router.push(dest)
  }

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? message).trim()
    if (busy || !text) return
    setBusy(true)
    setQuickReplies(null)
    setPendingAdjustment(null)
    setJustApproved(null)
    setJustBuilt(null)
    // Real, visible echo of what she actually sent — the old version had no
    // transcript at all, just a single note line that silently overwrote
    // itself, so sending something real read as "did nothing" even when it
    // worked. Every normal chat (this app's own /plan/coach included) shows
    // her own message back to her; this now does too.
    setTurns((t) => [...t, { role: 'user', content: text }])
    setMessage('')
    try {
      const res = await fetch('/api/plan/operator', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text }) })
      const json = await res.json().catch(() => null)
      if (!json) {
        setTurns((t) => [...t, { role: 'operator', content: 'Something went wrong sending that — try again.' }])
        return
      }
      setTurns((t) => [...t, { role: 'operator', content: json.reply || "I didn't quite catch that — try again." }])
      if (json.quickReplies) setQuickReplies(json.quickReplies as string[])
      if (json.adjustment) setPendingAdjustment(json.adjustment as PendingAdjustment)
      // Real gap found live, 2026-09-04: a cold-start build (planBuilt) never
      // surfaced a "go see it" card here — CoachHero.tsx already does this.
      // router.refresh() same as decide()'s approved branch below, so the
      // page she taps through to is actually fresh, not a stale pre-build one.
      if (json.planBuilt) {
        router.refresh()
        broadcastRefresh()
        setJustBuilt({ workout: !!json.builtWorkout, nutrition: !!json.builtNutrition })
      }
      // A cold-start build (planBuilt) or a food log both apply immediately,
      // no approval step — refetch the real current action so the circle
      // reflects it right away, same as every other live card on this app.
      await load()
    } catch {
      setTurns((t) => [...t, { role: 'operator', content: "I couldn't reach the plan just now — try that again in a sec." }])
    } finally {
      setBusy(false)
    }
  }

  // Approve/decline a recommended adjustment — same real engine and same
  // yes/no flow as the full Coach chat (components/OperatorChat.tsx), not a
  // second, separately-maintained approval path.
  const decide = async (status: 'approved' | 'rejected') => {
    const adj = pendingAdjustment
    if (!adj) return
    setPendingAdjustment(null)
    setBusy(true)
    try {
      const res = await fetch('/api/plan/operator', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adjustmentId: adj.id ?? '', status }) })
      const json = await res.json().catch(() => null)
      if (json?.reply) setTurns((t) => [...t, { role: 'operator', content: json.reply }])
      if (status === 'approved') {
        setEncouragement(ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)])
        setJustApproved(adj)
        router.refresh()
        broadcastRefresh()
      }
      await load()
    } finally {
      setBusy(false)
    }
  }

  // Real voice input (2026-08-26 fix): the circle's mic used to run its own
  // raw browser SpeechRecognition call — the exact same approach that used
  // to cause "the mic cuts off mid-sentence" in Coach Asa's chat, before
  // that was fixed by moving to a real Deepgram Nova-3 streaming pipeline
  // (lib/voice/useDeepgramTranscription.ts, via components/DeepgramVoiceInput.tsx).
  // Reusing that exact same proven component here instead of re-solving an
  // already-solved problem worse. It manages its own mic/listening state
  // and gracefully falls back to the plain browser API only if Deepgram
  // isn't reachable — never a silent dead end.
  const onVoiceInterim = (text: string) => {
    setMessage(text)
  }
  const onVoiceFinal = (text: string) => {
    sendMessage(text)
  }

  // Tapping the instruction opens the one supporting screen the engine
  // already decided (prompt 3) — fallback/reward-question kinds have
  // nothing to expand into, so the button is inert for those.
  const expand = () => {
    if (!action) return
    goToExpansion(action)
  }

  // Do-vs-decide split (Asa's spec, 2026-08-31): passive/self-directed
  // actions (water, stretch, breathing, a short walk — the real
  // `fallback` tier) mark done the instant you tap, right here, no
  // navigation — there's no "screen" for drinking water to expand into.
  // App-assisted actions (workout, a real eating-out pick) keep opening
  // their real screen exactly as before. Either way this is the ONE
  // button for "do the thing" — never routes into chat/typing.
  const isPassive = action?.kind === 'fallback'
  const isTappable = isPassive || !!(action && EXPANSION_ROUTE[action.kind])
  const handleTap = () => {
    if (isPassive) { markDone(); return }
    expand()
  }

  // Cinematic emerald/gold treatment — Asa's final pick, 2026-08-26, after a
  // live mockup review (published Artifact, several rounds: color family →
  // texture → font pairing → cinematic vignette → outer ring placement).
  const cardBg = 'radial-gradient(80% 60% at 50% 38%, rgba(229,169,60,0.14), transparent 60%), radial-gradient(140% 100% at 50% 115%, rgba(0,0,0,0.7), transparent 55%), linear-gradient(180deg, #06231a 0%, #021F16 45%, #010b07 100%)'

  if (loading) {
    return variant === 'dock'
      ? <div className="rounded-2xl animate-pulse bg-black/25" style={{ height: 54 }} />
      : <div className="rounded-3xl animate-pulse" style={{ background: cardBg, border: '1.5px solid rgba(229,169,60,0.3)', minHeight: 360 }} />
  }

  if (!action) {
    return variant === 'dock'
      ? <p className="text-white/60 text-xs" style={{ fontFamily: 'var(--font-poppins)' }}>Your next action will show up here once your plan is set up.</p>
      : (
        <div className="rounded-3xl p-6 text-center" style={{ background: cardBg, border: '1.5px solid rgba(229,169,60,0.3)' }}>
          <p className="text-ivory/50 text-sm">Your next action will show up here once your plan is set up.</p>
        </div>
      )
  }

  // Real bug caught live (2026-08-26): a longer instruction (e.g. a
  // restaurant + specific order) got visually cut off inside the fixed-size
  // circle. The base template was shortened separately (candidates.ts), but
  // this is the safety net for whatever length actually shows up — shrink
  // to fit rather than clip, since there's no scrolling inside a circle.
  const instructionFontSize = action.instruction.length > 110
    ? 'clamp(11px, 3vw, 13px)'
    : action.instruction.length > 70
      ? 'clamp(13px, 3.6vw, 15px)'
      : 'clamp(15px, 4.2vw, 18px)'

  if (variant === 'dock') {
    return (
      <div style={{ fontFamily: 'var(--font-poppins)' }}>
        {celebration && (
          <button
            onClick={() => setCelebration(null)}
            className="w-full text-left rounded-xl px-3 py-2 mb-2 flex items-start gap-2 active:scale-[0.99] transition-transform"
            style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(229,169,60,0.5)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#E5A93C" className="shrink-0 mt-0.5"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2Z" /></svg>
            <span className="text-white text-xs font-semibold">{celebration}, love — you&apos;ve kept showing up, and you deserve it.</span>
          </button>
        )}

        {/* "Your next step" eyebrow — button audit, 2026-09-03: the
            instruction below used the same italic serif style as the
            "Today's self-talk" quote card above it, so a brand-new user had
            no way to tell a live instruction apart from a static quote.
            This label is the whole fix — no change to the instruction
            styling itself, just something marking it as live. */}
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5" style={{ fontFamily: 'var(--font-poppins)', color: 'rgba(229,169,60,0.85)' }}>
          Your next step
        </p>

        <div className="flex items-start gap-2 mb-2">
          {/* Sonar/target button — Asa's ask, 2026-08-31: replaced the plain
              pulsating circle with a real target-dot + concentric ripple-ring
              indicator (5 rings, staggered, scale-out + fade-to-0 loop).
              Green/gold alternating rings match the app's real accent pair;
              swaps to the pink family when `encouragement` is set, same
              "visibly different on a simplified instruction" signal the old
              circle's color swap gave. Max scale capped at 1.35 (was 2.5) —
              Asa's catch, live: the full-size rings spilled into the
              instruction text and the "Keep it simple" pill below. Border
              thickened 1.5→2px to keep the same bold, big feel at the
              smaller contained size instead of just shrinking it down. */}
          <style>{`
            @keyframes luf-sonar-ping {
              0% { transform: scale(0.6); opacity: 0.9; }
              60% { opacity: 0.35; }
              100% { transform: scale(1.35); opacity: 0; }
            }
            @keyframes luf-sonar-dot-glow {
              0%, 100% { box-shadow: 0 0 8px 2px rgba(229,169,60,0.7), 0 0 4px 1px rgba(127,191,148,0.6); transform: scale(1); }
              50% { box-shadow: 0 0 14px 4px rgba(229,169,60,0.95), 0 0 8px 2px rgba(127,191,148,0.85); transform: scale(1.06); }
            }
            .luf-sonar-ring { position: absolute; inset: 0; border-radius: 9999px; border-style: solid; animation: luf-sonar-ping 3.2s cubic-bezier(0,0,0.3,1) infinite; }
            /* Checkmark tap confirmation — button audit, 2026-09-03: the
               fill-on-tap (done ? gold : dark, below) already existed, but
               nothing marked the moment itself, so it read as no feedback
               at all. Purely additive: a one-shot ring that mounts and
               plays only while done is true, never touches markDone's real
               state logic. */
            @keyframes luf-done-pop { 0% { transform: scale(0.55); opacity: 1; } 70% { opacity: 0.6; } 100% { transform: scale(2.1); opacity: 0; } }
            .luf-done-pop { position: absolute; inset: -6px; border-radius: 9999px; border: 2.2px solid #E5A93C; animation: luf-done-pop 0.8s ease-out forwards; pointer-events: none; }
          `}</style>
          <div
            role={isTappable ? 'button' : undefined}
            tabIndex={isTappable ? 0 : undefined}
            onClick={isTappable ? handleTap : undefined}
            onKeyDown={isTappable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTap() } } : undefined}
            aria-label={isPassive ? 'Mark done' : undefined}
            className="relative shrink-0 mt-0.5"
            style={{ width: 42, height: 42, cursor: isTappable ? 'pointer' : 'default' }}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="luf-sonar-ring"
                style={{
                  borderWidth: 2,
                  borderColor: encouragement ? '#E9A0A0' : i % 2 === 0 ? '#7fbf94' : '#E5A93C',
                  animationDelay: `${i * 0.64}s`,
                }}
              />
            ))}
            <div
              style={{
                position: 'absolute', top: '50%', left: '50%', width: 9, height: 9, margin: '-4.5px 0 0 -4.5px',
                borderRadius: '50%',
                background: encouragement
                  ? 'radial-gradient(circle at 35% 30%, #f2c6cf, #E9A0A0 45%, #d97a90 100%)'
                  : 'radial-gradient(circle at 35% 30%, #f2c879, #E5A93C 45%, #7fbf94 100%)',
                animation: 'luf-sonar-dot-glow 2.6s ease-in-out infinite',
              }}
            />
          </div>
          <span className="flex-1 leading-snug text-white" style={{ fontFamily: 'var(--font-fraunces)', fontStyle: 'italic', fontWeight: 600, fontSize: 15, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {encouragement && <span className="block not-italic font-semibold text-white/70" style={{ fontFamily: 'var(--font-poppins)', fontSize: 11 }}>{encouragement}</span>}
            {action.instruction}
          </span>
          {action.kind !== 'complete' && (
            // Real unchecked/checked states, not a permanently-filled icon —
            // Asa's catch, live: this always looked already-checked, even
            // before she'd done anything. `done` already existed (it drove
            // the aria-label) and already resets to false once `load()`
            // swaps in the next action — this just makes the STYLE follow
            // that same real state instead of staying static regardless.
            <button
              onClick={markDone}
              disabled={busy}
              aria-label={done ? 'Nice!' : 'Mark done'}
              aria-pressed={done}
              className="relative rounded-full shrink-0 flex items-center justify-center disabled:opacity-60 active:scale-95 transition-all"
              style={{
                width: 26, height: 26,
                background: done ? '#C9A84C' : 'rgba(0,0,0,0.35)',
                border: done ? 'none' : '1.5px solid rgba(229,169,60,0.6)',
              }}
            >
              {done && <span className="luf-done-pop" />}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={done ? '#0A0A0F' : 'rgba(229,169,60,0.7)'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
            </button>
          )}
        </div>

        {action.kind !== 'complete' && (
          <div className="flex items-center gap-1.5 mb-2">
            <button onClick={dayChanged} disabled={busy} className="text-white/80 text-[10.5px] font-bold bg-white/10 border border-white/20 rounded-full px-3 py-1 disabled:opacity-60">
              Keep it simple
            </button>
            {/* "Something else?" removed (Asa's spec, 2026-08-31): it looked
                like a plain button but actually sent a canned phrase through
                the same AI message pipeline the chat box below uses — a real
                side door from "doing" into "deciding via chat," which is
                exactly what the do-vs-decide split forbids. The always-
                visible chat box already covers this if she wants to type it
                herself; nothing lost, just no more disguised entry point. */}
          </div>
        )}

        {/* Real chat transcript, this session only (Asa's report, 2026-09-01:
            "it doesn't show the user... typing in like ChatGPT") — capped
            height + scroll instead of full-page since the dock sits over
            the video feed with limited room; last few turns are what matter
            here, not a full scrollback. Bubbles reuse the exact gold/dark
            pairing already shipped on /plan/coach (components/
            OperatorChat.tsx), not a new visual style. */}
        {turns.length > 0 && (
          <div className="space-y-1.5 mb-2 max-h-32 overflow-y-auto">
            {turns.map((t, i) => (
              <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-2.5 py-1.5 text-[11px] leading-snug ${t.role === 'user' ? 'bg-[#C9A84C] text-obsidian font-medium' : 'bg-black/35 border border-white/15 text-white/90'}`}>
                  {t.content}
                </div>
              </div>
            ))}
            <div ref={turnsEndRef} />
          </div>
        )}

        {quickReplies && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {quickReplies.map((o) => (
              <button key={o} onClick={() => sendMessage(o)} disabled={busy}
                className="bg-black/30 border border-[#E5A93C]/50 text-[#E5A93C] px-2.5 py-1 font-bold text-[10.5px] uppercase tracking-wide rounded-full active:scale-95 transition-transform disabled:opacity-40">
                {o}
              </button>
            ))}
          </div>
        )}

        {pendingAdjustment && (
          <div className="rounded-xl p-2.5 mb-2" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(229,169,60,0.5)' }}>
            {adjLines(pendingAdjustment).length ? (
              <ul className="mb-1.5">
                {adjLines(pendingAdjustment).map((l, i) => <li key={i} className="text-white text-[11px]">• {l}</li>)}
              </ul>
            ) : <p className="text-white/70 text-[11px] mb-1.5">A small tweak to keep you on track today.</p>}
            <div className="flex gap-1.5">
              <button onClick={() => decide('approved')} disabled={busy} className="flex-1 bg-[#C9A84C] text-obsidian px-3 py-1.5 font-bold text-[10.5px] uppercase tracking-wide rounded-lg active:scale-95 transition-transform disabled:opacity-60">Yes, update it</button>
              <button onClick={() => decide('rejected')} disabled={busy} className="flex-1 bg-black/30 border border-white/20 text-white/70 px-3 py-1.5 font-bold text-[10.5px] uppercase tracking-wide rounded-lg active:scale-95 transition-transform disabled:opacity-60">No, keep it</button>
            </div>
          </div>
        )}

        {/* Real "take me there" the instant she approves — same copy/routing
            as OperatorChat.tsx's justApproved, right in the chat reply
            itself, not just an implicit "the circle above changed." */}
        {justApproved && (
          <div className="flex flex-col gap-1.5 mb-2">
            {justApproved.workoutChange && (
              <Link href="/plan/workout" className="flex items-center justify-center gap-1.5 bg-[#C9A84C] text-obsidian px-3 py-1.5 font-bold text-[10.5px] uppercase tracking-wide rounded-lg active:scale-95 transition-transform">
                View my updated workout →
              </Link>
            )}
            {justApproved.nutritionChange && (
              <Link
                href={justApproved.nutritionChange.eatingOut ? '/plan/eating-out' : '/plan/today'}
                className="flex items-center justify-center gap-1.5 bg-black/30 border border-[#E5A93C]/50 text-[#E5A93C] px-3 py-1.5 font-bold text-[10.5px] uppercase tracking-wide rounded-lg active:scale-95 transition-transform"
              >
                {justApproved.nutritionChange.eatingOut ? 'Show me my options →' : 'View my updated plan →'}
              </Link>
            )}
          </div>
        )}

        {/* Cold-start build — same "go see it" card CoachHero.tsx already
            has, routed to the specific thing built, not always the generic
            dashboard (no single page shows both). */}
        {justBuilt && (
          <div className="flex flex-col gap-1.5 mb-2">
            {justBuilt.workout && justBuilt.nutrition ? (
              <Link href="/plan" className="flex items-center justify-center gap-1.5 bg-[#C9A84C] text-obsidian px-3 py-1.5 font-bold text-[10.5px] uppercase tracking-wide rounded-lg active:scale-95 transition-transform">
                View my new plan →
              </Link>
            ) : justBuilt.workout ? (
              <Link href="/plan/workout" className="flex items-center justify-center gap-1.5 bg-[#C9A84C] text-obsidian px-3 py-1.5 font-bold text-[10.5px] uppercase tracking-wide rounded-lg active:scale-95 transition-transform">
                View my new workout →
              </Link>
            ) : justBuilt.nutrition ? (
              <Link href="/plan/today" className="flex items-center justify-center gap-1.5 bg-[#C9A84C] text-obsidian px-3 py-1.5 font-bold text-[10.5px] uppercase tracking-wide rounded-lg active:scale-95 transition-transform">
                View my new nutrition plan →
              </Link>
            ) : (
              <Link href="/plan" className="flex items-center justify-center gap-1.5 bg-[#C9A84C] text-obsidian px-3 py-1.5 font-bold text-[10.5px] uppercase tracking-wide rounded-lg active:scale-95 transition-transform">
                View my new plan →
              </Link>
            )}
          </div>
        )}

        {/* Gold gradient + thin glow — Asa's ask, 2026-08-29/30, after
            trying white glow then a stronger gold glow: matches the app's
            real accent (same gold as the Next Action circle's own glow)
            instead of a third distinct color, and a thin/tight glow read
            better than a big spread once compared side by side. */}
        <div className="flex items-end gap-2 rounded-3xl pl-3.5 pr-1.5 py-1.5" style={{ background: 'linear-gradient(135deg, rgba(20,20,20,0.75), rgba(0,0,0,0.55))', border: '1px solid rgba(229,169,60,0.75)', boxShadow: '0 0 8px 0px rgba(229,169,60,0.4)' }}>
          {/* Real gap found live, 2026-09-01 (Asa's report): this was a
              single-line <input> — anything longer than the visible box
              just scrolled sideways out of view instead of wrapping, so she
              couldn't see what she'd already typed. A textarea, same
              auto-grow effect the full variant below already uses (shared
              textareaRef), capped so it can't swallow the whole dock. */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder={hasPlan ? "Ask anything about your plan…" : "Try me — ask for your first workout or nutrition plan…"}
            rows={1}
            className="flex-1 bg-transparent text-white text-xs placeholder:text-white/40 focus:outline-none min-w-0 resize-none py-1.5 max-h-32 overflow-y-auto leading-snug"
          />
          <span onClick={(e) => e.stopPropagation()}>
            <DeepgramVoiceInput
              source="next_action"
              onInterim={onVoiceInterim}
              onResult={onVoiceFinal}
              idleLabel="Talk instead of typing"
              className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-white/55"
              activeClassName="w-[26px] h-[26px] rounded-full flex items-center justify-center bg-[#E9A0A0]"
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
                  <path d="M19 11a7 7 0 0 1-14 0" />
                  <path d="M12 18v4" />
                </svg>
              }
            />
          </span>
          <button onClick={() => sendMessage()} disabled={busy || !message.trim()} aria-label="Send" className="rounded-full shrink-0 flex items-center justify-center disabled:opacity-40" style={{ width: 30, height: 30, background: '#C9A84C' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A0A0F" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M6 11l6-6 6 6" /></svg>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-3xl p-6" style={{ background: cardBg, border: '1.5px solid #E5A93C', boxShadow: '0 0 30px -6px rgba(229,169,60,0.3)' }}>
      {/* Real, visible reward celebration (2026-08-28, Asa's direct call) —
          replaces the original design's silent text-weave, which she saw
          live and didn't notice as anything special. No emoji (standing
          app-wide rule) — a small hand-built star glyph instead. Auto-
          dismisses on its own; tapping it closes it early. */}
      {celebration && (
        <button
          onClick={() => setCelebration(null)}
          className="w-full text-left rounded-2xl px-4 py-3 mb-4 flex items-start gap-3 active:scale-[0.99] transition-transform"
          style={{ background: 'linear-gradient(135deg, rgba(229,169,60,0.22), rgba(15,122,83,0.18))', border: '1px solid rgba(229,169,60,0.5)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#E5A93C" className="shrink-0 mt-0.5"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2Z" /></svg>
          <span style={{ fontFamily: 'var(--font-poppins)' }}>
            <span className="block text-[#E5A93C] text-[10px] font-bold uppercase tracking-wider mb-0.5">A little something extra</span>
            <span className="block text-white text-sm font-semibold">{celebration}, love — you&apos;ve kept showing up, and you deserve it.</span>
          </span>
        </button>
      )}

      <p className="text-[#E5A93C] text-[10px] uppercase tracking-[0.25em] font-bold mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>Right now</p>

      {/* The circle — generous room above/below it (Asa's ask, 2026-08-25:
          "more space between the circle and the done button") so it reads
          as the one dominant thing on the card, not squeezed against the
          controls underneath. */}
      <div className="relative flex items-center justify-center py-8">
        {/* Real bug caught live (2026-08-26): this was a <button>, and it
            contains the Deepgram mic button below — a <button> nested
            inside another <button> is invalid HTML5 (interactive content
            can't contain interactive content). Browsers handle that
            unpredictably, which is the actual reason the mic wasn't
            reliably catching taps, not the transcription engine itself.
            A div with the same click/keyboard behavior fixes this while
            staying just as accessible. */}
        <div
          role={EXPANSION_ROUTE[action.kind] ? 'button' : undefined}
          tabIndex={EXPANSION_ROUTE[action.kind] ? 0 : undefined}
          onClick={EXPANSION_ROUTE[action.kind] ? expand : undefined}
          onKeyDown={EXPANSION_ROUTE[action.kind] ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); expand() } } : undefined}
          className="relative rounded-full flex items-center justify-center text-center active:scale-[0.98] transition-transform"
          style={{
            width: 'clamp(220px, 68vw, 300px)', height: 'clamp(220px, 68vw, 300px)',
            // Asa's ask, 2026-08-28: the circle should visibly LOOK different
            // the moment "Keep it simple" (or an equivalent message-driven
            // change) hands her a smaller substitute — not just say so in
            // text underneath. Reuses `encouragement` as the signal (it's
            // already exactly "this instruction is a simplified one," set on
            // the same two success paths, cleared on every fresh load) so
            // there's no second, separately-tracked "is this simplified"
            // flag to drift out of sync with it.
            background: encouragement
              ? 'conic-gradient(from 200deg, #E9A0A0, #f2c6cf, #d97a90, #E9A0A0)'
              : 'conic-gradient(from 200deg, #E5A93C, #7fbf94, #0f7a53, #E5A93C)',
            boxShadow: '0 30px 50px -18px rgba(0,0,0,0.65)',
            cursor: EXPANSION_ROUTE[action.kind] ? 'pointer' : 'default',
          }}
        >
          {/* Outer ring — hovers OUTSIDE the circle with a real gap (Asa's
              correction: a box-shadow ring blended into the edge instead of
              reading as separate). A distinct element on purpose. Pulses
              gently on its own (glow + scale, never the text inside) so the
              card reads as alive without moving what she's reading. Pink to
              match the circle whenever this is a "kept it simple" moment. */}
          <span aria-hidden className="absolute rounded-full pointer-events-none nac-ring-breathe" style={{ inset: -22, border: `2px solid ${encouragement ? '#E9A0A0' : '#E5A93C'}` }} />
          {/* Ridged inner texture — a thin sunburst ring just inside the
              circle's own edge, for a "dial" quality instead of a flat fill. */}
          <span
            aria-hidden
            className="absolute rounded-full"
            style={{
              inset: 16, zIndex: 1,
              backgroundImage: 'repeating-conic-gradient(rgba(255,255,255,0.16) 0deg 2deg, transparent 2deg 12deg)',
              maskImage: 'radial-gradient(circle, transparent 66%, black 67%, black 100%)',
              WebkitMaskImage: 'radial-gradient(circle, transparent 66%, black 67%, black 100%)',
            }}
          />
          <span className="relative flex flex-col items-center px-9" style={{ zIndex: 2, fontFamily: 'var(--font-poppins)' }}>
            {encouragement && (
              <span className="font-semibold mb-1" style={{ color: 'rgba(10,36,23,0.7)', fontSize: 'clamp(10px, 2.6vw, 12px)' }}>{encouragement}</span>
            )}
            {/* Instruction font: Fraunces italic (2026-08-27, Asa's pick
                after a published mockup comparison) — free equivalent of
                TAN Aegean, warm editorial serif in place of the plain
                Poppins used everywhere else on this card. Only this line,
                not the encouragement/eyebrow text above it. */}
            <span className="leading-snug" style={{ color: '#0a2417', fontSize: instructionFontSize, fontFamily: 'var(--font-fraunces)', fontStyle: 'italic', fontWeight: 600 }}>{action.instruction}</span>
          </span>
          {/* Real Deepgram voice pipeline (same one Coach Asa's chat uses) —
              not a separate implementation. stopPropagation keeps a mic tap
              from also triggering the circle's own expand() navigation. */}
          <span
            className="absolute"
            style={{ zIndex: 2, bottom: 28, left: '50%', transform: 'translateX(-50%)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <DeepgramVoiceInput
              source="next_action"
              onInterim={onVoiceInterim}
              onResult={onVoiceFinal}
              idleLabel="Talk instead of typing"
              className="w-[34px] h-[34px] rounded-full flex items-center justify-center bg-black/32 border border-white/35 text-white"
              activeClassName="w-[34px] h-[34px] rounded-full flex items-center justify-center bg-[#E9A0A0] border border-white/40"
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
                  <path d="M19 11a7 7 0 0 1-14 0" />
                  <path d="M12 18v4" />
                </svg>
              }
            />
          </span>
        </div>
      </div>
      <style>{`
        .nac-ring-breathe { animation: nac-ring-breathe 3.2s ease-in-out infinite; }
        @keyframes nac-ring-breathe {
          0%, 100% { box-shadow: 0 0 20px 1px rgba(229,169,60,0.3); transform: scale(1); }
          50% { box-shadow: 0 0 34px 6px rgba(229,169,60,0.55); transform: scale(1.025); }
        }
        @media (prefers-reduced-motion: reduce) { .nac-ring-breathe { animation: none; } }
      `}</style>

      {/* Small on purpose — the circle is the one thing on this screen;
          this is just the escape hatch, not a second focal point.
          "complete" (2026-08-28) hides Done/Keep it simple — there's
          nothing left to mark done and nothing to simplify on a day she's
          already finished everything; the chat bar below stays in case she
          wants to add anything. */}
      <div className="flex flex-col items-center gap-1.5" style={{ fontFamily: 'var(--font-poppins)' }}>
        {action.kind !== 'complete' && (
          <button onClick={markDone} disabled={busy} className="bg-gold text-obsidian px-7 py-2 font-bold text-xs uppercase tracking-wider rounded-full active:scale-95 transition-transform disabled:opacity-60">
            {done ? 'Nice!' : 'Done'}
          </button>
        )}
        {action.kind !== 'complete' && (
          <button onClick={dayChanged} disabled={busy} className="text-ivory/50 text-[11px] font-semibold py-1.5 disabled:opacity-60">
            Keep it simple
          </button>
        )}
      </div>

      {/* Persistent chat bar — routes through the same full operator engine
          as /plan/coach (components/OperatorChat.tsx), not a second,
          weaker parser. This IS the "ask your coach anything" surface. */}
      <div className="mt-3">
        <p className="text-[#E5A93C] text-[9px] uppercase tracking-[0.2em] font-bold mb-1.5 text-center" style={{ fontFamily: 'var(--font-poppins)' }}>Ask your coach</p>

        {turns.length > 0 && (
          <div className="space-y-2 mb-2.5 max-h-64 overflow-y-auto" style={{ fontFamily: 'var(--font-poppins)' }}>
            {turns.map((t, i) => (
              <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-snug ${t.role === 'user' ? 'bg-gold text-obsidian font-medium rounded-br-sm' : 'bg-black/25 border border-white/15 text-ivory/90 rounded-bl-sm'}`}>
                  {t.content}
                </div>
              </div>
            ))}
            <div ref={turnsEndRef2} />
          </div>
        )}

        {quickReplies && (
          <div className="flex flex-wrap gap-2 mb-2.5">
            {quickReplies.map((o) => (
              <button key={o} onClick={() => sendMessage(o)} disabled={busy}
                className="bg-black/25 border border-gold/40 text-gold px-3.5 py-1.5 font-bold text-[11px] uppercase tracking-wider rounded-xl active:scale-95 transition-transform disabled:opacity-40">
                {o}
              </button>
            ))}
          </div>
        )}

        {pendingAdjustment && (
          <div className="bg-black/25 border border-gold/40 rounded-2xl p-3.5 mb-2.5">
            <p className="text-gold text-[10px] uppercase tracking-wider font-semibold mb-1.5">Here&rsquo;s what I recommend</p>
            {adjLines(pendingAdjustment).length ? (
              <ul className="space-y-1 mb-2.5">
                {adjLines(pendingAdjustment).map((l, i) => <li key={i} className="text-white text-sm">• {l}</li>)}
              </ul>
            ) : <p className="text-ivory/70 text-sm mb-2.5">A small tweak to keep you on track today.</p>}
            <div className="flex gap-2">
              <button onClick={() => decide('approved')} disabled={busy} className="flex-1 bg-gold text-obsidian px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform disabled:opacity-60">Yes, update it</button>
              <button onClick={() => decide('rejected')} disabled={busy} className="flex-1 bg-charcoal border border-smoke text-ivory/60 px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform disabled:opacity-60">No, keep it</button>
            </div>
          </div>
        )}

        {justApproved && (
          <div className="flex flex-col gap-2 mb-2.5">
            {justApproved.workoutChange && (
              <Link href="/plan/workout" className="flex items-center justify-center gap-1.5 bg-gold text-obsidian px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform">
                View my updated workout →
              </Link>
            )}
            {justApproved.nutritionChange && (
              <Link
                href={justApproved.nutritionChange.eatingOut ? '/plan/eating-out' : '/plan/today'}
                className="flex items-center justify-center gap-1.5 bg-obsidian border border-gold/40 text-gold px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl hover:border-gold/70 transition-colors"
              >
                {justApproved.nutritionChange.eatingOut ? 'Show me my options →' : 'View my updated plan →'}
              </Link>
            )}
          </div>
        )}

        {/* Cold-start build — same "go see it" card CoachHero.tsx already
            has, routed to the specific thing built, not always the generic
            dashboard (no single page shows both). */}
        {justBuilt && (
          <div className="flex flex-col gap-2 mb-2.5">
            {justBuilt.workout && justBuilt.nutrition ? (
              <Link href="/plan" className="flex items-center justify-center gap-1.5 bg-gold text-obsidian px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform">
                View my new plan →
              </Link>
            ) : justBuilt.workout ? (
              <Link href="/plan/workout" className="flex items-center justify-center gap-1.5 bg-gold text-obsidian px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform">
                View my new workout →
              </Link>
            ) : justBuilt.nutrition ? (
              <Link href="/plan/today" className="flex items-center justify-center gap-1.5 bg-gold text-obsidian px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform">
                View my new nutrition plan →
              </Link>
            ) : (
              <Link href="/plan" className="flex items-center justify-center gap-1.5 bg-gold text-obsidian px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform">
                View my new plan →
              </Link>
            )}
          </div>
        )}

        <div className="flex items-end gap-2" style={{ fontFamily: 'var(--font-poppins)' }}>
          {/* A textarea, not a single-line input — Asa's ask, 2026-08-26:
              the full transcript must stay visible no matter how long it
              gets, like any normal AI chat box, never clipped or side-
              scrolling. Height grows with content via the effect above. */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder={hasPlan ? "Ask anything about your plan…" : "Try me — ask for your first workout or nutrition plan…"}
            rows={1}
            className="flex-1 bg-black/20 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-ivory/30 focus:outline-none focus:border-gold/60 resize-none max-h-60 overflow-y-auto"
          />
          <button onClick={() => sendMessage()} disabled={busy || !message.trim()} className="bg-white/10 border border-white/20 text-white text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-40">
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
