'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

// Voice → text using the browser's built-in Speech Recognition (free, on-device,
// works on phone Chrome/Safari). Degrades gracefully (hidden) on browsers without
// support. Two modes:
//   - quick (default): single utterance, auto-stops and fires onResult right away
//     (food search, "talk to me" chat).
//   - continuous=true (voice memo): keeps listening across pauses so she can say
//     a longer, multi-sentence thought; onResult only fires once she taps stop,
//     with the FULL accumulated transcript.

function MicIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
      <line x1="12" y1="18" x2="12" y2="22" />
    </svg>
  )
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function VoiceButton({ onResult, onInterim, idleLabel = 'Speak what you ate', continuous = false, icon }: { onResult: (text: string) => void; onInterim?: (text: string) => void; idleLabel?: string; continuous?: boolean; icon?: ReactNode }) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const recRef = useRef<any>(null)
  const accumRef = useRef('')
  // Quick mode (continuous=false) should end right after she stops talking,
  // but some browsers' own silence detection is unreliable (notably iOS
  // Safari's webkitSpeechRecognition) and leave the mic visibly "on" well
  // after she's actually done — a real reported bug, not expected behavior.
  // This timer forces a stop after a short real pause with no new speech,
  // instead of trusting the browser's own end-of-speech detection alone.
  // Never applied in continuous mode — that one is SUPPOSED to keep
  // listening across pauses until she taps stop.
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clearSilenceTimer = () => { if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null } }

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    setSupported(true)
    const rec = new SR()
    rec.continuous = continuous
    rec.interimResults = true
    rec.lang = 'en-US'
    rec.onresult = (e: any) => {
      let finalText = '', interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += t
        else interim += t
      }
      if (continuous) {
        if (finalText) accumRef.current = `${accumRef.current} ${finalText}`.trim()
        if (onInterim) onInterim(`${accumRef.current} ${interim}`.trim())
      } else {
        if (interim && onInterim) onInterim(interim)
        if (finalText) onResult(finalText.trim())
        clearSilenceTimer()
        silenceTimerRef.current = setTimeout(() => { try { rec.stop() } catch { /* noop */ } }, 1500)
      }
    }
    rec.onend = () => {
      clearSilenceTimer()
      setListening(false)
      if (continuous && accumRef.current) { onResult(accumRef.current); accumRef.current = '' }
    }
    rec.onerror = () => { clearSilenceTimer(); setListening(false) }
    recRef.current = rec
    return () => { clearSilenceTimer(); try { rec.abort() } catch { /* noop */ } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [continuous])

  function toggle() {
    const rec = recRef.current
    if (!rec) return
    if (listening) { clearSilenceTimer(); try { rec.stop() } catch { /* noop */ } setListening(false); return }
    accumRef.current = ''
    try { rec.start(); setListening(true) } catch { /* noop */ }
  }

  if (!supported) return null

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={listening ? 'Stop listening' : idleLabel}
      className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center transition-all ${listening ? 'bg-red-500/90 text-white luf-glow scale-105' : 'bg-obsidian/60 border border-smoke text-ivory/70 hover:border-gold/50'}`}
    >
      {listening ? (
        <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" /><span className="relative inline-flex rounded-full h-3 w-3 bg-white" /></span>
      ) : (
        icon ?? <MicIcon />
      )}
    </button>
  )
}
