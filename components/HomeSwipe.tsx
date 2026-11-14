'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import WinBar, { WinWorkoutProvider, type WinWorkout } from '@/components/WinBar'
import { TODAY_EVENT } from '@/components/ProgressViewToggle'

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
//
// 2026-10-26 (Asa: progress first): Screen 1 is now her My Day, which can be
// taller than the phone, so it scrolls on its own. The swipe up to the feed
// only takes over once she's at the bottom of it (or it already fits).
const SNAP_FRACTION = 0.2 // let go past a fifth of the way and it commits (2026-11-14: was a third, felt stuck)
const FLICK_SPEED = 0.45 // px/ms — a quick flick up commits even if it's short
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
  const lastMove = useRef<{ y: number; t: number; v: number }>({ y: 0, t: 0, v: 0 })
  const wheelLock = useRef(false)

  const router = useRouter()
  // Today's workout, handed up by My Day (Screen 1) — see WinBar.tsx.
  const [winWorkout, setWinWorkout] = useState<WinWorkout | null>(null)

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
  // Only arms when Screen 1 is scrolled to its bottom (or fits outright);
  // otherwise her finger just scrolls My Day like any page.
  const heroScrollRef = useRef<HTMLDivElement | null>(null)
  const armed = useRef(false)
  const atBottom = () => {
    const el = heroScrollRef.current
    return !el || el.scrollTop + el.clientHeight >= el.scrollHeight - 2
  }
  const begin = (y: number) => {
    if (pane !== 0) return
    startY.current = y
    movedRef.current = false
    armed.current = atBottom()
    lastMove.current = { y, t: performance.now(), v: 0 }
  }
  const move = (y: number) => {
    if (pane !== 0 || startY.current === null) return false
    const now = performance.now()
    const lm = lastMove.current
    const dt = Math.max(1, now - lm.t)
    lastMove.current = { y, t: now, v: (lm.y - y) / dt } // + = moving up
    // 2026-11-14 (Asa: "not seamless"): one continuous swipe — scroll My Day
    // down, and the moment it hits the bottom the same finger starts pulling
    // the feed up. No lifting the finger and swiping again.
    if (!armed.current) {
      if (y < lm.y && atBottom()) { armed.current = true; startY.current = y }
      return false
    }
    const dy = y - startY.current
    if (!movedRef.current && Math.abs(dy) < DRAG_SLOP) return false
    if (!movedRef.current && dy > 0) { armed.current = false; return false } // scrolling back up
    if (!movedRef.current) { movedRef.current = true; setDragging(true) }
    setDragY(Math.min(0, dy)) // only upward moves the screen
    return true
  }
  const endDrag = () => {
    if (startY.current === null) return
    startY.current = null
    armed.current = false
    if (!movedRef.current) return
    const h = wrapRef.current?.clientHeight || 600
    if (-dragY > h * SNAP_FRACTION || (lastMove.current.v > FLICK_SPEED && -dragY > 24)) go(1)
    else { setDragY(0); setDragging(false) }
    // movedRef stays true until the click that follows this release has been
    // swallowed (see onClickCapture) — cleared on the next press.
  }
  // Touch drives phones (touch events keep firing alongside native scroll);
  // pointer events only for a desktop mouse.
  const onTouchStart = (e: React.TouchEvent) => begin(e.touches[0]?.clientY ?? 0)
  const onTouchMove = (e: React.TouchEvent) => { move(e.touches[0]?.clientY ?? 0) }
  const onPointerDown = (e: React.PointerEvent) => { if (e.pointerType === 'mouse') begin(e.clientY) }
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    const wasMoved = movedRef.current
    if (move(e.clientY) && !wasMoved) {
      try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* fine */ }
    }
  }
  const onPointerUp = (e: React.PointerEvent) => { if (e.pointerType === 'mouse') endDrag() }
  // A drag that ends on top of a button must not also count as a tap.
  const onClickCapture = (e: React.MouseEvent) => {
    if (movedRef.current) { e.stopPropagation(); e.preventDefault(); movedRef.current = false }
  }

  // Feed's win bar: straight into today's workout (2026-11-06, Asa). Once
  // it's done (or there's no workout to show), back to Screen 1, on Today
  // (where her win is), at the top.
  const backToWin = () => {
    if (winWorkout && !winWorkout.done) { router.push('/plan/workout'); return }
    window.dispatchEvent(new Event(TODAY_EVENT))
    heroScrollRef.current?.scrollTo({ top: 0 })
    go(0)
  }

  // ---- desktop wheel -------------------------------------------------
  const onWheel = (e: React.WheelEvent) => {
    if (wheelLock.current) return
    if (pane === 0 && e.deltaY > 25 && atBottom()) {
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
    <WinWorkoutProvider value={setWinWorkout}>
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
          className="absolute left-0 right-0 top-0 flex flex-col"
          style={{ height: '50%', background: '#021F16' }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={endDrag}
          onTouchCancel={endDrag}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClickCapture={onClickCapture}
        >
          <div ref={heroScrollRef} className="flex-1 min-h-0 overflow-y-auto" style={{ touchAction: 'pan-y', overscrollBehavior: 'none' }}>
            {hero}
          </div>
          {/* 2026-11-14 (Asa): the way to the feed lit up and moving, so she
              knows there's more past this page. Gold glowing pill, two
              stacked chevrons rising, tap works too. */}
          <style>{`@keyframes hsGlow{0%,100%{box-shadow:0 0 0 0 rgba(229,169,60,.0),0 0 14px rgba(229,169,60,.25)}50%{box-shadow:0 0 0 6px rgba(229,169,60,.12),0 0 26px rgba(229,169,60,.55)}}@keyframes hsRise{0%{transform:translateY(6px);opacity:0}40%{opacity:1}100%{transform:translateY(-6px);opacity:0}}.hs-cue{animation:hsGlow 1.8s ease-in-out infinite}.hs-chev{animation:hsRise 1.4s ease-out infinite}.hs-chev2{animation-delay:.25s}@media (prefers-reduced-motion: reduce){.hs-cue,.hs-chev{animation:none}}`}</style>
          <div className="shrink-0 flex justify-center pt-2 pb-3">
            <button
              type="button"
              onClick={() => go(1)}
              className="hs-cue nf-press flex items-center gap-2.5 rounded-full px-5 py-2.5"
              style={{ background: 'rgba(229,169,60,.14)', border: '1.5px solid rgba(229,169,60,.7)' }}
              aria-label="Swipe up for your feed"
            >
              <span aria-hidden className="relative block w-3.5 h-4">
                {/* bounce/rise on the wrapper, rotate on the inner (a shared transform would wipe the rotation) */}
                <span className="hs-chev absolute inset-x-0 top-0 block"><span className="block w-3 h-3 rotate-45 border-l-[2.5px] border-t-[2.5px] border-[#E5A93C]" /></span>
                <span className="hs-chev hs-chev2 absolute inset-x-0 top-1.5 block"><span className="block w-3 h-3 rotate-45 border-l-[2.5px] border-t-[2.5px] border-[#E5A93C]" /></span>
              </span>
              <span style={{ fontFamily: "var(--font-jbmono), monospace", fontSize: 12, fontWeight: 700, letterSpacing: '.14em', color: '#E5A93C' }}>SWIPE UP FOR YOUR FEED</span>
            </button>
          </div>
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
              2026-09-28) — tap = back to Screen 1, now opened on Today. */}
          <div className="absolute left-3 right-3 bottom-3 z-[5]">
            <WinBar onClick={backToWin} workout={winWorkout} />
          </div>
        </div>
      </div>
    </div>
    </WinWorkoutProvider>
  )
}
