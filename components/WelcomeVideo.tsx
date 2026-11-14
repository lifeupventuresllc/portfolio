'use client'

import { useEffect, useRef, useState } from 'react'

export const WELCOME_SEEN_KEY = 'luf_welcome_v2_seen' // v2: new spot, so phones that saw the old placeholder still see it once

// The welcome video (Asa's real 20 s Higgsfield clip, Woman A, voice + music,
// public/videos/welcome-video.mp4).
//
// 2026-11-14 (Asa: "let them experience the app first"): it no longer greets a
// new visitor on Home. She looks around, taps Start plan, answers the
// questions, taps Build my plan — and THIS plays while her plan is being made
// ("here's how it works"), once per phone. The big button skips it any time;
// it reads SKIP while the plan builds, then SEE MY PLAN. Starts muted (phones
// block autoplay with sound); one tap on the sound pill turns her voice on and
// restarts from the top.
export default function WelcomeVideo({ src, ready, onDone }: { src: string; ready: boolean; onDone: () => void }) {
  const [muted, setMuted] = useState(true)
  const [wantGo, setWantGo] = useState(false)
  const vid = useRef<HTMLVideoElement>(null)
  const toggleSound = () => {
    const v = vid.current; if (!v) return
    const next = !muted
    v.muted = next
    if (!next) { try { v.currentTime = 0 } catch { /* fine */ } v.play().catch(() => {}) }
    setMuted(next)
  }
  const go = () => {
    try { localStorage.setItem(WELCOME_SEEN_KEY, '1') } catch { /* fine */ }
    if (ready) onDone(); else setWantGo(true)
  }
  // She tapped Skip before the plan was ready: move on the moment it is.
  useEffect(() => { if (wantGo && ready) onDone() }, [wantGo, ready, onDone])

  const MONO = "var(--font-jbmono), 'JetBrains Mono', monospace"
  const HEAD = "var(--font-barlow), 'Barlow Condensed', sans-serif"
  return (
    <div className="fixed inset-0 z-40 bg-black overflow-hidden flex flex-col" style={{ height: '100dvh' }}>
      <div className="relative flex-1 min-h-0">
        <video ref={vid} src={src} autoPlay muted playsInline onClick={toggleSound}
          className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: 'center 20%' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(2,31,22,0) 0%, rgba(2,31,22,0) 85%, #021F16 100%)' }} />
        <button type="button" onClick={toggleSound} aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
          className="nf-press absolute right-4 rounded-full px-4 py-2.5 flex items-center gap-2"
          style={{ top: 'calc(14px + env(safe-area-inset-top))', background: 'rgba(2,31,22,.75)', color: '#EDE7DA', fontSize: 15, fontWeight: 700 }}>
          {muted ? '🔇 Tap for sound' : '🔊 Sound on'}
        </button>
      </div>
      <div className="shrink-0 flex flex-col gap-3 px-6 pt-2" style={{ background: '#021F16', color: '#EDE7DA', paddingBottom: 'calc(28px + env(safe-area-inset-bottom))' }}>
        <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.16em', color: '#E5A93C' }}>{ready ? 'YOUR PLAN IS READY' : 'BUILDING YOUR PLAN…'}</span>
        <h1 style={{ margin: 0, fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 44, lineHeight: 0.9, textTransform: 'uppercase' }}>Here&apos;s how it works.</h1>
        <button type="button" onClick={go}
          className="nf-press w-full rounded-full" style={{ height: 64, background: '#FFB21E', color: '#021F16', fontFamily: MONO, fontWeight: 700, fontSize: 17, letterSpacing: '.12em' }}>
          {ready ? 'SEE MY PLAN' : wantGo ? 'ALMOST READY…' : 'SKIP'}
        </button>
      </div>
    </div>
  )
}
