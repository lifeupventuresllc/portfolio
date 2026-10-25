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
    // flex column filling whatever real space this component's own parent
    // hands it (see app/plan/today/page.tsx) — the toggle pill stays natural
    // height (flex: 0 0 auto), and only the currently-visible branch below it
    // claims the leftover space. Garden gets flex:1+minHeight:0 (the standard
    // "fill exactly, allow shrink" pair) since it's a fixed-height hero visual;
    // Today keeps flexShrink:0 so its long scrollable content is never
    // compressed — it just grows the page and scrolls, same as before.
    <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
      {/* 2026-10-25 simple look (Asa: the HUD "feels like a video game"):
          one rounded pill, cream for the open tab, Today first. Same tabs,
          same remembered pick. */}
      <div className="grid grid-cols-2 rounded-full p-1 mb-4" style={{ flex: '0 0 auto', background: 'rgba(237,231,218,.08)' }}>
        {([['plan', 'Today'], ['garden', 'Progress']] as const).map(([t, label]) => (
          <button key={t} onClick={() => pick(t)} className="nf-press h-10 rounded-full uppercase"
            style={{ background: tab === t ? '#EDE7DA' : 'transparent', color: tab === t ? '#021F16' : '#EDE7DA', fontFamily: "var(--font-jbmono), monospace", fontSize: 13, fontWeight: 700, letterSpacing: '.1em' }}>
            {label}
          </button>
        ))}
      </div>
      <div className={tab === 'garden' ? 'nf-screen' : ''} style={{ display: tab === 'garden' ? 'block' : 'none', flex: '1 1 auto', flexShrink: 0 }}>{garden}</div>
      <div className={tab === 'plan' ? 'nf-screen' : ''} style={{ display: tab === 'plan' ? 'block' : 'none', flex: '1 1 auto', flexShrink: 0 }}>{plan}</div>
    </div>
  )
}
