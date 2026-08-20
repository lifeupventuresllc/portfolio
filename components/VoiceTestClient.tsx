'use client'

import { useRef, useState } from 'react'
import { useDeepgramTranscription, type DeepgramFinalResult } from '@/lib/voice/useDeepgramTranscription'

type FileResult = {
  transcript: string
  confidence: number
  durationSeconds: number
  words: { word: string; start: number; end: number; confidence: number }[]
}

const LOW_CONFIDENCE_THRESHOLD = 0.6

export default function VoiceTestClient() {
  // ── Live mic ──────────────────────────────────────────────────────────
  const [liveInterim, setLiveInterim] = useState('')
  const [liveFinal, setLiveFinal] = useState<DeepgramFinalResult | null>(null)
  const [liveError, setLiveError] = useState<string | null>(null)
  const { listening, start, stop } = useDeepgramTranscription({
    onInterim: setLiveInterim,
    onFinal: (r) => { setLiveFinal(r); setLiveError(null) },
    onError: setLiveError,
  })

  // ── File upload ───────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileResult, setFileResult] = useState<FileResult | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [transcribing, setTranscribing] = useState(false)
  const [fileName, setFileName] = useState('')

  async function handleFile(f: File) {
    setFileName(f.name)
    setFileResult(null)
    setFileError(null)
    setTranscribing(true)
    try {
      const form = new FormData()
      form.append('audio', f)
      const res = await fetch('/api/voice/transcribe-file', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { setFileError(data?.error || 'Transcription failed.'); return }
      setFileResult(data as FileResult)
    } catch {
      setFileError('Transcription failed — network error.')
    } finally {
      setTranscribing(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-obsidian px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <p className="text-gold text-xs font-semibold uppercase tracking-wider mb-1">Voice pipeline test — Deepgram Nova-3</p>
          <h1 className="text-2xl font-bold text-white">Raw transcript, before anything else touches it</h1>
          <p className="text-ivory/50 text-sm mt-1">No chat, no LLM, no plan logic — this is Deepgram&apos;s output only.</p>
        </div>

        {/* Live mic — the same streaming path Coach Asa's chat uses */}
        <section className="bg-charcoal border border-smoke rounded-2xl p-5">
          <p className="text-white font-semibold mb-3">1. Live mic</p>
          <button
            type="button"
            onClick={() => { setLiveError(null); if (listening) stop(); else start() }}
            className={`px-5 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${listening ? 'bg-red-500 text-white' : 'bg-gold text-obsidian'}`}
          >
            {listening ? 'Stop' : 'Start talking'}
          </button>
          {listening && <p className="text-ivory/40 text-xs mt-3">Live: <span className="text-white">{liveInterim || '…'}</span></p>}
          {liveError && <p className="text-red-400 text-sm mt-3">{liveError}</p>}
          {liveFinal && (
            <div className="mt-4 bg-obsidian border border-smoke rounded-xl p-4">
              <p className="text-gold text-[10px] uppercase tracking-wider font-semibold mb-1">Raw transcript</p>
              <p className="text-white text-sm mb-3">{liveFinal.transcript || '(empty)'}</p>
              <div className="flex gap-4 text-xs">
                <span className={liveFinal.confidence < LOW_CONFIDENCE_THRESHOLD ? 'text-amber-400' : 'text-ivory/50'}>
                  Confidence: {(liveFinal.confidence * 100).toFixed(0)}%{liveFinal.lowConfidence && ' — LOW'}
                </span>
                <span className="text-ivory/50">Duration: {liveFinal.durationSeconds.toFixed(1)}s</span>
              </div>
            </div>
          )}
        </section>

        {/* File upload — reproducible testing against a fixed sample clip */}
        <section className="bg-charcoal border border-smoke rounded-2xl p-5">
          <p className="text-white font-semibold mb-3">2. Upload a sample audio file</p>
          <input
            ref={fileInputRef} type="file" accept="audio/*"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            className="text-ivory/60 text-sm file:mr-3 file:px-4 file:py-2 file:rounded-xl file:border-0 file:bg-gold file:text-obsidian file:font-bold file:text-xs file:uppercase"
          />
          {transcribing && <p className="text-ivory/40 text-sm mt-3">Transcribing {fileName}…</p>}
          {fileError && <p className="text-red-400 text-sm mt-3">{fileError}</p>}
          {fileResult && (
            <div className="mt-4 space-y-4">
              <div className="bg-obsidian border border-smoke rounded-xl p-4">
                <p className="text-gold text-[10px] uppercase tracking-wider font-semibold mb-1">Raw transcript</p>
                <p className="text-white text-sm mb-3">{fileResult.transcript || '(empty)'}</p>
                <div className="flex gap-4 text-xs">
                  <span className={fileResult.confidence < LOW_CONFIDENCE_THRESHOLD ? 'text-amber-400' : 'text-ivory/50'}>
                    Overall confidence: {(fileResult.confidence * 100).toFixed(0)}%
                  </span>
                  <span className="text-ivory/50">Duration: {fileResult.durationSeconds.toFixed(1)}s</span>
                  <span className="text-ivory/50">{fileResult.words.length} words</span>
                </div>
              </div>
              {fileResult.words.length > 0 && (
                <div className="bg-obsidian border border-smoke rounded-xl p-4 overflow-x-auto">
                  <p className="text-gold text-[10px] uppercase tracking-wider font-semibold mb-2">Word-level confidence — lowest first</p>
                  <table className="text-xs w-full">
                    <thead><tr className="text-ivory/40 text-left"><th className="pr-4 py-1">Word</th><th className="pr-4 py-1">Start</th><th className="pr-4 py-1">Confidence</th></tr></thead>
                    <tbody>
                      {[...fileResult.words].sort((a, b) => a.confidence - b.confidence).slice(0, 15).map((w, i) => (
                        <tr key={i} className="border-t border-smoke/50">
                          <td className="pr-4 py-1 text-white">{w.word}</td>
                          <td className="pr-4 py-1 text-ivory/40">{w.start.toFixed(2)}s</td>
                          <td className={`pr-4 py-1 ${w.confidence < LOW_CONFIDENCE_THRESHOLD ? 'text-amber-400 font-semibold' : 'text-ivory/60'}`}>{(w.confidence * 100).toFixed(0)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
