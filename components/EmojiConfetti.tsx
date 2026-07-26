'use client'
import { useEffect, useState } from 'react'

const EMOJIS = ['💪🏽', '👏', '🏋🏽‍♀️', '🔥', '👏', '💪🏽', '✨', '👏']

// Same falling-and-fading animation as components/Confetti.tsx (reuses the
// existing `luf-confetti`/`lufConfetti` CSS keyframe), but with workout +
// clap emojis instead of colored rectangles — the "she just won something"
// moment for Find Your Fix's result reveal.
export default function EmojiConfetti({ fire, onDone }: { fire: boolean; onDone?: () => void }) {
  const [pieces, setPieces] = useState<number[]>([])
  useEffect(() => {
    if (!fire) return
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { onDone?.(); return }
    setPieces(Array.from({ length: 32 }, (_, i) => i))
    const t = setTimeout(() => { setPieces([]); onDone?.() }, 2600)
    return () => clearTimeout(t)
  }, [fire]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!pieces.length) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
      {pieces.map((i) => {
        const left = (i * 3.1) % 100
        const delay = (i % 10) * 0.06
        const dur = 2.0 + (i % 7) * 0.16
        const size = 20 + (i % 3) * 6
        return (
          <span
            key={i}
            className="luf-confetti absolute top-[-32px]"
            style={{ left: `${left}%`, fontSize: size, animationDelay: `${delay}s`, animationDuration: `${dur}s` }}
          >
            {EMOJIS[i % EMOJIS.length]}
          </span>
        )
      })}
    </div>
  )
}
