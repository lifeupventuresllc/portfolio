'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { heroCopy } from '@/lib/next-action/plain-copy'
import { hapticTap } from '@/lib/haptics'

// 2026-11-06 (Asa: "show today's workout here, not the water"): the bar now
// shows the same workout My Day's FITNESS card shows. My Day (Screen 1, a
// server component) already works out today's workout, so it hands it up
// through this context via <WinBarWorkout /> — one answer, never a second
// copy of the workout pick. No workout on hand (no plan yet) = the old
// next-action win, as before.
export type WinWorkout = { name: string; minutes?: number | null; done: boolean }
const WinWorkoutCtx = createContext<(w: WinWorkout | null) => void>(() => {})
export const WinWorkoutProvider = WinWorkoutCtx.Provider

export function WinBarWorkout(w: WinWorkout) {
  const set = useContext(WinWorkoutCtx)
  const { name, minutes, done } = w
  useEffect(() => { set({ name, minutes, done }); return () => set(null) }, [set, name, minutes, done])
  return null
}

// The small "Your win for today" bar pinned to the bottom of the feed (Asa's
// two-core-screens spec, 2026-09-28). Tap = the workout (or back to Screen 1
// once it's done).
export default function WinBar({ onClick, workout }: { onClick: () => void; workout?: WinWorkout | null }) {
  const [text, setText] = useState<string | null>(null)

  const load = async () => {
    if (workout) return
    try {
      const res = await fetch('/api/plan/next-action')
      if (!res.ok) return
      const a = await res.json()
      if (a?.instruction) setText(heroCopy(a.kind, a.instruction).headline)
    } catch { /* the bar just keeps its label */ }
  }
  useLiveRefresh(load)

  const shown = workout
    ? (workout.done ? `Done: ${workout.name}` : `${workout.name}${workout.minutes ? ` · ${workout.minutes} min` : ''}`)
    : text

  // 2026-10-26 (Asa: "I don't like the circle… match all the new font and
  // feel, the button also"): no ring, a slim dark card in the app's new look,
  // mono label, the win in Barlow italic, one gold pill. Same tap.
  const MONO = "var(--font-jbmono), 'JetBrains Mono', monospace"
  return (
    <button
      type="button"
      onClick={() => { hapticTap(); onClick() }}
      aria-label={workout && !workout.done ? "Open today's workout" : 'Back to your win for today'}
      className="nf-press w-full flex items-center gap-3 rounded-[20px] pl-4 pr-2 py-2 text-left"
      style={{ background: 'rgba(2,31,22,0.92)', border: '1px solid rgba(237,231,218,.14)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', boxShadow: '0 8px 24px rgba(0,0,0,.4)' }}
    >
      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.14em', color: '#E5A93C' }}>YOUR WIN FOR TODAY</span>
        <span className="block truncate" style={{ fontFamily: "var(--font-barlow), 'Barlow Condensed', sans-serif", fontStyle: 'italic', fontWeight: 800, fontSize: 20, lineHeight: 1.05, textTransform: 'uppercase', color: '#EDE7DA' }}>{shown || 'Already planned for you'}</span>
      </span>
      <span className="shrink-0 h-10 px-4 rounded-full flex items-center" style={{ background: '#E5A93C', color: '#021F16', fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.1em' }}>SHOW ME</span>
    </button>
  )
}
