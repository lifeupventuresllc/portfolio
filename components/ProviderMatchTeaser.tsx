'use client'

import { useState } from 'react'

// Beta fake-door test (Asa's call, 2026-08-23): no real matching engine or
// provider backend yet — just gauging whether users actually want this before
// building it out. Location is local state only, nothing persisted; "Get
// matched" just confirms interest inline. Real photos of actual trainers/
// nutritionists to come — PersonIcon is a stand-in until Asa drops real ones in.
function PersonIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" />
    </svg>
  )
}
function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  )
}

const PROVIDERS = [
  { role: 'Personal Trainer', blurb: 'Matched to your goals, your schedule, and how you actually like to train.' },
  { role: 'Nutritionist', blurb: 'Matched to your diet, your budget, and the way you actually eat.' },
] as const

export default function ProviderMatchTeaser() {
  const [location, setLocation] = useState('')
  const [requested, setRequested] = useState<Set<string>>(new Set())

  return (
    <div className="bg-charcoal border border-gold/30 rounded-2xl p-5 mb-5">
      <p className="text-gold text-xs font-semibold tracking-[0.2em] uppercase mb-1">New — beta</p>
      <h2 className="text-white text-lg font-bold mb-1.5">Find your people</h2>
      <p className="text-ivory/60 text-sm mb-4">
        We already know your goals, your diet, and your budget — tell us where you are and we&apos;ll connect you with a real personal trainer or nutritionist nearby who actually fits.
      </p>

      <label className="block mb-4">
        <span className="text-ivory/50 text-xs font-semibold tracking-wide uppercase mb-1.5 flex items-center gap-1"><PinIcon /> Your city or zip</span>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Los Angeles, CA"
          className="w-full bg-obsidian border border-smoke rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-ivory/30 focus:border-gold/60 outline-none"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        {PROVIDERS.map((p) => {
          const done = requested.has(p.role)
          return (
            <div key={p.role} className="bg-obsidian border border-smoke rounded-xl p-3.5 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold mb-2.5">
                <PersonIcon />
              </div>
              <p className="text-white text-sm font-semibold mb-1">{p.role}</p>
              <p className="text-ivory/50 text-[11px] leading-snug mb-3">{p.blurb}</p>
              <button
                onClick={() => setRequested((s) => new Set(s).add(p.role))}
                disabled={done}
                className={`w-full text-[11px] font-bold uppercase tracking-wide rounded-lg py-2 transition-colors ${done ? 'bg-transparent border border-gold/30 text-gold/70' : 'bg-gold text-obsidian hover:opacity-90'}`}
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
