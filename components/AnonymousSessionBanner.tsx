'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// Anonymous-access, Phase 1: shown only for a signInAnonymously() session
// (see app/try/page.tsx) — a low-key, dismissible nudge to claim her real
// account, never a wall. Same dismissible-per-session pattern as
// VerifyEmailBanner, which occupies this same slot for real accounts.
export default function AnonymousSessionBanner() {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try { setDismissed(sessionStorage.getItem('luf_anon_banner_dismissed') === '1') } catch { setDismissed(false) }
  }, [])

  if (dismissed) return null

  function dismiss() {
    try { sessionStorage.setItem('luf_anon_banner_dismissed', '1') } catch { /* ignore */ }
    setDismissed(true)
  }

  return (
    <div className="flex items-center justify-between gap-3 bg-gold/10 border border-gold/30 rounded-xl px-4 py-2.5 mb-4 text-xs">
      <p className="text-gold">
        💾 Save your progress so Coach remembers you tomorrow — {' '}
        <Link href="/plan/save" className="font-semibold hover:underline">save now</Link>
      </p>
      <button onClick={dismiss} className="text-gold/50 hover:text-gold/80 shrink-0">✕</button>
    </div>
  )
}
