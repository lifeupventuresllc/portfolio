'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { CompoundExercise } from '@/lib/compound-exercises'

export default function CompoundDayClient({ exercises }: { exercises: CompoundExercise[] }) {
  const router = useRouter()
  const [done, setDone] = useState<Set<number>>(new Set())
  const [finished, setFinished] = useState(false)

  function toggle(i: number) {
    setDone((s) => {
      const next = new Set(s)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  async function finish() {
    setFinished(true)
    try {
      await fetch('/api/plan/daily', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workout: true }) })
    } catch { /* noop */ }
    setTimeout(() => router.push('/plan'), 1800)
  }

  if (finished) {
    return (
      <div className="bg-charcoal border border-gold/40 rounded-3xl p-8 text-center">
        <p className="text-white font-semibold text-lg mb-2">🔥 That&apos;s a full-body burn done.</p>
        <p className="text-ivory/60 text-sm">Logged for today. Heading back to your plan…</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {exercises.map((ex, i) => (
        <button
          key={ex.name}
          onClick={() => toggle(i)}
          className={`w-full text-left rounded-2xl border px-5 py-4 transition-all ${done.has(i) ? 'bg-gold/10 border-gold/50' : 'bg-charcoal border-smoke'}`}
        >
          <div className="flex items-start justify-between gap-3">
            {ex.imageUrl && (
              <div className="shrink-0 h-14 w-14 rounded-xl overflow-hidden border border-smoke">
                <Image src={ex.imageUrl} alt={ex.name} width={56} height={56} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1">
              <p className={`font-semibold text-sm ${done.has(i) ? 'text-gold' : 'text-white'}`}>{ex.name}</p>
              <p className="text-ivory/50 text-xs mt-1">{ex.cue}</p>
              <p className="text-ivory/40 text-xs mt-1.5 uppercase tracking-wider">{ex.reps} · {ex.equip}</p>
            </div>
            <span className={`shrink-0 h-6 w-6 rounded-full border flex items-center justify-center text-xs ${done.has(i) ? 'bg-gold border-gold text-obsidian' : 'border-smoke text-ivory/30'}`}>
              {done.has(i) ? '✓' : ''}
            </span>
          </div>
        </button>
      ))}
      <button
        onClick={finish}
        className="w-full bg-gold text-obsidian px-6 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl mt-4 hover:scale-[1.02] active:scale-95 transition-transform"
      >
        Finish workout
      </button>
    </div>
  )
}
