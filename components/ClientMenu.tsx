'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import PushToggle from '@/components/PushToggle'
import CalendarToggle from '@/components/CalendarToggle'
import { createClient } from '@/lib/supabase/client'

// The ☰ menu on the client home dashboard. Trimmed hard 2026-08-27 (Asa's
// direct ask): this app exists to reduce willpower/decision fatigue — the
// Next Action circle on the dashboard IS "the one thing" she should be
// doing right now, not a menu of paths to choose between. Ran every item
// that used to live here through that filter: cut anything that was either
// a browsable library/alternate program (decision surface) or already
// redundant with something the circle or bottom nav already does, kept
// only what's a required account/support function or genuinely needed to
// EXECUTE what's already been decided for her (what to cook, her real
// profile data). Cut: Today (bottom nav's "For You" already goes here),
// Away from home right now? (the circle handles this the moment she says
// she's eating out), Today's workout (the circle already routes here when
// it's the current action), Compound & HIIT (explicitly an optional
// alternate path), Workout Plans library, The Cookbook (both browsable
// libraries), My badges (not essential), 7-Day Jump Start / 21-Day Habit
// Reset (alternate onboarding paths), The Curve Collective (community —
// flagged as a real retention trade-off, not force-kept just because it
// might matter, per her explicit "if it doesn't help, remove it, I don't
// care" call).

// Professional icon style (standing rule, memory: luf-professional-icon-style)
// — never a literal emoji character in app UI, always a small monochrome SVG
// that inherits the row's own text color via currentColor. Feather-style thin
// stroke, matching the icons already established in BottomTabBar.tsx/
// VoiceButton.tsx elsewhere in this app.
type IconName = 'plate' | 'dumbbell' | 'trending' | 'chat' | 'video' | 'refresh' | 'user' | 'target' | 'mail' | 'logout'

function MenuIcon({ name }: { name: IconName }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    // Was two concentric circles — read as a "goal/target" glyph, not food,
    // and was nearly identical to 'target' below (button audit, 2026-09-03:
    // "My meals" vs. "Training style" were easy to mix up at a glance). Now
    // a fork + knife, and 'target' is the only bullseye left in this menu.
    case 'plate': return <svg {...common}><path d="M7 3v7M5 3v4a2 2 0 0 0 2 2 2 2 0 0 0 2-2V3" /><path d="M16 3c-1.5 0-2.5 1.5-2.5 4s1 3.5 2.5 3.5V21" /></svg>
    case 'dumbbell': return <svg {...common}><path d="M6.5 7v10M17.5 7v10M2.5 10v4M21.5 10v4M6.5 12h11" /></svg>
    case 'trending': return <svg {...common}><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></svg>
    // Was drawn as a near-closed arc — read as a loading spinner, not chat,
    // and was easy to confuse with 'refresh' below (button audit,
    // 2026-09-03: "Talk to your coach" vs. "Reset my plan"). Now a real
    // speech-bubble, matching the icon used elsewhere in the app.
    case 'chat': return <svg {...common}><path d="M21 11.5a8.4 8.4 0 0 1-8.4 8.4H4.6L3 21l1.3-4.2A8.4 8.4 0 1 1 21 11.5Z" /></svg>
    case 'video': return <svg {...common}><rect x="2" y="6" width="14" height="12" rx="2" /><path d="M16 10l6-3v10l-6-3" /></svg>
    case 'refresh': return <svg {...common}><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" /></svg>
    case 'user': return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4 20c1-4 4-6 8-6s7 2 8 6" /></svg>
    case 'target': return <svg {...common}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4.2" /><circle cx="12" cy="12" r="0.6" fill="currentColor" /></svg>
    case 'mail': return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>
    case 'logout': return <svg {...common}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l5-5-5-5M15 12H3" /></svg>
  }
}

type Item = { href: string; label: string; icon: IconName; external?: boolean }

