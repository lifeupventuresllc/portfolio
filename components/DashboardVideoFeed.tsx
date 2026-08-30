'use client'

import { useEffect, useRef } from 'react'

// The TikTok-style vertical reel — full-bleed background for the dashboard's
// dominant middle section (Asa's approved mockup, 2026-08-28/29: real free-
// licensed stock footage, randomized rotation per visit via lib/feed-videos.ts,
// never the fixed mockup-review order). Purely the video layer + its own
// decorative scrims; the real interactive content (next action, progress,
// chat) is layered on top by the caller via the slot props below, each its
// own pointer-events island so the reel itself still swipes underneath.
export default function DashboardVideoFeed({
  videos, topSlot, railSlot, captionSlot,
}: {
  videos: { url: string; tag: string }[]
  topSlot?: React.ReactNode
  railSlot?: React.ReactNode
  captionSlot?: React.ReactNode
}) {
  const reelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const reel = reelRef.current
    if (!reel) return
    const slides = Array.from(reel.querySelectorAll<HTMLDivElement>('[data-feed-slide]'))
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const v = e.target.querySelector('video')
          if (!v) return
          if (e.isIntersecting && e.intersectionRatio > 0.6) v.play().catch(() => {})
          else v.pause()
        })
      },
      { threshold: [0, 0.6, 1], root: reel }
    )
    slides.forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [videos])

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      <div ref={reelRef} className="absolute inset-0 overflow-y-scroll snap-y snap-mandatory feed-no-scrollbar">
        {videos.map((v, i) => (
          <div key={v.url} data-feed-slide className="relative w-full h-full snap-start snap-always flex items-center justify-center bg-[#0b1712]">
            <video
              src={v.url}
              muted
              loop
              playsInline
              autoPlay={i === 0}
              preload={i === 0 ? 'auto' : 'none'}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      {/* Decorative scrims — video layer's own, not part of a caller slot. */}
      <div className="absolute left-0 right-0 top-0 z-[1] pointer-events-none" style={{ height: '24%', background: 'linear-gradient(180deg, rgba(0,0,0,0.6), transparent)' }} />
      <div className="absolute left-0 right-0 bottom-0 z-[1] pointer-events-none" style={{ height: '46%', background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.72) 50%, rgba(0,0,0,0.86))' }} />

      {topSlot && <div className="absolute left-4 right-4 top-3 z-[3] pointer-events-auto">{topSlot}</div>}
      {railSlot && <div className="absolute right-3 z-[3] pointer-events-auto" style={{ bottom: '34%' }}>{railSlot}</div>}
      {captionSlot && <div className="absolute left-0 right-0 bottom-0 z-[3] pointer-events-auto">{captionSlot}</div>}

      <style>{`.feed-no-scrollbar::-webkit-scrollbar { display: none; } .feed-no-scrollbar { scrollbar-width: none; }`}</style>
    </div>
  )
}
