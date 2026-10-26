'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { SHOW_COMMUNITY_TAB } from '@/lib/feature-flags'

// The 3 things she reaches for most, one tap away, always in the same place —
// zero decisions about where to find anything. Everything else (cookbook,
// exercise library, extras) still lives one layer deeper via the ☰ menu on
// the main dashboard; this bar is just the daily-use fast path.
//
// Middle slot (2026-08-29, Asa's approved feed-dashboard mockup): the old
// progress-track "tap to go home" slot is retired now that the feed
// dashboard surfaces that same progress inline in its own caption zone —
// same TikTok spot instead gets the "+" meal-photo capture, same real
// upload path as components/MealPhotoButton.tsx (lib/useMealPhotoUpload).

// 2026-10-26 (Asa: "fix that so it feels like the new font and how the app
// currently looks"): every icon the same 2px line style, gold when open,
// muted cream when not.
const GOLD = '#E5A93C', MUTED = 'rgba(237,231,218,0.55)'
const tint = (active: boolean) => (active ? GOLD : MUTED)

function HeartIcon({ active, size = 20 }: { active: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={tint(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z" />
    </svg>
  )
}

function ProfileIcon({ active, size = 20 }: { active: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={tint(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8.3" r="3.4" /><path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5" />
    </svg>
  )
}

function HomeIcon({ active, size = 20 }: { active: boolean; size?: number }) {
  const color = tint(active)
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1v-9" />
    </svg>
  )
}

// Fork + knife — the Nutrition tab (2026-10-19).
function NutritionIcon({ active, size = 20 }: { active: boolean; size?: number }) {
  const color = tint(active)
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3v7a2 2 0 0 0 4 0V3" /><path d="M9 12v9" /><path d="M17 3c-2 2.2-2 6.3 0 8.5V21" />
    </svg>
  )
}

function FriendsIcon({ active, size = 20 }: { active: boolean; size?: number }) {
  const color = tint(active)
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8.5" cy="8" r="3" />
      <circle cx="16" cy="9.5" r="2.5" />
      <path d="M2.5 20c0-3.5 2.7-6 6-6s6 2.5 6 6" />
      <path d="M14.5 15c2.6 0 4.5 2 4.5 5" />
    </svg>
  )
}

export default function BottomTabBar() {
  const pathname = usePathname() || ''

  // Hidden during intake — she hasn't reached her actual dashboard yet, so
  // For You/Community don't have anywhere real to point her to. Shows up
  // starting the moment she lands on her real dashboard, not before.
  if (pathname.startsWith('/plan/intake')) return null

  // '/' is included because 2026-09-23's root-stays-the-address change
  // (middleware.ts) serves this exact same page's content there via a
  // rewrite — the browser's own visible pathname reads '/', not '/plan',
  // even though it's the identical real page underneath.
  const homeActive = pathname === '/plan' || pathname === '/'
  const forYouActive = pathname.startsWith('/plan/today')
  const communityActive = pathname.startsWith('/plan/community')
  const friendsActive = pathname.startsWith('/plan/friends')
  const nutritionActive = pathname.startsWith('/plan/nutrition')

  // Asa's approved mockup, 2026-09-02: back to a plain inline + button as
  // one of N equal columns (grid-template-columns, not flex — a flex
  // row centers each item's own content width, which reads as uneven the
  // moment items differ in width; a grid gives every tab the exact same
  // real estate regardless of its content). Replaces the floating-FAB
  // version from the day before, which Asa asked to revert.
  //
  // 5-tab TikTok layout (2026-09-02, Asa's spec): Home, Friends, +, Connect
  // (renamed from Community — same feed, same SHOW_COMMUNITY_TAB flag),
  // For You. Friends always shows — it's not gated behind the same
  // still-being-tested flag as the open community feed.
  const columns = SHOW_COMMUNITY_TAB ? 5 : 4

  const tabs: { href: string; label: string; active: boolean; icon: ReactNode }[] = [
    { href: '/plan', label: 'Home', active: homeActive, icon: <HomeIcon active={homeActive} /> },
    { href: '/plan/friends', label: 'Friends', active: friendsActive, icon: <FriendsIcon active={friendsActive} /> },
    // Middle slot (2026-10-19, Asa's Nutrition tab): was the camera "+"
    // meal-photo button; that capture now lives inside the Nutrition tab.
    { href: '/plan/nutrition', label: 'Nutrition', active: nutritionActive, icon: <NutritionIcon active={nutritionActive} /> },
    ...(SHOW_COMMUNITY_TAB ? [{ href: '/plan/community', label: 'Connect', active: communityActive, icon: <HeartIcon active={communityActive} /> }] : []),
    // "My Day" (renamed 2026-09-24, Asa: "My Plan" sounded like effort) —
    // progress + today, sits like a profile tab at the end. Plain profile
    // circle (button audit, 2026-09-03: the old silhouette read as a trophy).
    { href: '/plan/today', label: 'My Day', active: forYouActive, icon: <ProfileIcon active={forYouActive} /> },
  ]

  return (
    <nav data-bottom-tabbar className="fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom)]" style={{ background: '#021F16', borderTop: '1px solid rgba(237,231,218,.1)' }}>
      <div className="max-w-2xl mx-auto grid items-center px-3 pt-[12px] pb-[14px]" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} aria-current={t.active ? 'page' : undefined} className="nf-press relative flex flex-col items-center gap-[5px]">
            {/* Small gold pill on the open tab, sitting on the top edge. */}
            <span aria-hidden className="absolute rounded-full" style={{ top: -12, width: 18, height: 3, background: GOLD, opacity: t.active ? 1 : 0, transition: 'opacity .2s ease' }} />
            {t.icon}
            <span style={{ fontFamily: "var(--font-jbmono), 'JetBrains Mono', monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', lineHeight: 1, color: tint(t.active) }}>{t.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
