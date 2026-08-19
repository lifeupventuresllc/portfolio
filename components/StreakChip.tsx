'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useLiveRefresh } from '@/lib/useLiveRefresh'

function FlameIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2c1 3-2 4-2 7a3 3 0 0 0 6 0c2 1 3 3 3 5a7 7 0 1 1-14 0c0-4 3-6 4-9 1 1 1 2 1 3 1-1 2-3 2-6z" />
    </svg>
  )
}

// Small live streak chip for the dashboard header. Kept subtle so the home stays
// simple, but present — the streak is the strongest reason to come back tomorrow.
// Links to /plan/checkin — streak is a consistency stat, that's where the fuller
// consistency detail lives.
export default function StreakChip() {
  const [streak, setStreak] = useState<number | null>(null)
  useLiveRefresh(() => {
    fetch('/api/plan/daily').then((r) => r.json()).then((d) => setStreak(Number(d?.streak) || 0)).catch(() => {})
  })
  if (streak == null || streak < 1) return null
  return (
    <Link href="/plan/checkin" className="inline-flex items-center gap-1 mt-1 text-[#E5A93C] text-sm font-bold hover:opacity-80 transition-opacity" title={`${streak}-day streak`}>
      <FlameIcon />{streak} day{streak === 1 ? '' : 's'}
    </Link>
  )
}
