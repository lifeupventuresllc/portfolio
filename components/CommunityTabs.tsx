'use client'

import { useState, type ReactNode } from 'react'

// The page itself stays a server component (real data fetching, redirects) —
// this is just the tab chrome + active-tab state around two pre-rendered
// halves it's handed.
//
// Real bug found live, 2026-09-03 (button audit): this used to default to
// Match, but the page's own headline right above it ("You're not doing this
// alone... our private circle of women walking it out together") describes
// the Community tab, not Match — a new visitor read one thing and landed on
// another. The dashboard's comment icon also links straight to this page
// with no tab param, so it inherited the same mismatch. Community now
// starts active to match the headline it sits under; Match is still one tap
// away, just no longer the surprise default.
export default function CommunityTabs({ match, community }: { match: ReactNode; community: ReactNode }) {
  const [tab, setTab] = useState<'match' | 'community'>('community')
  return (
    <div>
      <div className="flex gap-1 bg-charcoal border border-smoke rounded-full p-1 mb-5">
        {(['match', 'community'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 text-center text-xs font-bold tracking-wide py-2 rounded-full transition-colors ${tab === t ? 'bg-gold text-obsidian' : 'text-ivory/55'}`}
          >
            {t === 'match' ? 'Match' : 'Community'}
          </button>
        ))}
      </div>
      <div style={{ display: tab === 'match' ? 'block' : 'none' }}>{match}</div>
      <div style={{ display: tab === 'community' ? 'block' : 'none' }}>{community}</div>
    </div>
  )
}
