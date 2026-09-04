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
      {/* HUD redesign (2026-09-04, Asa's pick): green active state instead of
          gold, matching the rest of this page's recolor — angled corners
          instead of a full pill, same family as the quest-plate/CTA shapes
          elsewhere on /plan/today. Still just a visual restyle: same tabs,
          same localStorage-remembered pick, same Garden underneath. */}
      <div className="flex gap-1.5 mb-4" style={{ flex: '0 0 auto' }}>
        {([['garden', 'Progress'], ['plan', 'Today']] as const).map(([t, label]) => (
          <button
            key={t}
            onClick={() => pick(t)}
            className="flex-1 text-center text-[10.5px] font-bold uppercase tracking-[0.14em] py-2.5 transition-colors"
            style={tab === t
              ? { background: 'linear-gradient(135deg, rgba(127,230,179,0.22), rgba(76,175,125,0.12))', border: '1px solid rgba(127,230,179,0.6)', color: '#eafff2', clipPath: 'polygon(8px 0, 100% 0, 100% 100%, 0 100%, 0 8px)' }
              : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(76,175,125,0.22)', color: '#6fae8e', clipPath: 'polygon(8px 0, 100% 0, 100% 100%, 0 100%, 0 8px)' }}
          >
            {label}
          </button>
        ))}
      </div>
      <div style={{ display: tab === 'garden' ? 'flex' : 'none', flexDirection: 'column', flex: '1 1 0%', minHeight: 0 }}>{garden}</div>
      <div style={{ display: tab === 'plan' ? 'block' : 'none', flex: '1 1 auto', flexShrink: 0 }}>{plan}</div>
    </div>
  )
}
