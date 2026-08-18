'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useLiveRefresh } from '@/lib/useLiveRefresh'

// The 3 things she reaches for most, one tap away, always in the same place —
// zero decisions about where to find anything. Everything else (cookbook,
// exercise library, extras) still lives one layer deeper via the ☰ menu on
// the main dashboard; this bar is just the daily-use fast path.
//
// The middle slot IS the progress bar itself (not a background strip under a
// separate icon) — same goal-weight-progress % as the dashboard's
// GoalProgressBar, fetched from /api/plan/nav-progress since this bar renders
// on every /plan/* page, not just the dashboard.
function RunningMarker() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" fill="none" stroke="#021F16" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="31" cy="9" r="3.4" fill="none" />
      <path d="M29,14 L21,26" />
      <path d="M21,26 L28,33 L34,39" />
      <path d="M21,26 L13,29 L8,23" />
      <path d="M27,16 L34,20 L30,26" />
      <path d="M25,17 L17,15 L11,19" />
    </svg>
  )
}

function HeartIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" fill={active ? '#E5A93C' : 'rgba(237,231,218,0.4)'}>
      <path d="M24,42 C24,42 6,30 6,17 C6,9 12,4 18,4 C21,4 23.5,6 24,9 C24.5,6 27,4 30,4 C36,4 42,9 42,17 C42,30 24,42 24,42 Z" />
    </svg>
  )
}

export default function BottomTabBar() {
  const pathname = usePathname() || ''
  const [pct, setPct] = useState(0)

  useLiveRefresh(() => {
    fetch('/api/plan/nav-progress').then((r) => r.json()).then((d) => setPct(Math.max(0, Math.min(100, Number(d?.pct) || 0)))).catch(() => {})
  })

  // Hidden during intake — she hasn't reached her actual dashboard yet, so
  // For You/Community don't have anywhere real to point her to. Shows up
  // starting the moment she lands on her real dashboard, not before.
  if (pathname.startsWith('/plan/intake')) return null

  const forYouActive = pathname === '/plan' || pathname.startsWith('/plan/today')
  const communityActive = pathname.startsWith('/plan/community')

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#011611] border-t border-white/5 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-2xl mx-auto grid grid-cols-[1fr_1.4fr_1fr] items-center px-2 py-3">
        <Link href="/plan/today" className="flex flex-col items-center gap-1">
          <Image src="/images/brand/foryou-icon.png" alt="" width={22} height={22} className="object-contain" style={{ filter: forYouActive ? 'sepia(1) saturate(6) brightness(0.95)' : 'brightness(0) invert(1) opacity(0.4)' }} />
          <span className={`text-xs font-bold ${forYouActive ? 'text-[#E5A93C]' : 'text-[#EDE7DA]/40'}`}>For You</span>
        </Link>

        <Link href="/plan/checkin" className="relative h-9 flex items-center px-1.5" aria-label="Your progress">
          <div className="relative w-full h-2 rounded-full bg-white/10 overflow-visible">
            <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 6)}%`, background: 'linear-gradient(90deg, #044A34, #0f7a53)' }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3.5 rounded bg-white/20" style={{ left: '58%' }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3.5 rounded bg-white/20" style={{ left: '82%' }} />
            <div
              className="absolute top-1/2 flex items-center justify-center rounded-full"
              style={{ left: `${Math.max(pct, 6)}%`, transform: 'translate(-50%, -50%)', width: 28, height: 28, background: '#E5A93C', boxShadow: '0 2px 8px -2px rgba(0,0,0,0.4)', clipPath: 'circle(50% at 50% 50%)' }}
            >
              <RunningMarker />
            </div>
          </div>
        </Link>

        <Link href="/plan/community" className="flex flex-col items-center gap-1">
          <HeartIcon active={communityActive} />
          <span className={`text-xs font-bold ${communityActive ? 'text-[#E5A93C]' : 'text-[#EDE7DA]/40'}`}>Community</span>
        </Link>
      </div>
    </nav>
  )
}
