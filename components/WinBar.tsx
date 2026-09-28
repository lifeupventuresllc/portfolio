'use client'

import { useState } from 'react'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { heroCopy } from '@/lib/next-action/plain-copy'

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

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Back to your win for today"
      className="w-full flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left active:scale-[0.98] transition-transform"
      style={{ background: 'rgba(2,31,22,0.92)', border: '1px solid rgba(229,169,60,0.6)', fontFamily: 'var(--font-poppins)', backdropFilter: 'blur(4px)' }}
    >
      <span aria-hidden className="shrink-0 rounded-full grid place-items-center" style={{ width: 24, height: 24, border: '2px solid #7fbf94' }}>
        <span className="block rounded-full" style={{ width: 8, height: 8, background: '#E5A93C', boxShadow: '0 0 6px 2px rgba(229,169,60,0.7)' }} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[8.5px] font-bold uppercase" style={{ color: '#E5A93C', letterSpacing: '0.16em' }}>Your win for today</span>
        {text && <span className="block truncate text-white text-[13px]" style={{ fontFamily: 'var(--font-fraunces)', fontStyle: 'italic', fontWeight: 600 }}>{text}</span>}
      </span>
      <span aria-hidden className="shrink-0 block w-2.5 h-2.5 rotate-45 border-l-[2.5px] border-t-[2.5px] border-[#E5A93C] mr-1" />
    </button>
  )
}
