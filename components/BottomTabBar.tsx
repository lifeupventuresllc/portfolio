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

function HeartIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" fill={active ? '#E5A93C' : 'rgba(237,231,218,0.4)'}>
      <path d="M24,42 C24,42 6,30 6,17 C6,9 12,4 18,4 C21,4 23.5,6 24,9 C24.5,6 27,4 30,4 C36,4 42,9 42,17 C42,30 24,42 24,42 Z" />
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

  const forYouActive = pathname === '/plan' || pathname.startsWith('/plan/today')
  const communityActive = pathname.startsWith('/plan/community')

  return (
    // Option B, "warm gold wash" — Asa's catch, 2026-08-29: flat
    // bg-[#011611] "looks too plain." A soft radial gold glow centered
    // behind the + button (echoes its own gradient), fading into the same
    // forest green, plus a thin gold hairline seam instead of the old
    // barely-there white/5 border.
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom)]"
      style={{
        background: 'radial-gradient(120px 60px at 50% -10px, rgba(229,169,60,0.28), transparent 70%), linear-gradient(180deg, #0c2016 0%, #021109 100%)',
        borderTop: '1px solid rgba(229,169,60,0.5)',
      }}>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />
      <div className="max-w-2xl mx-auto grid grid-cols-[1fr_auto_1fr] items-center px-6 py-3">
        <Link href="/plan/today" className="flex flex-col items-center gap-1">
          <Image src="/images/brand/foryou-icon.png" alt="" width={22} height={22} className="object-contain" style={{ filter: forYouActive ? 'sepia(1) saturate(6) brightness(0.95)' : 'brightness(0) invert(1) opacity(0.4)' }} />
          <span className={`text-xs font-bold ${forYouActive ? 'text-[#E5A93C]' : 'text-[#EDE7DA]/40'}`}>For You</span>
        </Link>

        <button
          onClick={trigger}
          disabled={uploading}
          aria-label="Snap a photo of your meal"
          className="rounded-[9px] flex items-center justify-center disabled:opacity-50 active:scale-95 transition-transform"
          style={{ width: 46, height: 30, background: 'linear-gradient(135deg, #E5A93C, #EA5C87)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A0A0F" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>

        {SHOW_COMMUNITY_TAB ? (
          <Link href="/plan/community" className="flex flex-col items-center gap-1">
            <HeartIcon active={communityActive} />
            <span className={`text-xs font-bold ${communityActive ? 'text-[#E5A93C]' : 'text-[#EDE7DA]/40'}`}>Community</span>
          </Link>
        ) : (
          // Empty placeholder, not a removed grid column — keeps the +
          // button centered exactly as before instead of shifting layout
          // for what's meant to be a temporary, flippable hide.
          <div aria-hidden />
        )}
      </div>
    </nav>
  )
}
