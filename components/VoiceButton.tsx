'use client'

import { useEffect, useRef, useState } from 'react'

// Voice → text using the browser's built-in Speech Recognition (free, on-device,
// works on phone Chrome/Safari). Degrades gracefully (hidden) on browsers without
// support. Two modes:
//   - quick (default): single utterance, auto-stops and fires onResult right away
//     (food search, "talk to me" chat).
//   - continuous=true (voice memo): keeps listening across pauses so she can say
//     a longer, multi-sentence thought; onResult only fires once she taps stop,
//     with the FULL accumulated transcript.

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function VoiceButton({ onResult, onInterim, idleLabel = 'Speak what you ate', continuous = false, icon = '🎤' }: { onResult: (text: string) => void; onInterim?: (text: string) => void; idleLabel?: string; continuous?: boolean; icon?: string }) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const recRef = useRef<any>(null)
  const accumRef = useRef('')

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
      }
    }
    rec.onend = () => {
      setListening(false)
      if (continuous && accumRef.current) { onResult(accumRef.current); accumRef.current = '' }
    }
    rec.onerror = () => setListening(false)
    recRef.current = rec
    return () => { try { rec.abort() } catch { /* noop */ } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [continuous])

  function toggle() {
    const rec = recRef.current
    if (!rec) return
    if (listening) { try { rec.stop() } catch { /* noop */ } setListening(false); return }
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
        <span className="text-lg">{icon}</span>
      )}
    </button>
  )
}
