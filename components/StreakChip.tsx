'use client'

import { useState } from 'react'
import { useLiveRefresh } from '@/lib/useLiveRefresh'

// Small live 🔥 streak chip for the dashboard header. Kept subtle so the home stays
// simple, but present — the streak is the strongest reason to come back tomorrow.
export default function StreakChip() {
  const [streak, setStreak] = useState<number | null>(null)
  useLiveRefresh(() => {
    fetch('/api/plan/daily').then((r) => r.json()).then((d) => setStreak(Number(d?.streak) || 0)).catch(() => {})
  })
  if (streak == null || streak < 1) return null
  return (
    <span className="inline-flex items-center gap-1 mt-1 text-gold text-sm font-bold" title={`${streak}-day streak`}>
      <span className="luf-flame">🔥</span>{streak} day{streak === 1 ? '' : 's'}
    </span>
  )
}
