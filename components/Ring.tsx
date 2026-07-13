'use client'
import { useEffect, useState } from 'react'

// Animated progress ring (Apple-style). Fills to `pct` (0–100) with a smooth sweep.
export default function Ring({
  pct, size = 68, stroke = 7, color = '#f5a623', track = 'rgba(255,255,255,0.08)', children, animateOnMount = true,
}: {
  pct: number; size?: number; stroke?: number; color?: string; track?: string; children?: React.ReactNode; animateOnMount?: boolean
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.min(100, Math.max(0, pct))
  const [shown, setShown] = useState(animateOnMount ? 0 : clamped)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(clamped); return }
    const id = requestAnimationFrame(() => setShown(clamped))
    return () => cancelAnimationFrame(id)
  }, [clamped])
  const offset = c * (1 - shown / 100)
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset .85s cubic-bezier(.22,.61,.36,1)' }} />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  )
}
