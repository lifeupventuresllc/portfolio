'use client'

import { useState } from 'react'
import CoachHero from '@/components/CoachHero'

// The dashboard's new primary focus, replacing the old always-visible chat card:
// a soft breathing glow (gold+rose, matching the confirmed direction — no literal
// icon, reads as "something is here with you" rather than "bring more effort").
// Reuses the app's existing .luf-float animation (already respects
// prefers-reduced-motion, see app/globals.css) instead of new CSS. Tapping it
// crossfades into the real, fully-functional CoachHero — same component, same
// live chat, just revealed instead of always-open.
export default function CoachOrbLauncher({ firstName }: { firstName: string }) {
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(true)

  function reveal(next: boolean) {
    setVisible(false)
    setTimeout(() => {
      setOpen(next)
      setVisible(true)
    }, 260)
  }

  return (
    <div style={{ transition: 'opacity 0.26s ease, filter 0.26s ease', opacity: visible ? 1 : 0, filter: visible ? 'blur(0px)' : 'blur(6px)' }}>
      {open ? (
        <div>
          <CoachHero firstName={firstName} />
          <button onClick={() => reveal(false)} className="block mx-auto text-white/30 hover:text-white/50 text-xs mt-3 transition-colors">
            ← back
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center py-6">
          <button
            onClick={() => reveal(true)}
            className="luf-float flex items-center justify-center rounded-full border-0 cursor-pointer"
            style={{
              width: 210,
              height: 210,
              background: 'radial-gradient(circle at 38% 32%, rgba(255,255,255,0.5), rgba(234,92,135,0.55) 28%, rgba(201,168,76,0.55) 62%, rgba(10,10,15,0) 78%)',
              boxShadow: '0 0 70px 10px rgba(234,92,135,0.35), 0 0 110px 20px rgba(201,168,76,0.22)',
            }}
          >
            <span className="text-white text-sm font-semibold text-center" style={{ width: 130, textShadow: '0 1px 8px rgba(0,0,0,0.35)' }}>
              Talk to Coach Asa…
            </span>
          </button>
          <p className="text-white/30 text-xs mt-5">tap to talk to Coach Asa</p>
        </div>
      )}
    </div>
  )
}
