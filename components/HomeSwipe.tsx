'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import WinBar from '@/components/WinBar'

// Two-screen Home for someone who is signed in AND already has a plan (Asa's
// approved mockup, 2026-09-28: next-action-swipe-up-mockup.html). Screen 1 is
// the single Next Action; one swipe up (or a tap on the cue) slides the live
// feed up over it. Swipe down at the top of the feed, or tap the small
// "Your win for today" bar at the bottom of the feed, comes back.
//
// Two panes stacked in one 200%-tall column, moved with a percentage
// translate — no height measuring for layout, only for the snap threshold.
// The hidden pane is inert so a stray tap can never hit something offscreen,
// and the feed's videos are paused while it's offscreen (its own observer
// only reacts to scrolling inside the reel, not to this container moving).
const SNAP_FRACTION = 0.33 // let go past a third of the way and it commits
const DRAG_SLOP = 8 // px before a press counts as a drag, not a tap

export default function HomeSwipe({ hero, children }: { hero: ReactNode; children: ReactNode }) {
  const [pane, setPane] = useState<0 | 1>(0)
  const [dragY, setDragY] = useState(0) // px, only while a finger/mouse is down
  const [dragging, setDragging] = useState(false)

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const heroRef = useRef<HTMLDivElement | null>(null)
  const feedRef = useRef<HTMLDivElement | null>(null)
  const startY = useRef<number | null>(null)
  const movedRef = useRef(false)
  const wheelLock = useRef(false)

  const go = (p: 0 | 1) => { setPane(p); setDragY(0); setDragging(false) }

  // Hidden pane can't be tabbed to, tapped, or read by a screen reader.
  useEffect(() => {
    heroRef.current?.toggleAttribute('inert', pane !== 0)
    feedRef.current?.toggleAttribute('inert', pane !== 1)
  }, [pane])

  // Feed videos only play while the feed is actually on screen.
  useEffect(() => {
    const root = feedRef.current
    if (!root) return
    const videos = Array.from(root.querySelectorAll<HTMLVideoElement>('video'))
    if (pane === 0) {
      videos.forEach((v) => v.pause())
      return
    }
    const reel = root.querySelector<HTMLElement>('.snap-y')
    const slides = Array.from(root.querySelectorAll<HTMLElement>('[data-feed-slide]'))
    const current = reel ? slides.find((s) => Math.abs(s.offsetTop - reel.scrollTop) < 4) : slides[0]
    current?.querySelector('video')?.play().catch(() => {})
  }, [pane])

  // ---- screen 1: drag / swipe up ------------------------------------
  const onPointerDown = (e: React.PointerEvent) => {
    if (pane !== 0) return
    startY.current = e.clientY
    movedRef.current = false
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (pane !== 0 || startY.current === null) return
    const dy = e.clientY - startY.current
    if (!movedRef.current && Math.abs(dy) < DRAG_SLOP) return
    if (!movedRef.current) {
      movedRef.current = true
      setDragging(true)
      try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* fine */ }
    }
    setDragY(Math.min(0, dy)) // only upward moves the screen; a downward pull does nothing
  }
  const endDrag = () => {
    if (startY.current === null) return
    startY.current = null
    if (!movedRef.current) return
    const h = wrapRef.current?.clientHeight || 600
    if (-dragY > h * SNAP_FRACTION) go(1)
    else { setDragY(0); setDragging(false) }
    // movedRef stays true until the click that follows this release has been
    // swallowed (see onClickCapture) — cleared on the next press.
  }
  // A drag that ends on top of Start/the cue must not also count as a tap.
  const onClickCapture = (e: React.MouseEvent) => {
    if (movedRef.current) { e.stopPropagation(); e.preventDefault(); movedRef.current = false }
  }

  // ---- desktop wheel -------------------------------------------------
  const onWheel = (e: React.WheelEvent) => {
    if (wheelLock.current) return
    if (pane === 0 && e.deltaY > 25) {
      wheelLock.current = true; go(1)
      setTimeout(() => { wheelLock.current = false }, 700)
    } else if (pane === 1 && e.deltaY < -25) {
      const reel = feedRef.current?.querySelector<HTMLElement>('.snap-y')
      if (reel && reel.scrollTop <= 2) {
        wheelLock.current = true; go(0)
        setTimeout(() => { wheelLock.current = false }, 700)
      }
    }
  }

  // ---- screen 2: swipe down at the top of the feed goes back ----------
  const touchStart = useRef<{ y: number; atTop: boolean } | null>(null)
  const onFeedTouchStart = (e: React.TouchEvent) => {
    const reel = feedRef.current?.querySelector<HTMLElement>('.snap-y')
    touchStart.current = { y: e.touches[0]?.clientY ?? 0, atTop: !reel || reel.scrollTop <= 2 }
  }
  const onFeedTouchEnd = (e: React.TouchEvent) => {
    const s = touchStart.current
    touchStart.current = null
    if (!s || !s.atTop || pane !== 1) return
    const endY = e.changedTouches[0]?.clientY ?? s.y
    if (endY - s.y > 70) go(0)
  }

  const offset = `calc(${pane === 1 ? -50 : 0}% + ${dragY}px)`

  return (
    <div ref={wrapRef} className="flex-1 min-h-0 relative overflow-hidden" onWheel={onWheel}>
      <div
        className="absolute left-0 right-0 top-0"
        style={{
          height: '200%',
          transform: `translateY(${offset})`,
          transition: dragging ? 'none' : 'transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)',
          willChange: 'transform',
        }}
      >
        {/* Screen 1 */}
        <div
          ref={heroRef}
          className="absolute left-0 right-0 top-0"
          style={{ height: '50%', touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClickCapture={onClickCapture}
        >
          {hero}
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute left-0 right-0 bottom-3 flex flex-col items-center gap-1 pt-2 pb-1 active:scale-95 transition-transform"
            style={{ fontFamily: 'var(--font-poppins)' }}
            aria-label="Swipe up for your feed"
          >
            <span aria-hidden className="block w-3.5 h-3.5 -mb-1 rotate-45 border-l-[2.5px] border-t-[2.5px] border-[#E5A93C] opacity-90 animate-bounce" />
            <span className="text-white/75 text-[11px] font-semibold tracking-wide">Swipe up for your feed</span>
            <span aria-hidden className="block w-11 h-1 rounded bg-white/35 mt-1.5" />
          </button>
        </div>

        {/* Screen 2 — the live feed, unchanged */}
        <div
          ref={feedRef}
          className="absolute left-0 right-0"
          style={{ top: '50%', height: '50%' }}
          onTouchStart={onFeedTouchStart}
          onTouchEnd={onFeedTouchEnd}
        >
          {children}
          {/* Small "Your win for today" bar (Asa's two-core-screens spec,
              2026-09-28) — tap = back to Screen 1. Replaces the old top pill. */}
          <div className="absolute left-3 right-3 bottom-3 z-[5]">
            <WinBar onClick={() => go(0)} />
          </div>
        </div>
      </div>
    </div>
  )
}
