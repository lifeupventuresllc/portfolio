'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// Home's "LUNCH · ALREADY PICKED" line (2026-10-25): the meal waiting for her
// on the Nutrition tab right now, so Home says "food's handled" without her
// opening anything. Same picker as the tab (/api/plan/first-pick). Shows
// nothing until there's a real pick.
type Pick = { label: string; name: string; place: string; kind: string; cal: number }

export default function LunchChip() {
  const [pick, setPick] = useState<Pick | null>(null)
  useEffect(() => {
    fetch('/api/plan/first-pick').then((r) => r.json()).then((d) => setPick(d?.pick || null)).catch(() => {})
  }, [])
  if (!pick) return null
  return (
    <Link href="/plan/nutrition" className="nf-press flex items-center justify-between gap-3 rounded-[18px] px-3.5 py-3"
      style={{ background: 'rgba(237,231,218,.08)', border: '1px solid rgba(237,231,218,.14)', color: '#EDE7DA' }}>
      <span className="flex flex-col gap-0.5 min-w-0">
        <span style={{ fontFamily: "var(--font-jbmono), monospace", fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: '#E5A93C' }}>{pick.label.toUpperCase()} · ALREADY PICKED</span>
        <span className="font-semibold text-[15px] truncate">{pick.kind === 'out' ? `${pick.place} ` : ''}{pick.name} · {pick.cal} cal</span>
      </span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EDE7DA" strokeWidth="2.5" strokeLinecap="round" className="shrink-0" aria-hidden><path d="M9 6l6 6-6 6" /></svg>
    </Link>
  )
}
