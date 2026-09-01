'use client'

import { useEffect, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'luf_foryou_view_tab'
type Tab = 'plan' | 'garden'

// Same structural precedent as CommunityTabs.tsx — segmented pill, both
// halves pre-rendered and handed in as children, display:none toggles which
// one shows. Plan stays the default/active tab (today's real page, unchanged
// behavior); the last pick is remembered per-device so returning to Garden
// doesn't require a re-tap every visit.
export default function ProgressViewToggle({ plan, garden }: { plan: ReactNode; garden: ReactNode }) {
  const [tab, setTab] = useState<Tab>('plan')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'plan' || saved === 'garden') setTab(saved)
    } catch { /* private mode — default stands */ }
  }, [])

  const pick = (t: Tab) => {
    setTab(t)
    try { localStorage.setItem(STORAGE_KEY, t) } catch { /* private mode */ }
  }

  return (
    <div>
      <div className="flex gap-1 bg-charcoal border border-smoke rounded-full p-1 mb-4">
        {([['garden', 'Progress'], ['plan', 'Today']] as const).map(([t, label]) => (
          <button
            key={t}
            onClick={() => pick(t)}
            className={`flex-1 text-center text-xs font-bold tracking-wide py-2 rounded-full transition-colors ${tab === t ? 'bg-gold text-obsidian' : 'text-ivory/55'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div style={{ display: tab === 'garden' ? 'block' : 'none' }}>{garden}</div>
      <div style={{ display: tab === 'plan' ? 'block' : 'none' }}>{plan}</div>
    </div>
  )
}
