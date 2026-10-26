'use client'

import Image from 'next/image'
import { useState } from 'react'
import { hapticTap } from '@/lib/haptics'

const MONO = "var(--font-jbmono), 'JetBrains Mono', monospace"
const INK = '#EDE7DA', GOLD = '#E5A93C', BG = '#021F16', MUTE = 'rgba(237,231,218,.72)'
const CARD = 'rgba(237,231,218,.06)', LINE = 'rgba(237,231,218,.14)'

// Beta fake-door test (Asa's call, 2026-08-23): no real matching engine or
// provider backend yet — just gauging whether users actually want this before
// building it out. Location is local state only, nothing persisted; "Get
// matched" just confirms interest inline. Option B (Asa's pick from the
// published mockup comparison, "Hero + List") — the split-photo hero is the
// one thing this section needed to not read as "a random directory": it has
// to say, in as few words as possible, that this is HER budget and HER goals
// driving who she sees, not a generic list of whoever signed up.
function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  )
}

const PROVIDERS = [
  { role: 'Personal Trainer', blurb: 'Matched to your goals, your schedule, and how you actually like to train.', photo: '/images/community/trainer.jpg' },
  { role: 'Nutritionist', blurb: 'Matched to your diet, your budget, and the way you actually eat.', photo: '/images/community/nutritionist.jpg' },
] as const

export default function ProviderMatchTeaser() {
  const [location, setLocation] = useState('')
  const [requested, setRequested] = useState<Set<string>>(new Set())

  return (
    <div className="mb-5">
      {/* The split-photo hero — real people, not icons, is the whole point:
          this reads as "real specialists," not "a form." */}
      <div className="relative rounded-[22px] overflow-hidden h-44 mb-4">
        <div className="absolute inset-0 flex">
          <div className="relative w-1/2 h-full"><Image src="/images/community/trainer.jpg" alt="" fill sizes="50vw" className="object-cover brightness-[0.55]" /></div>
          <div className="relative w-1/2 h-full"><Image src="/images/community/nutritionist.jpg" alt="" fill sizes="50vw" className="object-cover brightness-[0.55]" /></div>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <p className="mb-1.5" style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.16em', color: GOLD }}>NEW — BETA</p>
          <p className="font-semibold leading-snug text-[16px]" style={{ color: INK, textShadow: '0 2px 10px rgba(0,0,0,0.6)' }}>
            Based on your goals and your budget — real specialists near you, not random ones.
          </p>
        </div>
      </div>

      <label className="block mb-3">
        <span className="mb-2 flex items-center gap-1.5" style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.12em', color: GOLD }}><PinIcon /> FIND PEOPLE NEAR YOU</span>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Los Angeles, CA"
          className="w-full h-14 rounded-2xl px-4 text-base outline-none placeholder:text-[rgba(237,231,218,.4)]"
          style={{ background: CARD, border: `1px solid ${LINE}`, color: INK }}
        />
      </label>

      <div className="space-y-2">
        {PROVIDERS.map((p) => {
          const done = requested.has(p.role)
          return (
            <div key={p.role} className="flex items-center gap-3 rounded-[20px] px-3 py-3" style={{ background: CARD, border: `1px solid ${LINE}` }}>
              <div className="relative w-11 h-11 rounded-full overflow-hidden shrink-0" style={{ border: `1.5px solid rgba(229,169,60,.6)` }}>
                <Image src={p.photo} alt={p.role} fill sizes="44px" className="object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold" style={{ color: INK }}>{p.role}</p>
                <p className="text-xs leading-snug truncate" style={{ color: MUTE }}>{p.blurb}</p>
              </div>
              <button
                onClick={() => { hapticTap(); setRequested((s) => new Set(s).add(p.role)) }}
                disabled={done}
                className="nf-press shrink-0 h-10 px-3.5 rounded-full whitespace-nowrap"
                style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.08em', ...(done ? { background: 'transparent', border: '2px solid rgba(237,231,218,.22)', color: GOLD } : { background: GOLD, color: BG }) }}
              >
                {done ? "YOU'RE ON THE LIST" : 'GET MATCHED'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
