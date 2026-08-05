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

type Item = { href: string; label: string; icon: string; external?: boolean }

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
        { href: '/plan/today', label: 'Today', icon: '☀️' },
        { href: '/plan/eating-out', label: 'Away from home right now?', icon: '🍔' },
      ],
    },
    {
      title: 'Nutrition',
      items: [
        { href: '/plan/meals', label: 'My meals — what I’m cooking & how', icon: '🍽️' },
        { href: '/plan/library', label: 'The Cookbook', icon: '📖' },
      ],
    },
    {
      title: 'Training',
      items: [
        { href: '/plan/workout', label: 'Today’s workout', icon: '💪🏽' },
        { href: '/plan/compound', label: 'Compound & HIIT Full-Body (optional)', icon: '🔥' },
        { href: '/plan/exercises', label: 'Workout Plans — every move', icon: '🏋️' },
      ],
    },
    {
      title: 'Progress',
      items: [
        { href: '/plan/checkin', label: 'My progress & previous weeks', icon: '📈' },
        { href: '/plan/achievements', label: 'My badges', icon: '🏅' },
      ],
    },
    {
      title: 'With Coach Asa',
      items: [
        { href: '/plan/coach', label: 'Tell Coach Asa about your day', icon: '🧠' },
        liveUrl
          ? { href: liveUrl, label: 'Live video call with Coach Asa', icon: '📹', external: true }
          : callAccess === 'weekly'
          ? { href: '/book', label: 'Book your weekly reset call', icon: '📹' }
          : callAccess === 'monthly'
          ? { href: '/book', label: 'Book your monthly call', icon: '📹' }
          : { href: '/plan/checkin', label: 'Live with Coach Asa', icon: '📹' },
        // Inner Circle exclusive — one-tap plan reset, no re-intake
        ...(callAccess === 'weekly' ? [{ href: '/plan/life-reset', label: 'Life happened? Reset my plan', icon: '🔄' }] : []),
        { href: '/plan/community', label: 'The Curve Collective', icon: '💛' },
      ],
    },
    {
      title: 'Extras',
      items: [
        { href: '/plan/jumpstart', label: '7-Day Jump Start', icon: '⚡' },
        { href: '/plan/reset', label: '21-Day Habit Reset', icon: '🔁' },
        { href: '/plan/intake', label: 'My profile & stats', icon: '👤' },
        { href: '/plan/feedback', label: 'Send feedback', icon: '💬' },
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
          <div className="absolute right-0 top-0 h-full w-[85%] max-w-xs bg-obsidian border-l border-smoke overflow-y-auto overscroll-contain luf-page">
            <div className="flex items-center justify-between px-5 py-4 border-b border-smoke">
              <div>
                <p className="text-gold text-[10px] uppercase tracking-[0.25em] font-semibold">Life-Up Fitness</p>
                <p className="text-white font-bold">Hey {firstName} 👋</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="text-ivory/50 hover:text-white text-2xl leading-none px-2">×</button>
            </div>
            <nav className="px-3 py-3" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
              {sections.map((sec) => (
                <div key={sec.title} className="mb-4">
                  <p className="text-ivory/35 text-[10px] uppercase tracking-wider font-semibold px-2 mb-1.5">{sec.title}</p>
                  {sec.items.map((it) =>
                    it.external ? (
                      <a key={it.label} href={it.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-charcoal transition-colors">
                        <span className="text-lg">{it.icon}</span>
                        <span className="text-ivory/85 text-sm">{it.label}</span>
                      </a>
                    ) : (
                      <Link key={it.label} href={it.href} onClick={() => setOpen(false)} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-charcoal transition-colors">
                        <span className="text-lg">{it.icon}</span>
                        <span className="text-ivory/85 text-sm">{it.label}</span>
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
              <div className="px-2 pt-3 mt-1 border-t border-smoke">
                <button onClick={handleSignOut} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-charcoal transition-colors w-full text-left">
                  <span className="text-lg">🚪</span>
                  <span className="text-ivory/60 text-sm">Sign Out</span>
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
