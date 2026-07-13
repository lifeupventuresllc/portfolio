'use client'
import { useEffect, useRef, useState } from 'react'

// Animate a number up from 0 → value. Respects reduced-motion.
export default function CountUp({ value, duration = 1100, suffix = '', className = '' }: { value: number; duration?: number; suffix?: string; className?: string }) {
  const [n, setN] = useState(0)
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(value); return }
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
      setN(Math.round(value * eased))
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [value, duration])
  return <span className={className}>{n.toLocaleString()}{suffix}</span>
}
