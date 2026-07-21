'use client'

import { useEffect, useRef, useState } from 'react'

// Voice → text using the browser's built-in Speech Recognition (free, on-device,
// works on phone Chrome/Safari). Tap, say what you ate, it fills the search box.
// Degrades gracefully (hidden) on browsers without support.

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function VoiceButton({ onResult, onInterim, idleLabel = 'Speak what you ate' }: { onResult: (text: string) => void; onInterim?: (text: string) => void; idleLabel?: string }) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const recRef = useRef<any>(null)

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    setSupported(true)
    const rec = new SR()
    rec.continuous = false
    rec.interimResults = true
    rec.lang = 'en-US'
    rec.onresult = (e: any) => {
      let finalText = '', interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += t
        else interim += t
      }
      if (interim && onInterim) onInterim(interim)
      if (finalText) onResult(finalText.trim())
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    return () => { try { rec.abort() } catch { /* noop */ } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggle() {
    const rec = recRef.current
    if (!rec) return
    if (listening) { try { rec.stop() } catch { /* noop */ } setListening(false); return }
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
        <span className="text-lg">🎤</span>
      )}
    </button>
  )
}
