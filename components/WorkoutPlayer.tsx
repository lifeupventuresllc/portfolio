'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Ring from '@/components/Ring'
import { buildSteps, dayLabels, type WorkoutStep } from '@/lib/workout-steps'
import type { WorkoutProgram } from '@/lib/workout'

export default function WorkoutPlayer({ program, firstName }: { program: WorkoutProgram; firstName: string }) {
  const router = useRouter()
  const [dayIdx, setDayIdx] = useState<number | null>(null)
  const [steps, setSteps] = useState<WorkoutStep[]>([])
  const [i, setI] = useState(0)
  const [left, setLeft] = useState<number | null>(null)
  const [paused, setPaused] = useState(false)
  const [done, setDone] = useState(false)
  const tick = useRef<ReturnType<typeof setInterval> | null>(null)

  const start = (d: number) => { setDayIdx(d); setSteps(buildSteps(program, d)); setI(0); setDone(false) }
  const step = steps[i]

  // (re)arm timer whenever the step changes
  useEffect(() => {
    if (tick.current) { clearInterval(tick.current); tick.current = null }
    if (step?.seconds) setLeft(step.seconds); else setLeft(null)
  }, [i, step?.seconds])

  // run the countdown
  useEffect(() => {
    if (left == null || paused) return
    if (left <= 0) { advance(); return }
    tick.current = setInterval(() => setLeft((l) => (l == null ? l : l - 1)), 1000)
    return () => { if (tick.current) clearInterval(tick.current) }
  }, [left, paused])

  function advance() {
    if (i + 1 >= steps.length) { finish() } else setI(i + 1)
  }
  function finish() {
    setDone(true)
    fetch('/api/plan/daily', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workout: true }) }).catch(() => {})
  }

  const labels = dayLabels(program)

  // ---------- Day picker ----------
  if (dayIdx === null) {
    return (
      <div className="max-w-lg mx-auto">
        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-2">Guided Session</p>
        <h1 className="text-3xl font-bold text-white mb-2">Let&apos;s train, {firstName} 💪🏽</h1>
        <p className="text-ivory/50 text-sm mb-7">Pick today&apos;s session — I&apos;ll walk you through every move, rep, and rest.</p>
        <div className="space-y-3">
          {labels.map((l, d) => (
            <button key={d} onClick={() => start(d)} className="w-full text-left bg-charcoal border border-smoke rounded-2xl p-5 hover:border-gold/60 transition-colors flex items-center justify-between group">
              <span className="text-white font-semibold">{l}</span>
              <span className="text-gold text-xl group-hover:translate-x-1 transition-transform">▶</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ---------- Finished ----------
  if (done) {
    return (
      <div className="max-w-lg mx-auto text-center q-in-fwd py-10">
        <p className="text-6xl mb-4">🔥</p>
        <h1 className="text-3xl font-bold text-white mb-2">That&apos;s done, {firstName}.</h1>
        <p className="text-ivory/60 text-sm mb-8">You showed up and you finished. That&apos;s the whole game. I logged it for your streak.</p>
        <button onClick={() => router.push('/plan')} className="luf-glow w-full bg-gold text-obsidian px-8 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl">Back to my plan</button>
        <p className="text-gold text-sm font-semibold mt-4">— Coach Asa</p>
      </div>
    )
  }

  if (!step) return null
  const isTimed = step.seconds != null
  const pct = isTimed && left != null ? (left / step.seconds!) * 100 : 0
  const progress = Math.round(((i + 1) / steps.length) * 100)

  return (
    <div className="max-w-lg mx-auto flex flex-col min-h-[80vh]">
      {/* progress */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.push('/plan')} className="text-ivory/40 hover:text-gold text-sm">✕</button>
        <div className="flex-1 h-1.5 bg-charcoal rounded-full overflow-hidden"><div className="h-full bg-gold rounded-full transition-all duration-500" style={{ width: `${progress}%` }} /></div>
        <span className="text-ivory/40 text-xs tabular-nums">{i + 1}/{steps.length}</span>
      </div>

      <div key={i} className="q-in-fwd flex-1 flex flex-col items-center justify-center text-center">
        <p className={`text-xs font-semibold tracking-[0.2em] uppercase mb-5 ${step.rest ? 'text-green-400' : 'text-gold'}`}>{step.phase}</p>

        {isTimed ? (
          <Ring pct={pct} size={200} stroke={10} color={step.rest ? '#46c46f' : '#f5a623'} animateOnMount={false}>
            <div>
              <p className="text-5xl font-bold text-white tabular-nums">{left}</p>
              <p className="text-ivory/40 text-xs uppercase tracking-wider">seconds</p>
            </div>
          </Ring>
        ) : (
          <div className="w-[200px] h-[200px] rounded-full border-2 border-gold/20 flex items-center justify-center mb-2"><span className="text-6xl">🏋🏽</span></div>
        )}

        <h1 className="text-3xl font-bold text-white mt-7 mb-1 leading-tight text-balance">{step.name}</h1>
        {step.detail && <p className="text-gold font-semibold mb-3">{step.detail}</p>}
        {step.cue && <p className="text-ivory/55 text-sm max-w-sm leading-relaxed">{step.cue}</p>}
      </div>

      {/* controls */}
      <div className="mt-8">
        <div className="flex gap-3">
          <button onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0} className="px-5 py-4 rounded-2xl bg-charcoal border border-smoke text-ivory/60 disabled:opacity-30">←</button>
          {isTimed ? (
            <button onClick={() => setPaused((p) => !p)} className="flex-1 bg-charcoal border border-gold/40 text-gold px-6 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl">{paused ? 'Resume' : 'Pause'}</button>
          ) : (
            <button onClick={advance} className="luf-glow flex-1 bg-gold text-obsidian px-6 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl">Done — Next →</button>
          )}
          <button onClick={advance} className="px-5 py-4 rounded-2xl bg-charcoal border border-smoke text-ivory/60">→</button>
        </div>
        {isTimed && <button onClick={advance} className="w-full text-center text-ivory/40 text-xs mt-3 hover:text-gold">Skip →</button>}
      </div>
    </div>
  )
}
