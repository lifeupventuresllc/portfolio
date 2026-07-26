'use client'

import { useEffect, useState } from 'react'
import { localTodayISO } from '@/lib/useLiveRefresh'

type Memo = { slot: string; title: string; subtitle: string; audioUrl?: string }

// Renders nothing unless: it's her Monday, she's Challenge/Inner Circle, Asa has
// recorded real audio for the slot her actual week earned, AND she hasn't already
// dismissed it this week. Zero decisions if there's nothing to show — it either
// quietly appears or it doesn't, same pattern as the rest of the app's "only
// surface it when it's actually relevant" philosophy.
export default function MondayMemo() {
  const [memo, setMemo] = useState<Memo | null>(null)
  const [dismissed, setDismissed] = useState(true)
  const today = localTodayISO()

  useEffect(() => {
    const key = `luf_monday_memo_${today}`
    try { if (localStorage.getItem(key) === 'dismissed') { setDismissed(true); return } } catch { /* noop */ }
    setDismissed(false)
    fetch('/api/plan/monday-memo').then((r) => r.json()).then((d) => setMemo(d?.memo || null)).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today])

  function dismiss() {
    try { localStorage.setItem(`luf_monday_memo_${today}`, 'dismissed') } catch { /* noop */ }
    setDismissed(true)
  }

  if (dismissed || !memo) return null

  return (
    <div className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/15 to-charcoal bg-charcoal/90 backdrop-blur-md px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-gold text-[9px] uppercase tracking-[0.25em] font-semibold mb-1">🎙️ Monday Memo from Coach Asa</p>
          <p className="text-white font-semibold text-sm mb-0.5">{memo.title}</p>
          <p className="text-ivory/60 text-xs mb-3">{memo.subtitle}</p>
          {memo.audioUrl && <audio controls src={memo.audioUrl} className="w-full h-9" />}
        </div>
        <button onClick={dismiss} aria-label="Dismiss" className="text-ivory/30 hover:text-gold text-lg leading-none shrink-0">×</button>
      </div>
    </div>
  )
}
