'use client'

import { useState } from 'react'

// TikTok-style right-side rail. Deliberately no like/comment counts — this
// app has a standing rule against showing a number it doesn't really have
// (see the calorie/macro code), and there's no real per-video engagement
// backend behind this feed. The heart is a real per-viewer toggle (just not
// a shared count). The two-people Community icon that used to sit under it was
// cut 2026-09-28 (Asa's one-sentence test): it only duplicated the Connect tab.
export default function FeedEngagementRail() {
  const [liked, setLiked] = useState(false)
  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={() => setLiked((v) => !v)}
        aria-label={liked ? 'Unlike' : 'Like'}
        aria-pressed={liked}
        className="active:scale-90 transition-transform"
        style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill={liked ? '#EA5C87' : 'none'} stroke={liked ? '#EA5C87' : '#ffffff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20.5s-7-4.35-9.3-8.6C1.2 8.7 2.7 5.5 6 5c2-.3 3.6.7 4.5 2.1a1.1 1.1 0 0 0 1.9 0C13.4 5.7 15 4.7 17 5c3.3.5 4.8 3.7 3.3 6.9-2.3 4.25-9.3 8.6-9.3 8.6Z" />
        </svg>
      </button>
    </div>
  )
}
