'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useDeepgramTranscription, type DeepgramFinalResult } from '@/lib/voice/useDeepgramTranscription'

function MicIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
      <line x1="12" y1="18" x2="12" y2="22" />
    </svg>
  )
}

// Deepgram Nova-3-backed replacement for components/VoiceButton.tsx, used
// only where transcript accuracy actually feeds a real decision — Coach
// Asa's chat (components/CoachHero.tsx, components/OperatorChat.tsx). Food
// search (components/FoodLog.tsx) stays on the free browser API for now;
// short query terms aren't where the reported accuracy problem lives, and
// there was no reason to widen the blast radius of a new dependency past
// what was actually asked for.
//
// onResult fires ONCE, when she taps stop — deliberately not mid-recording,
// so she always gets a clean final read rather than a half-formed sentence.
// It does NOT auto-send; callers should just set their input state and let
// her review/send herself, same as if she'd typed it. That's a deliberate
// change from the old VoiceButton call sites (which called send() straight
// from onResult) — a low-confidence or garbled transcript is only
// recoverable if she sees it before it goes out, which matters more now
// that low-confidence results are actually possible to detect and flag.
export default function DeepgramVoiceInput({
  onResult, onInterim, idleLabel = 'Talk to Coach Asa', icon, source, className, activeClassName,
}: {
  onResult: (text: string) => void
  onInterim?: (text: string) => void
  idleLabel?: string
  icon?: ReactNode
  // Written to voice_transcripts.source for later review — which surface a
  // given recording came from.
  source: 'coach_hero' | 'operator_chat' | 'voice_test'
  // Full replacement for the idle/listening button classes — lets a caller
  // (e.g. OperatorChat's unified pill composer) reshape this into whatever
  // circular/pill button its own layout needs without forking the actual
  // transcription logic. Omit either to keep the original look (CoachHero's
  // two call sites rely on that default and pass neither).
  className?: string
  activeClassName?: string
}) {
  const [flag, setFlag] = useState<string | null>(null)
  const [supported, setSupported] = useState(true)

  function handleFinal(result: DeepgramFinalResult) {
    if (result.transcript) onResult(result.transcript)
    setFlag(!result.transcript
      ? "Didn't catch anything — try again, or just type it."
      : result.lowConfidence
        ? "Didn't catch that clearly — double-check it before sending, or try again."
        : null)
    // Best-effort, fire-and-forget — never blocks her from sending what she
    // said. cleanedTranscript deliberately omitted: no cleanup pass runs
    // here, so there's nothing distinct to log — raw stays raw.
    fetch('/api/voice/log', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source, rawTranscript: result.transcript, confidence: result.confidence,
        lowConfidence: result.lowConfidence, durationSeconds: result.durationSeconds,
      }),
    }).catch(() => {})
  }

  const { listening, start, stop, supported: checkSupported } = useDeepgramTranscription({
    onInterim,
    onFinal: handleFinal,
    onError: (message) => setFlag(message),
  })

  useEffect(() => { setSupported(checkSupported()) }, [checkSupported])

  if (!supported) return null

  function toggle() {
    setFlag(null)
    if (listening) stop(); else start()
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={listening ? 'Stop and use this' : idleLabel}
        className={`shrink-0 flex items-center justify-center transition-all ${listening ? (activeClassName ?? 'h-10 w-10 rounded-xl bg-red-500/90 text-white luf-glow scale-105') : (className ?? 'h-10 w-10 rounded-xl bg-obsidian/60 border border-smoke text-ivory/70 hover:border-gold/50')}`}
      >
        {listening ? (
          <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" /><span className="relative inline-flex rounded-full h-3 w-3 bg-white" /></span>
        ) : (
          icon ?? <MicIcon />
        )}
      </button>
      {flag && (
        <p className="absolute top-full right-0 mt-1.5 w-48 text-[10px] leading-snug text-amber-400 bg-obsidian/95 border border-amber-400/30 rounded-lg px-2 py-1.5 z-10">
          {flag}
        </p>
      )}
    </div>
  )
}
