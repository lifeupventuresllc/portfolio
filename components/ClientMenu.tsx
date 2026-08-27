'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PushToggle from '@/components/PushToggle'
import CalendarToggle from '@/components/CalendarToggle'
import { createClient } from '@/lib/supabase/client'

// The ☰ menu on the client home dashboard — keeps the home screen simple while
// everything deeper lives one tap away: profile, meals + how-to, cookbook,
// live calls, progress, previous weeks, community + extras.

// Professional icon style (standing rule, memory: luf-professional-icon-style)
// — never a literal emoji character in app UI, always a small monochrome SVG
// that inherits the row's own text color via currentColor. Feather-style thin
// stroke, matching the icons already established in BottomTabBar.tsx/
// VoiceButton.tsx elsewhere in this app.
type IconName =
  | 'sun' | 'burger' | 'plate' | 'book' | 'dumbbell' | 'timer' | 'list'
  | 'trending' | 'award' | 'chat' | 'video' | 'refresh' | 'users' | 'bolt'
  | 'repeat' | 'user' | 'target' | 'mail' | 'logout'

function MenuIcon({ name }: { name: IconName }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'sun': return <svg {...common}><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></svg>
    case 'burger': return <svg {...common}><path d="M4 8h16M4 16h16M3 12h18" /></svg>
    case 'plate': return <svg {...common}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /></svg>
    case 'book': return <svg {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5V5.5Z" /><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20" /></svg>
    case 'dumbbell': return <svg {...common}><path d="M4 9v6M2 10v4M22 10v4M20 9v6M6 12h12" /></svg>
    case 'timer': return <svg {...common}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2M10 2h4" /></svg>
    case 'list': return <svg {...common}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
    case 'trending': return <svg {...common}><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></svg>
    case 'award': return <svg {...common}><circle cx="12" cy="8" r="5" /><path d="M8.5 12.5 7 21l5-3 5 3-1.5-8.5" /></svg>
    case 'chat': return <svg {...common}><path d="M21 12a8 8 0 1 1-3.3-6.5L21 4l-1 4.2A8 8 0 0 1 21 12Z" /></svg>
    case 'video': return <svg {...common}><rect x="2" y="6" width="14" height="12" rx="2" /><path d="M16 10l6-3v10l-6-3" /></svg>
    case 'refresh': return <svg {...common}><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" /></svg>
    case 'users': return <svg {...common}><circle cx="9" cy="8" r="3.2" /><path d="M2.5 19c.6-3 3-5 6.5-5s5.9 2 6.5 5" /><circle cx="17.5" cy="8.5" r="2.6" /><path d="M15.5 14.5c2.6.4 4.5 2.1 5 4.5" /></svg>
    case 'bolt': return <svg {...common}><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" /></svg>
    case 'repeat': return <svg {...common}><path d="M17 2l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>
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
      title: 'Today',
      items: [
        { href: '/plan/today', label: 'Today', icon: 'sun' },
        { href: '/plan/eating-out', label: 'Away from home right now?', icon: 'burger' },
      ],
    },
    {
      title: 'Nutrition',
      items: [
        { href: '/plan/meals', label: 'My meals — what I’m cooking & how', icon: 'plate' },
        { href: '/plan/library', label: 'The Cookbook', icon: 'book' },
      ],
    },
    {
      title: 'Training',
      items: [
        { href: '/plan/workout', label: 'Today’s workout', icon: 'dumbbell' },
        { href: '/plan/compound', label: 'Compound & HIIT Full-Body (optional)', icon: 'timer' },
        { href: '/plan/exercises', label: 'Workout Plans — every move', icon: 'list' },
      ],
    },
    {
      title: 'Progress',
      items: [
        { href: '/plan/checkin', label: 'My progress & previous weeks', icon: 'trending' },
        { href: '/plan/achievements', label: 'My badges', icon: 'award' },
      ],
    },
    {
      title: 'With Coach Asa',
      items: [
        { href: '/plan/coach', label: 'Tell Coach Asa about your day', icon: 'chat' },
        liveUrl
          ? { href: liveUrl, label: 'Live video call with Coach Asa', icon: 'video', external: true }
          : callAccess === 'weekly'
          ? { href: '/book', label: 'Book your weekly reset call', icon: 'video' }
          : callAccess === 'monthly'
          ? { href: '/book', label: 'Book your monthly call', icon: 'video' }
          : { href: '/plan/checkin', label: 'Live with Coach Asa', icon: 'video' },
        // Inner Circle exclusive — one-tap plan reset, no re-intake
        ...(callAccess === 'weekly' ? [{ href: '/plan/life-reset', label: 'Life happened? Reset my plan', icon: 'refresh' as const }] : []),
        { href: '/plan/community', label: 'The Curve Collective', icon: 'users' },
      ],
    },
    {
      title: 'Extras',
      items: [
        { href: '/plan/jumpstart', label: '7-Day Jump Start', icon: 'bolt' },
        { href: '/plan/reset', label: '21-Day Habit Reset', icon: 'repeat' },
        { href: '/plan/intake', label: 'My profile & stats', icon: 'user' },
        // Real gap found live (beta feedback Priority 1, 2026-08-25): the
        // optional tier (target weight, experience, training style, days/
        // week, cook days, postpartum, other info) only ever had an edit
        // link shown as a one-time "fine-tune your plan" nudge that
        // disappeared for good the moment she completed it once — after
        // that, training style specifically had no way back in at all.
        { href: '/plan/intake?tier=optional', label: 'Training style & extras', icon: 'target' },
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
