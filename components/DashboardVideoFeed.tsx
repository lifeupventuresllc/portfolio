'use client'

import { useEffect, useRef, useState } from 'react'

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
  const containerRef = useRef<HTMLDivElement | null>(null)
  // Starts muted — browsers block autoplay-with-sound outright, and every
  // clip in the feed used to be hardcoded muted with no way to turn it on
  // (Asa's catch, 2026-08-30: his own clips have real audio and it never
  // played). A real per-viewer toggle now, TikTok-style: tap the speaker to
  // unmute, applies to whichever slide is actually playing.
  const [muted, setMuted] = useState(true)

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

  // The topSlot/railSlot/captionSlot overlays sit ABOVE the reel in
  // z-order but are DOM siblings, not ancestors — a swipe that starts
  // over them (the caption zone in particular now covers most of the
  // lower half: next action, chat bar, progress line) never reaches the
  // reel underneath, since the overlay itself isn't scrollable. That's
  // dead touch space with no visible sign anything's wrong (caught live,
  // 2026-08-29: swiping from over the caption area did nothing). Forward
  // a vertical swipe that didn't start on an actual control (button,
  // input, link) to the reel as a one-slide scroll, both directions.
  useEffect(() => {
    const reel = reelRef.current
    const container = containerRef.current
    if (!reel || !container) return
    let startY = 0
    let startedOnControl = false
    const isControl = (t: EventTarget | null) => t instanceof Element && !!t.closest('button, a, input, textarea, [role="button"], [contenteditable="true"]')
    const onStart = (e: TouchEvent) => {
      startY = e.touches[0]?.clientY ?? 0
      startedOnControl = isControl(e.target)
    }
    const onEnd = (e: TouchEvent) => {
      if (startedOnControl) return
      const endY = e.changedTouches[0]?.clientY ?? startY
      const deltaY = startY - endY
      if (Math.abs(deltaY) < 40) return
      reel.scrollBy({ top: deltaY > 0 ? reel.clientHeight : -reel.clientHeight, behavior: 'smooth' })
    }
    const overlays = Array.from(container.querySelectorAll<HTMLDivElement>('[data-feed-overlay]'))
    overlays.forEach((o) => {
      o.addEventListener('touchstart', onStart, { passive: true })
      o.addEventListener('touchend', onEnd, { passive: true })
    })
    return () => overlays.forEach((o) => {
      o.removeEventListener('touchstart', onStart)
      o.removeEventListener('touchend', onEnd)
    })
  }, [videos])

  // Loop back to the first video once the last one's fully scrolled past
  // (Asa's ask, 2026-08-29: same 10 clips, but it should feel endless
  // like a real feed instead of just stopping). A clone of video 0 is
  // appended after the real last slide; once THAT clone settles into
  // view, jump scrollTop back to the real slide 0 with no animation —
  // since the clone is pixel-identical, the jump is invisible.
  useEffect(() => {
    const reel = reelRef.current
    if (!reel || videos.length === 0) return
    const loopSlide = reel.querySelector<HTMLDivElement>('[data-feed-slide="loop-clone"]')
    if (!loopSlide) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio > 0.98) reel.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
        })
      },
      { threshold: [0.98], root: reel }
    )
    io.observe(loopSlide)
    return () => io.disconnect()
  }, [videos])

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-black">
      <div ref={reelRef} className="absolute inset-0 overflow-y-scroll snap-y snap-mandatory feed-no-scrollbar">
        {videos.map((v, i) => (
          <div key={v.url} data-feed-slide className="relative w-full h-full snap-start snap-always flex items-center justify-center bg-[#0b1712]">
            <video
              src={v.url}
              muted={muted}
              loop
              playsInline
              autoPlay={i === 0}
              preload={i === 0 ? 'auto' : 'none'}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        ))}
        {videos.length > 1 && (
          <div key={`${videos[0].url}-loop-end`} data-feed-slide="loop-clone" className="relative w-full h-full snap-start snap-always flex items-center justify-center bg-[#0b1712]">
            <video src={videos[0].url} muted={muted} loop playsInline preload="none" className="absolute inset-0 w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* Decorative scrims — video layer's own, not part of a caller slot. */}
      <div className="absolute left-0 right-0 top-0 z-[1] pointer-events-none" style={{ height: '24%', background: 'linear-gradient(180deg, rgba(0,0,0,0.6), transparent)' }} />
      <div className="absolute left-0 right-0 bottom-0 z-[1] pointer-events-none" style={{ height: '46%', background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.72) 50%, rgba(0,0,0,0.86))' }} />

      {/* The video itself bleeds all the way under the notch/status bar
          once installed (viewport-fit=cover in app/layout.tsx) — but this
          text/icon content shouldn't sit literally under it. env()
          falls back to 0 on a device with no notch/regular browser tab,
          so this is a no-op everywhere else. */}
      {topSlot && <div data-feed-overlay className="absolute left-4 right-4 z-[3] pointer-events-auto" style={{ top: 'max(12px, env(safe-area-inset-top))' }}>{topSlot}</div>}
      {/* Mute toggle — owns the `muted` state directly since it's this
          component's own <video> elements it's controlling, not something
          the caller's railSlot content (likes/community, no audio concept)
          should need to know about. Sits just above that rail. */}
      <div data-feed-overlay className="absolute right-3 z-[3] pointer-events-auto" style={{ bottom: 'calc(34% + 92px)' }}>
        <button
          onClick={() => setMuted((v) => !v)}
          aria-label={muted ? 'Unmute' : 'Mute'}
          aria-pressed={!muted}
          className="active:scale-90 transition-transform"
          style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }}
        >
          {muted ? (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5 6 9H3v6h3l5 4V5Z" />
              <line x1="16" y1="9" x2="22" y2="15" />
              <line x1="22" y1="9" x2="16" y2="15" />
            </svg>
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5 6 9H3v6h3l5 4V5Z" />
              <path d="M16.5 8.5a5 5 0 0 1 0 7" />
              <path d="M19 6a9 9 0 0 1 0 12" />
            </svg>
          )}
        </button>
      </div>
      {railSlot && <div data-feed-overlay className="absolute right-3 z-[3] pointer-events-auto" style={{ bottom: '34%' }}>{railSlot}</div>}
      {captionSlot && <div data-feed-overlay className="absolute left-0 right-0 bottom-0 z-[3] pointer-events-auto">{captionSlot}</div>}

      <style>{`.feed-no-scrollbar::-webkit-scrollbar { display: none; } .feed-no-scrollbar { scrollbar-width: none; }`}</style>
    </div>
  )
}
