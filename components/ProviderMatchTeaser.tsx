'use client'

import Image from 'next/image'
import { useState } from 'react'

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
      <div className="relative rounded-2xl overflow-hidden h-40 mb-3">
        <div className="absolute inset-0 flex">
          <div className="relative w-1/2 h-full"><Image src="/images/community/trainer.jpg" alt="" fill sizes="50vw" className="object-cover brightness-[0.55]" /></div>
          <div className="relative w-1/2 h-full"><Image src="/images/community/nutritionist.jpg" alt="" fill sizes="50vw" className="object-cover brightness-[0.55]" /></div>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <p className="text-gold text-[10px] font-bold tracking-[0.2em] uppercase mb-1.5">New — beta</p>
          <p className="text-white font-bold leading-snug text-[15px]" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.6)' }}>
            Based on your goals and your budget — real specialists near you, not random ones.
          </p>
        </div>
      </div>

      <label className="block mb-3">
        <span className="text-ivory/50 text-xs font-semibold tracking-wide uppercase mb-1.5 flex items-center gap-1"><PinIcon /> Find people where you&apos;re at</span>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Los Angeles, CA"
          className="w-full bg-charcoal border border-smoke rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-ivory/30 focus:border-gold/60 outline-none"
        />
      </label>

      <div className="space-y-2">
        {PROVIDERS.map((p) => {
          const done = requested.has(p.role)
          return (
            <div key={p.role} className="flex items-center gap-3 bg-charcoal border border-smoke rounded-xl px-3 py-2.5">
              <div className="relative w-11 h-11 rounded-full overflow-hidden border-[1.5px] border-gold/50 shrink-0">
                <Image src={p.photo} alt={p.role} fill sizes="44px" className="object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold">{p.role}</p>
                <p className="text-ivory/50 text-[11px] leading-snug truncate">{p.blurb}</p>
              </div>
              <button
                onClick={() => setRequested((s) => new Set(s).add(p.role))}
                disabled={done}
                className={`shrink-0 text-[11px] font-bold uppercase tracking-wide rounded-lg px-3 py-2 transition-colors whitespace-nowrap ${done ? 'bg-transparent border border-gold/30 text-gold/70' : 'bg-gold text-obsidian hover:opacity-90'}`}
              >
                {done ? "You're on the list" : 'Get matched'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
