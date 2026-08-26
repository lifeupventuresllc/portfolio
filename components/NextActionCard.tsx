'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { hapticTap } from '@/lib/haptics'

// Prompt 1's "Next Action" — the single-instruction circle, now the
// dashboard's primary surface (Asa's call, 2026-08-25: "this is the new
// dashboard"). No categories are ever shown (never a "workout" vs "meal"
// label), just the one thing to do right now. Prompt 3's expansion routing
// lives here too: tapping the instruction (not the buttons) opens the
// supporting screen the engine already decided on — never a menu.
type ActionKind = 'workout' | 'meal' | 'fallback' | 'location'
type NextAction = { logId: string; kind: ActionKind; actionKey: string; instruction: string; score: number }

// The ONE destination per kind — fully determined by what the engine
// decided, never a choice presented to her (prompt 3's core rule). Fallback
// actions have nothing to expand into; tapping does nothing.
const EXPANSION_ROUTE: Partial<Record<ActionKind, string>> = {
  workout: '/plan/workout',
  meal: '/plan/nutrition',
  location: '/plan/eating-out',
}

// Minimal ambient TS surface for the Web Speech API — not in lib.dom.d.ts by
// default, and only ever touched behind a feature-detect below.
type SpeechRecognitionLike = {
  lang: string; interimResults: boolean; maxAlternatives: number
  onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}

