'use client'

import { useCallback, useRef, useState } from 'react'

// Live voice → text via Deepgram Nova-3, streamed directly from the browser
// over a WebSocket (no server relay — Vercel's serverless functions can't
// hold a persistent connection anyway). Replaces the browser's built-in
// SpeechRecognition (components/VoiceButton.tsx) at the two places accuracy
// actually matters: Coach Asa's chat and anything that feeds a real plan.
//
// Deliberately manual start/stop, not auto-stop-on-pause. The reported bug
// with the old system — "the mic stops while I'm talking, only get two or
// three words" — was the browser's own (especially iOS Safari's) end-of-speech
// detection firing on ordinary mid-sentence pauses, exactly the kind fragmented
/// run-on dictation speech is full of. Deepgram's `endpointing`/`utterance_end_ms`
// below only mark where ONE spoken segment ends for transcription purposes —
// they never close the connection or stop the mic. Only stop() does, and
// that's a real deliberate tap, matching the request's "handle fragmented/
// run-on speech accurately — don't assume clean sentence boundaries."
//
// No silent post-processing: requested with punctuate=false&smart_format=false,
// so what comes back is the most literal read Deepgram has of what was said —
// no punctuation/number/formatting heuristics quietly reshaping the words. If
// a caller wants a cleaned-up version for display, that has to be a distinct,
// visible step — see components/DeepgramVoiceInput.tsx.

const LOW_CONFIDENCE_THRESHOLD = 0.6

/* eslint-disable @typescript-eslint/no-explicit-any */
// Transparent fallback to the browser's built-in recognition (the same engine
// components/VoiceButton.tsx already used) for the window between shipping
// this and DEEPGRAM_API_KEY/DEEPGRAM_PROJECT_ID actually being set in Vercel.
// Only triggers on a 503 "not configured" response from /api/voice/token —
// never on a real failure (bad mic, dropped connection, low confidence),
// so it can't mask an actual Deepgram problem as if voice input just works.
// No confidence signal exists on this path, so lowConfidence always reads
// false here — exactly the same blind spot the app already shipped with
// before this build, not a new one.
function startBrowserFallback(opts: { onInterim?: (text: string) => void; onFinal: (r: DeepgramFinalResult) => void; onError?: (message: string) => void }): { stop: () => void } | null {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SR) { opts.onError?.('Voice transcription is not configured yet, and this browser has no built-in fallback.'); return null }
  const rec = new SR()
  rec.continuous = true
  rec.interimResults = true
  rec.lang = 'en-US'
  let accumulated = ''
  const startedAt = Date.now()
  rec.onresult = (e: any) => {
    let finalText = '', interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript
      if (e.results[i].isFinal) finalText += t; else interim += t
    }
    if (finalText) accumulated = `${accumulated} ${finalText}`.trim()
    opts.onInterim?.(`${accumulated} ${interim}`.trim())
  }
  rec.onerror = () => opts.onError?.('Voice input failed — try again or type it.')
  rec.onend = () => opts.onFinal({ transcript: accumulated, confidence: 0, lowConfidence: false, durationSeconds: (Date.now() - startedAt) / 1000 })
  try { rec.start() } catch { opts.onError?.('Could not start voice input.'); return null }
  return { stop: () => { try { rec.stop() } catch { /* noop */ } } }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export type DeepgramFinalResult = {
  transcript: string
  confidence: number
  lowConfidence: boolean
  durationSeconds: number
}

export function deepgramSupported(): boolean {
  if (typeof window === 'undefined') return false
  return !!(navigator.mediaDevices && (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) && (window as unknown as { AudioWorkletNode?: unknown }).AudioWorkletNode && window.WebSocket)
}

