'use client'
import { useEffect, useState } from 'react'

// Lightweight CSS confetti burst — zero dependencies. Renders ~44 pieces that fall
// and fade, then unmounts itself. Renders nothing when reduced-motion is requested.
export default function Confetti({ fire, onDone }: { fire: boolean; onDone?: () => void }) {
  const [pieces, setPieces] = useState<number[]>([])
  useEffect(() => {
    if (!fire) return
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { onDone?.(); return }
    setPieces(Array.from({ length: 44 }, (_, i) => i))
    const t = setTimeout(() => { setPieces([]); onDone?.() }, 2800)
    return () => clearTimeout(t)
  }, [fire]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!pieces.length) return null
  const colors = ['#f5a623', '#c9a84c', '#46c46f', '#ffffff', '#ffd76a']
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
      {pieces.map((i) => {
        const left = (i * 2.27) % 100
        const delay = (i % 10) * 0.05
        const dur = 1.9 + (i % 7) * 0.18
        const size = 7 + (i % 4) * 2
        return (
          <span
            key={i}
            className="luf-confetti absolute top-[-24px]"
            style={{ left: `${left}%`, width: size, height: size * 1.6, background: colors[i % colors.length],
              borderRadius: 2, animationDelay: `${delay}s`, animationDuration: `${dur}s` }}
          />
        )
      })}
    </div>
  )
}
