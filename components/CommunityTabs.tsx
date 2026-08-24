'use client'

import { useState, type ReactNode } from 'react'

// The page itself stays a server component (real data fetching, redirects) —
// this is just the tab chrome + active-tab state around two pre-rendered
// halves it's handed. Match starts active: it's the one real reason this
// page exists beyond the social feed now (Asa's framing), so it shouldn't
// need a tap to find. Nothing in the Community tab's content changed or was
// removed — same leaderboard/spotlight/feed, just behind its own tab instead
// of always sharing the top of the page with the new feature.
export default function CommunityTabs({ match, community }: { match: ReactNode; community: ReactNode }) {
  const [tab, setTab] = useState<'match' | 'community'>('match')
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
