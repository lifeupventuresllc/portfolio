'use client'

import { useState, type ReactNode } from 'react'
import { hapticTap } from '@/lib/haptics'

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
      <div className="flex gap-1 rounded-full p-1 mb-5" style={{ background: 'rgba(237,231,218,.06)', border: '1px solid rgba(237,231,218,.14)' }}>
        {(['match', 'community'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { hapticTap(); setTab(t) }}
            className="nf-press flex-1 text-center h-11 rounded-full transition-colors"
            style={{ fontFamily: "var(--font-jbmono), 'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, letterSpacing: '.12em', ...(tab === t ? { background: '#E5A93C', color: '#021F16' } : { background: 'transparent', color: 'rgba(237,231,218,.72)' }) }}
          >
            {t === 'match' ? 'MATCH' : 'COMMUNITY'}
          </button>
        ))}
      </div>
      <div style={{ display: tab === 'match' ? 'block' : 'none' }}>{match}</div>
      <div style={{ display: tab === 'community' ? 'block' : 'none' }}>{community}</div>
    </div>
  )
}