export default function NextActionCard() {
  const router = useRouter()
  const [action, setAction] = useState<NextAction | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [showMessage, setShowMessage] = useState(false)
  const [message, setMessage] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }
    setVoiceSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition))
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/plan/next-action')
      if (res.ok) setAction(await res.json())
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
      if (res.ok) setAction(await res.json())
    } finally {
      setBusy(false)
    }
  }

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? message).trim()
    if (!action || busy || !text) return
    setBusy(true)
    try {
      const res = await fetch('/api/plan/next-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ logId: action.logId, action: 'message', message: text }) })
      const json = await res.json()
      if (json.changed && json.logId) {
        setAction(json)
        setNote(null)
      } else {
        setNote("Got it — didn't need to change anything.")
      }
      setMessage('')
      setShowMessage(false)
    } finally {
      setBusy(false)
    }
  }

  // Real voice input (2026-08-25: browser speech-to-text, not the deferred
  // Deepgram pipeline — that needs an account/env vars that were never set
  // up). Tapping the mic talks straight into the same message/NL path
  // everything else in this engine already uses — never a separate voice-
  // only flow. Falls back to opening the text box on unsupported browsers
  // instead of a dead button.
  const startVoice = () => {
    if (busy) return
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!Ctor) { setShowMessage(true); return }
    hapticTap()
    const recognition = new Ctor()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript
      if (transcript) sendMessage(transcript)
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognitionRef.current = recognition
    setListening(true)
    recognition.start()
  }

  const stopVoice = () => {
    recognitionRef.current?.stop()
    setListening(false)
  }

  // Tapping the instruction opens the one supporting screen the engine
  // already decided (prompt 3) — fallback/reward-question kinds have
  // nothing to expand into, so the button is inert for those.
  const expand = () => {
    if (!action) return
    const dest = EXPANSION_ROUTE[action.kind]
    if (dest) router.push(dest)
  }

  // Cinematic emerald/gold treatment — Asa's final pick, 2026-08-26, after a
  // live mockup review (published Artifact, several rounds: color family →
  // texture → font pairing → cinematic vignette → outer ring placement).
  const cardBg = 'radial-gradient(80% 60% at 50% 38%, rgba(229,169,60,0.14), transparent 60%), radial-gradient(140% 100% at 50% 115%, rgba(0,0,0,0.7), transparent 55%), linear-gradient(180deg, #06231a 0%, #021F16 45%, #010b07 100%)'

  if (loading) {
    return <div className="rounded-3xl animate-pulse" style={{ background: cardBg, border: '1.5px solid rgba(229,169,60,0.3)', minHeight: 360 }} />
  }

  if (!action) {
    return (
      <div className="rounded-3xl p-6 text-center" style={{ background: cardBg, border: '1.5px solid rgba(229,169,60,0.3)' }}>
        <p className="text-ivory/50 text-sm">Your next action will show up here once your plan is set up.</p>
      </div>
    )
  }

  return (
    <div className="rounded-3xl p-6" style={{ background: cardBg, border: '1.5px solid #E5A93C', boxShadow: '0 0 30px -6px rgba(229,169,60,0.3)' }}>
      <p className="text-[#E5A93C] text-[10px] uppercase tracking-[0.25em] font-bold mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>Right now</p>

      {/* The circle — generous room above/below it (Asa's ask, 2026-08-25:
          "more space between the circle and the done button") so it reads
          as the one dominant thing on the card, not squeezed against the
          controls underneath. */}
      <div className="relative flex items-center justify-center py-8">
        <button
          onClick={expand}
          disabled={!EXPANSION_ROUTE[action.kind]}
          className="relative rounded-full flex items-center justify-center text-center active:scale-[0.98] transition-transform"
          style={{
            width: 'clamp(220px, 68vw, 300px)', height: 'clamp(220px, 68vw, 300px)',
            background: 'conic-gradient(from 200deg, #E5A93C, #7fbf94, #0f7a53, #E5A93C)',
            boxShadow: '0 30px 50px -18px rgba(0,0,0,0.65)',
          }}
        >
          {/* Outer gold ring — hovers OUTSIDE the circle with a real gap
              (Asa's correction: a box-shadow ring blended into the edge
              instead of reading as separate). A distinct element on purpose.
              Pulses gently on its own (glow + scale, never the text inside)
              so the card reads as alive without moving what she's reading. */}
          <span aria-hidden className="absolute rounded-full pointer-events-none nac-ring-breathe" style={{ inset: -22, border: '2px solid #E5A93C' }} />
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
          <span className="relative font-semibold leading-snug px-9" style={{ zIndex: 2, color: '#0a2417', fontFamily: 'var(--font-poppins)', fontSize: 'clamp(15px, 4.2vw, 18px)' }}>{action.instruction}</span>
          <span
            onClick={(e) => { e.stopPropagation(); if (listening) { stopVoice() } else { startVoice() } }}
            role="button"
            aria-label={listening ? 'Stop listening' : 'Talk instead of typing'}
            className="absolute rounded-full flex items-center justify-center"
            style={{
              zIndex: 2, bottom: 28, left: '50%', transform: 'translateX(-50%)', width: 34, height: 34,
              background: listening ? 'rgba(233,160,160,0.9)' : 'rgba(0,0,0,0.32)',
              border: '1px solid rgba(255,255,255,0.35)',
              animation: listening ? 'nac-pulse 1.2s ease-in-out infinite' : undefined,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
              <path d="M19 11a7 7 0 0 1-14 0" />
              <path d="M12 18v4" />
            </svg>
          </span>
        </button>
      </div>
      <style>{`
        @keyframes nac-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(233,160,160,0.5); } 50% { box-shadow: 0 0 0 10px rgba(233,160,160,0); } }
        .nac-ring-breathe { animation: nac-ring-breathe 3.2s ease-in-out infinite; }
        @keyframes nac-ring-breathe {
          0%, 100% { box-shadow: 0 0 20px 1px rgba(229,169,60,0.3); transform: scale(1); }
          50% { box-shadow: 0 0 34px 6px rgba(229,169,60,0.55); transform: scale(1.025); }
        }
        @media (prefers-reduced-motion: reduce) { .nac-ring-breathe { animation: none; } }
      `}</style>

      {note && <p className="text-ivory/50 text-[11px] text-center mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>{note}</p>}
      {listening && <p className="text-[#E9A0A0] text-[11px] text-center mb-2 font-semibold" style={{ fontFamily: 'var(--font-poppins)' }}>Listening…</p>}

      {/* Small on purpose — the circle is the one thing on this screen;
          these are just the escape hatches, not a second focal point. */}
      <div className="flex flex-col items-center gap-1.5" style={{ fontFamily: 'var(--font-poppins)' }}>
        <button onClick={markDone} disabled={busy} className="bg-gold text-obsidian px-7 py-2 font-bold text-xs uppercase tracking-wider rounded-full active:scale-95 transition-transform disabled:opacity-60">
          {done ? 'Nice!' : 'Done'}
        </button>
        <div className="flex items-center justify-center gap-4">
          <button onClick={dayChanged} disabled={busy} className="text-ivory/50 text-[11px] font-semibold py-1.5 disabled:opacity-60">
            My day changed
          </button>
          <button onClick={() => setShowMessage((s) => !s)} disabled={busy} className="text-ivory/50 text-[11px] font-semibold py-1.5 disabled:opacity-60">
            Something else?
          </button>
        </div>
      </div>

      {showMessage && (
        <div className="mt-3 flex items-center gap-2" style={{ fontFamily: 'var(--font-poppins)' }}>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') sendMessage() }}
            placeholder={voiceSupported ? "Tell it what's going on…" : "Voice isn't supported on this browser — type here…"}
            className="flex-1 bg-black/20 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-ivory/30 focus:outline-none focus:border-gold/60"
          />
          <button onClick={() => sendMessage()} disabled={busy || !message.trim()} className="bg-white/10 border border-white/20 text-white text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-40">
            Send
          </button>
        </div>
      )}
    </div>
  )
}
