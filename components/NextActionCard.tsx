'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { hapticTap } from '@/lib/haptics'
import DeepgramVoiceInput from '@/components/DeepgramVoiceInput'

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

// The ONE destination per kind — fully determined by what the engine
// decided, never a choice presented to her (prompt 3's core rule). Fallback
// actions have nothing to expand into; tapping does nothing.
const EXPANSION_ROUTE: Partial<Record<ActionKind, string>> = {
  workout: '/plan/workout',
  meal: '/plan/nutrition',
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

export default function NextActionCard({ variant = 'full' }: { variant?: 'full' | 'dock' }) {
  const router = useRouter()
  const [action, setAction] = useState<NextAction | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [message, setMessage] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const [encouragement, setEncouragement] = useState<string | null>(null)
  const [celebration, setCelebration] = useState<string | null>(null)
  // Guards against re-showing the same reward's celebration every time this
  // same still-open row gets re-fetched (a fresh page load, "Keep it
  // simple" refetching after a failed request, etc.) — celebrate once per
  // distinct logId, not once per render.
  const celebratedRef = useRef<Set<string>>(new Set())
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

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

  useEffect(() => { load() }, [])

  const markDone = async () => {
    if (!action || busy) return
    hapticTap()
    setBusy(true)
    setDone(true)
    try {
      await fetch('/api/plan/next-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ logId: action.logId, action: 'done' }) })
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
    if (!action || busy || !text) return
    setBusy(true)
    try {
      const res = await fetch('/api/plan/next-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ logId: action.logId, action: 'message', message: text }) })
      // Real bug caught live, 2026-08-27: a failed request (a stale logId
      // from a superseded/expired action, a session hiccup, a transient
      // server error) used to throw inside this try with no catch —
      // `finally` still reset `busy`, but nothing else ran, so hitting Send
      // visibly did NOTHING: no note, no instruction change, message still
      // sitting in the box. From her side that reads as "it's broken," with
      // zero signal about why. Now every failure path — a non-OK response,
      // or the body not even being valid JSON — surfaces a real note
      // instead of failing silently.
      if (!res.ok) {
        setNote(res.status === 409 ? "That instruction already moved on — pull up the newest one and try again." : 'Something went wrong sending that — try again.')
        return
      }
      const json = await res.json().catch(() => null)
      if (!json) {
        setNote('Something went wrong sending that — try again.')
        return
      }
      if (json.changed && json.logId) {
        setAction(json)
        maybeCelebrate(json)
        setNote(null)
        // Real bug caught live, 2026-08-28: telling it something real (e.g.
        // "I'm not doing my workout today") silently swapped the circle with
        // zero acknowledgment — no different from the tap just not
        // registering, from her side. "Keep it simple" already had this
        // exact warm confirmation; a message-driven change deserves the
        // same one, not a colder experience for actually talking to it.
        setEncouragement(ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)])
        setMessage('')
        // "I'm at Chick-fil-A" should land her straight on the real order,
        // not back on the circle waiting for a second tap.
        if (json.kind === 'location') { goToExpansion(json); return }
      } else {
        setNote("Got it — didn't need to change anything.")
      }
      setMessage('')
    } catch {
      setNote('Something went wrong sending that — check your connection and try again.')
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

        <div className="flex items-start gap-2 mb-2">
          {/* Pulsating glow — Asa's ask, 2026-08-29 (pushed stronger on a
              second pass): "the one thing on screen" earns a breathing
              ring, not just a static border. A real @keyframes animation
              needs a real stylesheet rule, not an inline style, so it's
              scoped to this one class right below. */}
          <style>{`
            @keyframes luf-next-action-pulse {
              0%, 100% { box-shadow: 0 0 0 0 rgba(229,169,60,0.7), 0 0 10px 2px rgba(229,169,60,0.4); }
              50% { box-shadow: 0 0 0 10px rgba(229,169,60,0), 0 0 26px 8px rgba(229,169,60,0.85); }
            }
            .luf-next-action-circle { animation: luf-next-action-pulse 2.6s ease-in-out infinite; }
          `}</style>
          <div
            role={EXPANSION_ROUTE[action.kind] ? 'button' : undefined}
            tabIndex={EXPANSION_ROUTE[action.kind] ? 0 : undefined}
            onClick={EXPANSION_ROUTE[action.kind] ? expand : undefined}
            onKeyDown={EXPANSION_ROUTE[action.kind] ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); expand() } } : undefined}
            className="luf-next-action-circle rounded-full shrink-0 mt-0.5"
            style={{
              width: 42, height: 42,
              background: encouragement
                ? 'conic-gradient(from 200deg, #E9A0A0, #f2c6cf, #d97a90, #E9A0A0)'
                : 'conic-gradient(from 200deg, #E5A93C, #7fbf94, #0f7a53, #E5A93C)',
              border: '1.5px solid rgba(229,169,60,0.8)',
              cursor: EXPANSION_ROUTE[action.kind] ? 'pointer' : 'default',
            }}
          />
          <span className="flex-1 leading-snug text-white" style={{ fontFamily: 'var(--font-fraunces)', fontStyle: 'italic', fontWeight: 600, fontSize: 15, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {encouragement && <span className="block not-italic font-semibold text-white/70" style={{ fontFamily: 'var(--font-poppins)', fontSize: 11 }}>{encouragement}</span>}
            {action.instruction}
          </span>
          {action.kind !== 'complete' && (
            <button onClick={markDone} disabled={busy} aria-label={done ? 'Nice!' : 'Done'} className="rounded-full shrink-0 flex items-center justify-center disabled:opacity-60 active:scale-95 transition-transform" style={{ width: 26, height: 26, background: '#C9A84C' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0A0A0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
            </button>
          )}
        </div>

        {action.kind !== 'complete' && (
          <div className="flex items-center gap-1.5 mb-2">
            <button onClick={dayChanged} disabled={busy} className="text-white/80 text-[10.5px] font-bold bg-white/10 border border-white/20 rounded-full px-3 py-1 disabled:opacity-60">
              Keep it simple
            </button>
            {/* Was a toggle that revealed the (then-hidden) chat box —
                that box is always visible now, so this pill's job changed:
                Asa's ask, 2026-08-29, was to bring it back visually next to
                Keep it simple, matching the approved mockup. Routes through
                the exact same real message engine as typing in the chat
                box below — a canned starting phrase, not a separate
                stub path. */}
            <button onClick={() => sendMessage('Something else, please')} disabled={busy} className="text-white/80 text-[10.5px] font-bold bg-white/10 border border-white/20 rounded-full px-3 py-1 disabled:opacity-60">
              Something else?
            </button>
          </div>
        )}

        {note && <p className="text-white/60 text-[11px] mb-1.5">{note}</p>}

        <div className="flex items-center gap-2 rounded-full pl-3.5 pr-1.5 py-1.5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(229,169,60,0.3)' }}>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendMessage() } }}
            placeholder="Ask anything about your plan…"
            className="flex-1 bg-transparent text-white text-xs placeholder:text-white/40 focus:outline-none min-w-0"
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

      {note && <p className="text-ivory/50 text-[11px] text-center mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>{note}</p>}

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

      {/* Persistent chat bar — same real engine as before (sendMessage ->
          POST /api/plan/next-action, action:'message'), just always visible
          now instead of hidden behind a "Something else?" toggle. This IS
          the "ask your coach anything" surface; nothing new to wire, just a
          new door onto the same room. */}
      <div className="mt-3">
        <p className="text-[#E5A93C] text-[9px] uppercase tracking-[0.2em] font-bold mb-1.5 text-center" style={{ fontFamily: 'var(--font-poppins)' }}>Ask your coach</p>
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
            placeholder="Ask anything about your plan…"
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
