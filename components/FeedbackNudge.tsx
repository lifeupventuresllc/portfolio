'use client'

import { useEffect, useState } from 'react'
import QuickFeedback from '@/components/QuickFeedback'
import { FEEDBACK_LAST_SENT_KEY } from '@/lib/feedback-context'

const FIRST_SEEN_KEY = 'luf_plan_first_seen'
const DISMISSED_KEY = 'luf_feedback_nudge_dismissed_at'
const DAY = 24 * 60 * 60 * 1000

// Backstop for members who never naturally hit a completion screen (workout finish /
// meal save / check-in) where QuickFeedback already lives — a small, easy-to-ignore
// floating prompt on /plan/*. Shows only once she's had real time in the app (3+ days
// in), and backs off for a week after ANY feedback (inline or from /plan/feedback) or
// 5 days after being dismissed — so it nudges toward feedback without nagging.
export default function FeedbackNudge() {
  const [show, setShow] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const now = Date.now()
    let firstSeen = Number(localStorage.getItem(FIRST_SEEN_KEY))
    if (!firstSeen) { firstSeen = now; localStorage.setItem(FIRST_SEEN_KEY, String(now)) }
    const lastSent = Number(localStorage.getItem(FEEDBACK_LAST_SENT_KEY)) || 0
    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY)) || 0
    const eligible = (now - firstSeen) > 3 * DAY && (now - lastSent) > 7 * DAY && (now - dismissedAt) > 5 * DAY
    if (eligible) setShow(true)
  }, [])

  function dismiss() {
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now())) } catch { /* ignore */ }
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-5 right-4 z-40 max-w-[280px]">
      {!open ? (
        <button onClick={() => setOpen(true)}
          className="flex items-center gap-2 bg-charcoal border border-gold/40 text-gold text-xs font-semibold pl-4 pr-3 py-3 rounded-full shadow-lg active:scale-95 transition-transform">
          Got 10 sec? How&apos;s the app going?
          <span onClick={(e) => { e.stopPropagation(); dismiss() }} className="text-ivory/40 hover:text-ivory/70 ml-1" aria-label="Dismiss">✕</span>
        </button>
      ) : (
        <div className="bg-charcoal border border-smoke rounded-2xl p-4 shadow-lg">
          <p className="text-white text-sm font-semibold mb-1">Quick pulse-check</p>
          <QuickFeedback category="general" context="Floating nudge" dark onSent={() => setTimeout(dismiss, 1500)} />
        </div>
      )}
    </div>
  )
}
