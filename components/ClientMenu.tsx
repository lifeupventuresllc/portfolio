'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
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
type IconName = 'plate' | 'trending' | 'chat' | 'video' | 'refresh' | 'user' | 'target' | 'mail' | 'logout'

function MenuIcon({ name }: { name: IconName }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'plate': return <svg {...common}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /></svg>
    case 'trending': return <svg {...common}><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></svg>
    case 'chat': return <svg {...common}><path d="M21 12a8 8 0 1 1-3.3-6.5L21 4l-1 4.2A8 8 0 0 1 21 12Z" /></svg>
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

  async function handleSignOut() {
    await supabase.auth.signOut()
    setOpen(false)
    router.push('/')
    router.refresh()
  }

  // Lock body scroll while the drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const sections: { title: string; items: Item[] }[] = [
    {
      title: 'My Plan',
      items: [
        { href: '/plan/meals', label: 'My meals — what I’m cooking & how', icon: 'plate' },
        { href: '/plan/checkin', label: 'My progress & previous weeks', icon: 'trending' },
        { href: '/plan/intake', label: 'My profile & stats', icon: 'user' },
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

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
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
            <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3" style={{ WebkitOverflowScrolling: 'touch' }}>
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
            </nav>
            <div className="shrink-0 border-t border-smoke px-3 pt-2" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
              <button onClick={handleSignOut} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-charcoal transition-colors w-full text-left text-ivory/60">
                <MenuIcon name="logout" />
                <span className="text-sm">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