export default function ClientMenu({ firstName, liveUrl, callAccess }: { firstName: string; liveUrl?: string; callAccess?: 'none' | 'monthly' | 'weekly' }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Real bug found live (Asa's screenshot, 2026-09-04): `fixed inset-0`
  // doesn't reliably equal the real visible screen on iOS Safari when its
  // UI chrome (address bar, bottom toolbar) is showing — the browser can
  // size a `fixed` element against the taller layout viewport instead of
  // the shorter visual one, so the drawer's own box ended before the
  // actual bottom of the screen, with the real page showing through and
  // overlapping the drawer's last rows. Asa pointed out this exact class
  // of bug was already solved once in this codebase, for BuilderView.tsx's
  // Garden card — this now copies that proven recipe as literally as
  // possible instead of a modified variant: same measure()/rAF pattern,
  // same event set (window resize + visualViewport resize + visualViewport
  // scroll — a same-value setState here is a no-op in React, so the
  // scroll listener isn't the re-render risk a prior pass here assumed).
  const [dialogHeight, setDialogHeight] = useState<number | null>(null)
  useEffect(() => {
    if (!open) return
    function measure() {
      setDialogHeight(window.visualViewport?.height ?? window.innerHeight)
    }
    measure()
    const raf = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    window.visualViewport?.addEventListener('resize', measure)
    window.visualViewport?.addEventListener('scroll', measure)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
      window.visualViewport?.removeEventListener('resize', measure)
      window.visualViewport?.removeEventListener('scroll', measure)
    }
  }, [open])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setOpen(false)
    router.push('/')
    router.refresh()
  }

  // Lock body scroll while the drawer is open. Real bug found live (Asa's
  // report, 2026-09-04, new/anonymous users unable to reach Sign Out at
  // the bottom of this exact menu): plain `overflow: hidden` on the body
  // is well known to NOT reliably stop iOS Safari's touch/rubber-band
  // scroll, and can fight the nested `nav` below for the same touch
  // gesture instead of letting it scroll internally — so on a real phone,
  // a touch that should scroll the drawer's own list could scroll (or
  // fail to scroll) the page behind it instead, with content past the
  // fold unreachable either way. `position: fixed` on the body is the
  // standard robust fix: it makes the background truly non-scrollable
  // (not just visually clipped) so touch events land on the drawer's own
  // `overflow-y-auto` nav instead, and the saved scroll position is
  // restored exactly on close.
  useEffect(() => {
    if (!open) return
    const scrollY = window.scrollY
    const body = document.body.style
    body.position = 'fixed'
    body.top = `-${scrollY}px`
    body.left = '0'
    body.right = '0'
    body.overflow = 'hidden'
    return () => {
      body.position = ''
      body.top = ''
      body.left = ''
      body.right = ''
      body.overflow = ''
      window.scrollTo(0, scrollY)
    }
  }, [open])

  const sections: { title: string; items: Item[] }[] = [
    {
      title: 'My Plan',
      items: [
        // Re-added 2026-08-28 (bug #13, real gap from testing): the
        // 2026-08-27 trim removed this on the theory the circle always
        // routes here when a workout is the current action — but once the
        // circle moves on ("Keep it simple", a message redirect, or it's
        // just not today's action), there was no way back to today's real
        // assigned workout at all. This always points at TODAY's workout —
        // /plan/workout computes that itself, same logic the circle reads.
        { href: '/plan/workout', label: 'My workout — today’s plan', icon: 'dumbbell' },
        { href: '/plan/meals', label: 'My meals — what I’m cooking & how', icon: 'plate' },
        { href: '/plan/checkin', label: 'My progress & previous weeks', icon: 'trending' },
        // Was "My profile & stats" — this opens the intake edit flow
        // (re-asking name, goals, etc.), not a profile/stats page, which
        // doesn't exist yet (button audit, 2026-09-03: this actively
        // misled rather than just being unclear). Relabeled to match what
        // it actually does; building a real profile/stats page is a
        // separate, bigger project, not folded into this fix.
        { href: '/plan/intake', label: 'Edit my intake answers', icon: 'user' },
        // Real gap found live (beta feedback Priority 1, 2026-08-25): the
        // optional tier (target weight, experience, training style, days/
        // week, cook days, postpartum, other info) only ever had an edit
        // link shown as a one-time "fine-tune your plan" nudge that
        // disappeared for good the moment she completed it once — after
        // that, training style specifically had no way back in at all.
        { href: '/plan/intake?tier=optional', label: 'Training style & extras', icon: 'target' },
      ],
    },
    {
      title: 'Coach & Support',
      items: [
        // Labels de-branded from "Coach Asa" 2026-08-27 (Asa's call): the
        // platform's talk-to-it assistant now lives inside the main circle
        // itself, not a separate persona-named destination — this app is a
        // platform connecting her to a coach/trainer, not a single named
        // personal-trainer app anymore. Community-tab -> personal-trainer
        // routing is a separate, larger platform build, not done here.
        { href: '/plan/coach', label: 'Talk to your coach', icon: 'chat' },
        liveUrl
          ? { href: liveUrl, label: 'Live video call with your coach', icon: 'video', external: true }
          : callAccess === 'weekly'
          ? { href: '/book', label: 'Book your weekly reset call', icon: 'video' }
          : callAccess === 'monthly'
          ? { href: '/book', label: 'Book your monthly call', icon: 'video' }
          : { href: '/plan/checkin', label: 'Live with your coach', icon: 'video' },
        // Inner Circle exclusive — one-tap plan reset, no re-intake
        ...(callAccess === 'weekly' ? [{ href: '/plan/life-reset', label: 'Life happened? Reset my plan', icon: 'refresh' as const }] : []),
        { href: '/plan/feedback', label: 'Send feedback', icon: 'mail' },
      ],
    },
  ]

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="h-10 w-10 rounded-xl bg-white/10 border border-white/20 flex flex-col items-center justify-center gap-[5px] hover:border-gold/60 transition-colors"
      >
        <span className="block h-0.5 w-5 bg-ivory/80 rounded-full" />
        <span className="block h-0.5 w-5 bg-ivory/80 rounded-full" />
        <span className="block h-0.5 w-5 bg-ivory/80 rounded-full" />
      </button>

      {/* Real root cause found live (Asa's screenshot, 2026-09-04, after
          three earlier rounds on this exact drawer that didn't hold): this
          whole subtree renders inside `app/plan/template.tsx`'s `.luf-page`
          wrapper, whose entrance animation (`app/globals.css`, `lufPage`)
          leaves it with a permanent computed `transform` (an identity
          matrix, from `animation-fill-mode: both` holding the end
          keyframe) — confirmed directly via getComputedStyle() on the live
          site, not just theorized. Per spec, any non-`none` transform on
          an ancestor becomes the containing block for a `position: fixed`
          descendant, so this drawer was never actually fixed to the real
          screen — it was pinned to `.luf-page`'s box instead, which is why
          it drifted in size and dragged along when the page under it
          scrolled. `app/plan/page.tsx` already hit and worked around this
          same `.luf-page` transform issue for the video feed. createPortal
          renders this drawer as a direct child of <body>, outside
          `.luf-page` entirely, so `fixed` means the real viewport again. */}
      {open && createPortal(
        <div
          className="fixed top-0 left-0 right-0 z-50"
          style={{ height: dialogHeight ?? '100dvh' }}
          role="dialog"
          aria-modal="true"
        >
          {/* touch-action: none — a drag that starts on the dimmed backdrop
              (as opposed to the drawer's own nav) should never be able to
              pan/scroll anything; only a tap-to-dismiss is meaningful here. */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" style={{ touchAction: 'none' }} onClick={() => setOpen(false)} />
          {/* Real bug fixed 2026-08-27: this drawer sized itself with an
              independent `100dvh` value instead of matching its own parent
              (the `fixed inset-0` wrapper immediately above, which the
              browser already sizes to the true viewport with no ambiguity).
              On at least one real device the two disagreed enough that the
              drawer rendered taller than the actual screen — with Sign Out
              moved into a non-scrolling footer (the previous fix, same day)
              that excess pushed the footer below the visible edge entirely,
              with no way to scroll it into view. `h-full` inherits the
              parent's already-correct height directly instead of computing
              a second, independent answer that can drift from it. */}
          <div className="absolute right-0 top-0 h-full w-[85%] max-w-xs bg-obsidian border-l border-smoke flex flex-col overflow-hidden luf-page">
            <div className="flex items-center justify-between px-5 py-4 border-b border-smoke shrink-0">
              <div>
                <p className="text-gold text-[10px] uppercase tracking-[0.25em] font-semibold">Life-Up Fitness</p>
                <p className="text-white font-bold">Hey {firstName}</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="text-ivory/50 hover:text-white text-2xl leading-none px-2">×</button>
            </div>
            <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
              {sections.map((sec) => (
                <div key={sec.title} className="mb-4">
                  <p className="text-ivory/35 text-[10px] uppercase tracking-wider font-semibold px-2 mb-1.5">{sec.title}</p>
                  {sec.items.map((it) =>
                    it.external ? (
                      <a key={it.label} href={it.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-charcoal transition-colors text-ivory/85">
                        <MenuIcon name={it.icon} />
                        <span className="text-sm">{it.label}</span>
                      </a>
                    ) : (
                      <Link key={it.label} href={it.href} onClick={() => setOpen(false)} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-charcoal transition-colors text-ivory/85">
                        <MenuIcon name={it.icon} />
                        <span className="text-sm">{it.label}</span>
                      </Link>
                    )
                  )}
                </div>
              ))}
              <div className="px-2 pt-3 mt-1 border-t border-smoke">
                <PushToggle />
              </div>
              <div className="px-2 pt-3 mt-1 border-t border-smoke">
                <CalendarToggle />
              </div>
              {/* Real bug fixed 2026-08-27: pinning this to a separate
                  footer BELOW a nav region forced to fill the full drawer
                  height (`flex-1`) left the footer stranded past a wall of
                  empty stretched space the moment the list got short (the
                  menu trim, same session) -- almost invisible. Sign Out
                  belongs back in the normal content flow, right after
                  everything else, so it sits at natural distance from real
                  content instead of past a void. Any leftover blank space
                  from the shorter list now just falls harmlessly below it. */}
              <div className="px-2 pt-3 mt-1 border-t border-smoke" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                <button onClick={handleSignOut} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-charcoal transition-colors w-full text-left text-ivory/60">
                  <MenuIcon name="logout" />
                  <span className="text-sm">Sign Out</span>
                </button>
              </div>
            </nav>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
