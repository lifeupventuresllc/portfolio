'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { EXPANSION_ROUTE } from '@/components/NextActionCard'
import { useLiveRefresh } from '@/lib/useLiveRefresh'

// Item 2 of the beta list (2026-09-21, Asa's approved mockup): the same
// "Your next step" button on every /plan screen, same spot, same look, same
// tap. Home already has the full card (NextActionCard variant="dock"), so
// this is the slim version for everywhere else.
//
// Hides itself:
//  - on Home and /plan/next, which already show the full card
//  - during intake and in the coach chat (keyboard-heavy, nothing to start)
//  - on the screen the step points to — once she's in the workout, there's
//    nothing left to tap (Asa's call, same day)
//  - for passive fallbacks (water, stretch, etc.) and 'complete': no screen
//    to open, and marking those done stays on the Home card only.
type Bar = { kind: string; instruction: string; restaurant?: string; mealSlot?: string }

const HIDE_ON = ['/plan/intake', '/plan/next', '/plan/coach']

export default function NextStepBar() {
  const pathname = usePathname() || ''
  const router = useRouter()
  const [action, setAction] = useState<Bar | null>(null)
  // Tucked away while she scrolls down or types in a box, back on scroll up
  // — a floating bar over a form hid the check-in field, meal-builder
  // options and the feedback box in the live audit (2026-09-21).
  const [tucked, setTucked] = useState(false)
  const lastY = useRef(0)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/plan/next-action')
      if (res.ok) setAction(await res.json())
    } catch {
      // Silent — the bar simply stays hidden; the rest of the page is unaffected.
    }
  }, [])

  useEffect(() => { load() }, [load, pathname])

  useEffect(() => {
    setTucked(false)
    lastY.current = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      if (y < 60) setTucked(false)
      else if (y > lastY.current + 8) setTucked(true)
      else if (y < lastY.current - 8) setTucked(false)
      lastY.current = y
    }
    const isField = (t: EventTarget | null) => t instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)
    const onFocusIn = (e: FocusEvent) => { if (isField(e.target)) setTucked(true) }
    const onFocusOut = (e: FocusEvent) => { if (isField(e.target)) setTucked(false) }
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    return () => {
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
    }
  }, [pathname])
  useLiveRefresh(load)

  const dest = action ? (EXPANSION_ROUTE as Record<string, string | undefined>)[action.kind] : undefined
  // '/' included alongside '/plan' — 2026-09-23's root-stays-the-address
  // change (middleware.ts) serves Home's real content there via a
  // rewrite, so the visible browser pathname can legitimately be '/'.
  const hidden = pathname === '/plan' || pathname === '/' || HIDE_ON.some((p) => pathname.startsWith(p)) || !action || !dest || pathname.startsWith(dest)
  if (hidden || !action || !dest) return null

  const start = () => {
    if (action.kind === 'location' && (action.restaurant || action.mealSlot)) {
      const params = new URLSearchParams()
      if (action.restaurant) params.set('restaurant', action.restaurant)
      if (action.mealSlot) params.set('slot', action.mealSlot)
      router.push(`${dest}?${params.toString()}`)
      return
    }
    router.push(dest)
  }

  return (
    <>
      {/* Spacer so the fixed bar never covers the bottom of a page. */}
      <div aria-hidden style={{ height: 76 }} />
      <button
        onClick={start}
        aria-label={`Your next step: ${action.instruction}. Start`}
        className="fixed left-3 right-3 z-40 max-w-2xl mx-auto flex items-center gap-3 rounded-full text-left active:scale-[0.99] transition-transform"
        style={{
          bottom: 'calc(68px + env(safe-area-inset-bottom))',
          height: 62,
          padding: '0 12px 0 12px',
          background: '#0d3a2a',
          border: '1.5px solid #E5A93C',
          boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
          fontFamily: 'var(--font-poppins)',
          transform: tucked ? 'translateY(140%)' : 'translateY(0)',
          opacity: tucked ? 0 : 1,
          pointerEvents: tucked ? 'none' : 'auto',
          transition: 'transform 0.25s ease, opacity 0.2s ease',
        }}
      >
        <span
          aria-hidden
          className="shrink-0 rounded-full"
          style={{ width: 34, height: 34, background: 'radial-gradient(circle at 50% 45%, #f2c879 0%, #E5A93C 40%, #7a5a1c 100%)', boxShadow: '0 0 12px rgba(229,169,60,0.55)' }}
        />
        <span className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="text-[9.5px] font-bold uppercase tracking-[0.16em]" style={{ color: '#E5A93C' }}>Your next step</span>
          <span
            className="leading-tight text-[#EDE7DA]"
            style={{ fontFamily: 'var(--font-fraunces)', fontStyle: 'italic', fontWeight: 600, fontSize: 14, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {action.instruction}
          </span>
        </span>
        <span className="shrink-0 rounded-full px-3.5 h-[32px] flex items-center text-[12px] font-bold" style={{ background: '#E5A93C', color: '#0A0A0F' }}>
          Start
        </span>
      </button>
    </>
  )
}
