'use client'

import { useEffect, useState } from 'react'

const KEY = 'luf_welcome_seen'

// Welcome video for someone with NO plan, shown once, full-screen over the feed
// (Asa's two-core-screens spec, 2026-09-28: "welcome video, then straight to the
// feed"). PLACEHOLDER: `src` is one of the app's existing feed clips with a
// "Welcome" title until Asa's real welcome video exists — swap the `src` passed
// from app/plan/page.tsx, nothing else changes. Plays muted (browsers block
// autoplay with sound), ends or Skip -> the feed underneath. Starts visible so a
// brand-new visitor never sees the feed flash first; a returning no-plan visitor
// who already saw it is hidden as soon as the saved flag is read.
export default function WelcomeVideo({ src }: { src: string }) {
  const [show, setShow] = useState(true)

  useEffect(() => {
    try { if (localStorage.getItem(KEY)) setShow(false) } catch { /* storage blocked: show it, Skip still works */ }
  }, [])

  const close = () => {
    try { localStorage.setItem(KEY, '1') } catch { /* fine */ }
    setShow(false)
  }

  if (!show) return null
  return (
    <div className="absolute inset-0 z-30 bg-black overflow-hidden">
      <video src={src} autoPlay muted playsInline onEnded={close} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.35), transparent 30%, transparent 55%, rgba(0,0,0,0.7))' }} />
      <button
        type="button"
        onClick={close}
        className="absolute right-4 rounded-full px-3.5 h-[28px] text-[11px] font-semibold text-white/85 active:scale-95 transition-transform"
        style={{ top: 'max(14px, env(safe-area-inset-top))', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.3)', fontFamily: 'var(--font-poppins)' }}
      >
        Skip
      </button>
      <p
        className="absolute left-6 right-6 text-center text-white"
        style={{ bottom: 90, fontFamily: 'var(--font-fraunces)', fontStyle: 'italic', fontWeight: 600, fontSize: 34, textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}
      >
        Welcome
      </p>
    </div>
  )
}
