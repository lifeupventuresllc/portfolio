'use client'

import { useState } from 'react'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { heroCopy } from '@/lib/next-action/plain-copy'
import { hapticTap } from '@/lib/haptics'

// The small "Your win for today" bar pinned to the bottom of the feed (Asa's
// two-core-screens spec, 2026-09-28). Tap = back to Screen 1. Same engine, same
// wording as the big screen — it just reads today's win, it never decides one.
export default function WinBar({ onClick }: { onClick: () => void }) {
  const [text, setText] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await fetch('/api/plan/next-action')
      if (!res.ok) return
      const a = await res.json()
      if (a?.instruction) setText(heroCopy(a.kind, a.instruction).headline)
    } catch { /* the bar just keeps its label */ }
  }
  useLiveRefresh(load)

  // 2026-10-26 (Asa: "I don't like the circle… match all the new font and
  // feel, the button also"): no ring, a slim dark card in the app's new look,
  // mono label, the win in Barlow italic, one gold pill. Same tap.
  const MONO = "var(--font-jbmono), 'JetBrains Mono', monospace"
  return (
    <button
      type="button"
      onClick={() => { hapticTap(); onClick() }}
      aria-label="Back to your win for today"
      className="nf-press w-full flex items-center gap-3 rounded-[20px] pl-4 pr-2 py-2 text-left"
      style={{ background: 'rgba(2,31,22,0.92)', border: '1px solid rgba(237,231,218,.14)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', boxShadow: '0 8px 24px rgba(0,0,0,.4)' }}
    >
      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.14em', color: '#E5A93C' }}>YOUR WIN FOR TODAY</span>
        <span className="block truncate" style={{ fontFamily: "var(--font-barlow), 'Barlow Condensed', sans-serif", fontStyle: 'italic', fontWeight: 800, fontSize: 20, lineHeight: 1.05, textTransform: 'uppercase', color: '#EDE7DA' }}>{text || 'Already planned for you'}</span>
      </span>
      <span className="shrink-0 h-10 px-4 rounded-full flex items-center" style={{ background: '#E5A93C', color: '#021F16', fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.1em' }}>SHOW ME</span>
    </button>
  )
}