export function useDeepgramTranscription(opts: {
  onInterim?: (text: string) => void
  onFinal: (result: DeepgramFinalResult) => void
  onError?: (message: string) => void
}) {
  const [listening, setListening] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const workletRef = useRef<AudioWorkletNode | null>(null)
  const finalTextRef = useRef('')
  const interimTextRef = useRef('')
  const confidencesRef = useRef<number[]>([])
  const startedAtRef = useRef(0)
  const stoppingRef = useRef(false)
  const fallbackRef = useRef<{ stop: () => void } | null>(null)

  const cleanup = useCallback(() => {
    try { workletRef.current?.disconnect() } catch { /* noop */ }
    try { audioCtxRef.current?.close() } catch { /* noop */ }
    try { streamRef.current?.getTracks().forEach((t) => t.stop()) } catch { /* noop */ }
    workletRef.current = null
    audioCtxRef.current = null
    streamRef.current = null
    if (wsRef.current && wsRef.current.readyState <= 1) { try { wsRef.current.close() } catch { /* noop */ } }
    wsRef.current = null
    setListening(false)
    stoppingRef.current = false
  }, [])

  const finish = useCallback(() => {
    const transcript = `${finalTextRef.current} ${interimTextRef.current}`.trim()
    const confidences = confidencesRef.current
    const confidence = confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0
    const lowConfidence = !transcript || confidence < LOW_CONFIDENCE_THRESHOLD
    opts.onFinal({ transcript, confidence, lowConfidence, durationSeconds: (Date.now() - startedAtRef.current) / 1000 })
    finalTextRef.current = ''
    interimTextRef.current = ''
    confidencesRef.current = []
    cleanup()
  }, [cleanup, opts])

  const stop = useCallback(() => {
    if (fallbackRef.current) { fallbackRef.current.stop(); fallbackRef.current = null; return }
    if (!wsRef.current || stoppingRef.current) { cleanup(); return }
    stoppingRef.current = true
    // Stop capturing new audio immediately; ask Deepgram to flush whatever's
    // already buffered so the last couple words aren't lost, then finish
    // shortly after (or as soon as it confirms closed) rather than cutting
    // the connection cold.
    try { workletRef.current?.disconnect() } catch { /* noop */ }
    try { streamRef.current?.getTracks().forEach((t) => t.stop()) } catch { /* noop */ }
    try { wsRef.current.send(JSON.stringify({ type: 'CloseStream' })) } catch { /* noop */ }
    const grace = setTimeout(finish, 1200)
    const ws = wsRef.current
    ws.addEventListener('close', () => { clearTimeout(grace); finish() }, { once: true })
  }, [cleanup, finish])

  const start = useCallback(async () => {
    if (listening) return
    finalTextRef.current = ''
    interimTextRef.current = ''
    confidencesRef.current = []
    startedAtRef.current = Date.now()

    const fallbackOpts = {
      onInterim: opts.onInterim,
      onFinal: (r: DeepgramFinalResult) => { fallbackRef.current = null; setListening(false); opts.onFinal(r) },
      onError: (m: string) => { fallbackRef.current = null; setListening(false); opts.onError?.(m) },
    }

    if (!deepgramSupported()) {
      // This browser can't do the AudioWorklet/PCM streaming path at all
      // (older Safari, etc.) — try the native fallback directly rather than
      // just failing, since its browser-support floor is different (and
      // usually lower) than what Deepgram streaming needs.
      const fb = startBrowserFallback(fallbackOpts)
      if (fb) { fallbackRef.current = fb; setListening(true) }
      return
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })
    } catch {
      opts.onError?.('Microphone access was blocked — check your browser/site permissions.')
      return
    }
    streamRef.current = stream

    let tokenRes: Response
    try {
      tokenRes = await fetch('/api/voice/token', { method: 'POST' })
    } catch {
      opts.onError?.("Couldn't start voice transcription — check your connection and try again.")
      cleanup(); return
    }
    if (tokenRes.status === 503) {
      // Not configured yet (DEEPGRAM_API_KEY/DEEPGRAM_PROJECT_ID missing) —
      // transparent fallback to the browser's built-in recognition so voice
      // input keeps working, just without the accuracy fix, until the key's
      // added. Release the mic stream grabbed above; the fallback API
      // manages its own mic access internally.
      try { stream.getTracks().forEach((t) => t.stop()) } catch { /* noop */ }
      streamRef.current = null
      const fb = startBrowserFallback(fallbackOpts)
      if (fb) { fallbackRef.current = fb; setListening(true) }
      return
    }
    if (!tokenRes.ok) {
      const body = await tokenRes.json().catch(() => ({}))
      opts.onError?.(body?.error || 'Voice transcription is unavailable right now.')
      cleanup(); return
    }
    const { key } = await tokenRes.json()

    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const audioCtx = new AC({ sampleRate: 16000 })
    audioCtxRef.current = audioCtx
    const actualSampleRate = audioCtx.sampleRate // browsers may not honor the hint above — always trust the real value

    const params = new URLSearchParams({
      model: 'nova-3', language: 'en-US', encoding: 'linear16', sample_rate: String(actualSampleRate),
      channels: '1', interim_results: 'true', punctuate: 'false', smart_format: 'false',
      endpointing: '800', utterance_end_ms: '1500', vad_events: 'true',
    })
    const ws = new WebSocket(`wss://api.deepgram.com/v1/listen?${params.toString()}`, ['token', key])
    wsRef.current = ws

    ws.onerror = () => { opts.onError?.('Voice transcription connection failed.'); cleanup() }
    ws.onclose = (e) => {
      if (!stoppingRef.current && e.code !== 1000) { opts.onError?.('Voice transcription connection dropped.'); cleanup() }
    }
    ws.onmessage = (e) => {
      let data: { type?: string; is_final?: boolean; channel?: { alternatives?: { transcript?: string; confidence?: number }[] } }
      try { data = JSON.parse(e.data) } catch { return }
      if (data.type !== 'Results') return
      const alt = data.channel?.alternatives?.[0]
      const text = alt?.transcript || ''
      if (!text) return
      if (data.is_final) {
        finalTextRef.current = `${finalTextRef.current} ${text}`.trim()
        interimTextRef.current = ''
        if (typeof alt?.confidence === 'number') confidencesRef.current.push(alt.confidence)
      } else {
        interimTextRef.current = text
      }
      opts.onInterim?.(`${finalTextRef.current} ${interimTextRef.current}`.trim())
    }

    ws.onopen = async () => {
      try {
        await audioCtx.audioWorklet.addModule('/worklets/pcm-capture-processor.js')
        const source = audioCtx.createMediaStreamSource(stream)
        const worklet = new AudioWorkletNode(audioCtx, 'pcm-capture-processor')
        worklet.port.onmessage = (ev: MessageEvent<ArrayBuffer>) => {
          if (ws.readyState === WebSocket.OPEN) ws.send(ev.data)
        }
        source.connect(worklet)
        workletRef.current = worklet
        setListening(true)
      } catch {
        opts.onError?.('Could not start audio capture.')
        cleanup()
      }
    }
  }, [listening, opts, cleanup])

  return { listening, start, stop, supported: deepgramSupported }
}
