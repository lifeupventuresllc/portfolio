'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMealPhotoUpload } from '@/lib/useMealPhotoUpload'
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

function HeartIcon({ active, size = 20 }: { active: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill={active ? '#E5A93C' : 'rgba(237,231,218,0.4)'}>
      <path d="M24,42 C24,42 6,30 6,17 C6,9 12,4 18,4 C21,4 23.5,6 24,9 C24.5,6 27,4 30,4 C36,4 42,9 42,17 C42,30 24,42 24,42 Z" />
    </svg>
  )
}

function HomeIcon({ active, size = 20 }: { active: boolean; size?: number }) {
  const color = active ? '#E5A93C' : 'rgba(237,231,218,0.4)'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1v-9" />
    </svg>
  )
}

function FriendsIcon({ active, size = 20 }: { active: boolean; size?: number }) {
  const color = active ? '#E5A93C' : 'rgba(237,231,218,0.4)'
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
  const { inputRef, uploading, onFile, trigger } = useMealPhotoUpload()

  // Hidden during intake — she hasn't reached her actual dashboard yet, so
  // For You/Community don't have anywhere real to point her to. Shows up
  // starting the moment she lands on her real dashboard, not before.
  if (pathname.startsWith('/plan/intake')) return null

  const homeActive = pathname === '/plan'
  const forYouActive = pathname.startsWith('/plan/today')
  const communityActive = pathname.startsWith('/plan/community')
  const friendsActive = pathname.startsWith('/plan/friends')

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

  return (
    <nav data-bottom-tabbar className="fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />

      <div
        className="max-w-2xl mx-auto grid items-center px-3 pt-[10px] pb-[14px]"
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          background: 'radial-gradient(120px 60px at 50% -10px, rgba(229,169,60,0.28), transparent 70%), linear-gradient(180deg, #0c2016 0%, #021109 100%)',
          borderTop: '1px solid rgba(229,169,60,0.5)',
        }}
      >
        <Link href="/plan" className="flex flex-col items-center gap-[3px]">
          <HomeIcon active={homeActive} size={19} />
          <span className={`text-[10.5px] font-bold ${homeActive ? 'text-[#E5A93C]' : 'text-[#EDE7DA]/40'}`}>Home</span>
        </Link>

        <Link href="/plan/friends" className="flex flex-col items-center gap-[3px]">
          <FriendsIcon active={friendsActive} size={19} />
          <span className={`text-[10.5px] font-bold ${friendsActive ? 'text-[#E5A93C]' : 'text-[#EDE7DA]/40'}`}>Friends</span>
        </Link>

        <div className="flex justify-center">
          <button
            onClick={trigger}
            disabled={uploading}
            aria-label="Snap a photo of your meal"
            className="rounded-lg flex items-center justify-center disabled:opacity-50 active:scale-95 transition-transform shrink-0"
            style={{ width: 42, height: 26, background: 'linear-gradient(135deg, #E5A93C, #EA5C87)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A0A0F" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        </div>

        {SHOW_COMMUNITY_TAB && (
          <Link href="/plan/community" className="flex flex-col items-center gap-[3px]">
            <HeartIcon active={communityActive} size={17} />
            <span className={`text-[10.5px] font-bold ${communityActive ? 'text-[#E5A93C]' : 'text-[#EDE7DA]/40'}`}>Connect</span>
          </Link>
        )}

        {/* Personal-stats spot — this page is now progress + today's plan,
            not a content feed, so it sits like a profile tab, at the end. */}
        <Link href="/plan/today" className="flex flex-col items-center gap-[3px]">
          <Image src="/images/brand/foryou-icon.png" alt="" width={19} height={19} className="object-contain" style={{ filter: forYouActive ? 'sepia(1) saturate(6) brightness(0.95)' : 'brightness(0) invert(1) opacity(0.4)' }} />
          <span className={`text-[10.5px] font-bold ${forYouActive ? 'text-[#E5A93C]' : 'text-[#EDE7DA]/40'}`}>For You</span>
        </Link>
      </div>
    </nav>
  )
}
