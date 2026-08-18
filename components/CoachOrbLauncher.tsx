'use client'

import { useState } from 'react'
import CoachHero from '@/components/CoachHero'

// The dashboard's primary focus: a compact glowing pill (emerald/mustard —
// the Jewel-Box palette), sitting right under the hero photo. Tapping it
// crossfades into the real, fully-functional CoachHero — same component, same
// live chat, just revealed instead of always-open.
export default function CoachOrbLauncher({ firstName, hasPlan }: { firstName: string; hasPlan: boolean }) {
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
          <CoachHero firstName={firstName} hasPlan={hasPlan} />
          <button onClick={() => reveal(false)} className="block mx-auto text-white/30 hover:text-white/50 text-xs mt-3 transition-colors">
            ← back
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <button
            onClick={() => reveal(true)}
            className="w-full flex items-center gap-3 rounded-full border-0 cursor-pointer px-4"
            style={{ height: 52, background: '#0d3a2a', border: '1px solid rgba(229,169,60,0.4)', boxShadow: '0 4px 14px -6px rgba(0,0,0,0.4)' }}
          >
            <span
              className="luf-float rounded-full shrink-0"
              style={{
                width: 28, height: 28,
                background: 'radial-gradient(circle at 38% 32%, rgba(255,255,255,0.9), rgba(255,255,255,0.35) 30%, rgba(4,74,52,0.6) 70%, rgba(2,31,22,0) 100%)',
                boxShadow: '0 0 10px 2px rgba(229,169,60,0.5)',
              }}
            />
            <span className="text-white text-sm font-bold">Talk to Coach Asa…</span>
          </button>

          {!hasPlan && (
            <div className="bg-[#0d3a2a] border border-[#E5A93C]/30 rounded-2xl p-5 text-center mt-4 w-full">
              <p className="text-white font-semibold text-sm mb-1">No plan built yet</p>
              <p className="text-[#EDE7DA]/60 text-xs">Tell Coach Asa what you&apos;re looking for above, or pick a feature above — your numbers show up here the moment you do.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
