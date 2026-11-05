'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()

  useEffect(() => {
    try { if (localStorage.getItem(KEY)) setShow(false) } catch { /* storage blocked: show it, Skip still works */ }
  }, [])

  const close = () => {
    try { localStorage.setItem(KEY, '1') } catch { /* fine */ }
    setShow(false)
  }

  if (!show) return null
  // 2026-11-05 (Asa's approved first-time-user mockup): a big START from the
  // first second (she used to wait ~25s with only a tiny Skip), the video
  // plays behind it. The macro captions are burned into this placeholder
  // clip; Asa's real welcome video replaces it.
  const MONO = "var(--font-jbmono), 'JetBrains Mono', monospace"
  return (
    <div className="absolute inset-0 z-30 bg-black overflow-hidden flex flex-col">
      <div className="relative flex-1 min-h-0">
        <video src={src} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(2,31,22,0.2), rgba(2,31,22,0.2) 55%, #021F16 100%)' }} />
      </div>
      <div className="shrink-0 flex flex-col gap-3.5 px-6 pt-2" style={{ background: '#021F16', color: '#EDE7DA', paddingBottom: 'calc(28px + env(safe-area-inset-bottom))' }}>
        <h1 style={{ margin: 0, fontFamily: "var(--font-barlow), 'Barlow Condensed', sans-serif", fontStyle: 'italic', fontWeight: 800, fontSize: 56, lineHeight: 0.9, textTransform: 'uppercase' }}>Welcome.</h1>
        <p style={{ margin: 0, fontSize: 18, lineHeight: 1.4, color: 'rgba(237,231,218,.85)' }}>We plan your food and workouts. You just show up.</p>
        <button type="button" onClick={() => { close(); router.push('/plan/intake') }}
          className="nf-press w-full rounded-full" style={{ height: 64, background: '#FFB21E', color: '#021F16', fontFamily: MONO, fontWeight: 700, fontSize: 17, letterSpacing: '.12em' }}>
          START
        </button>
        <button type="button" onClick={close} className="self-center underline underline-offset-2 py-1" style={{ fontSize: 15, color: 'rgba(237,231,218,.72)' }}>Just look around first</button>
      </div>
    </div>
  )
}
