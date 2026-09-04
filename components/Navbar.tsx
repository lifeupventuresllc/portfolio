'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Profile = {
  role: string
}

export default function Navbar() {
  const router = useRouter()
  // Built once per mount, not on every render — this was the REAL bug behind
  // Asa's sign-up typing report. createClient() was previously re-run on every
  // render, and the effect below depends on [supabase] — so every render made
  // a new client, which changed the dependency, which re-ran the effect, which
  // called getUser()/setUser() (a new object each time), which triggered
  // another render. A genuine infinite loop, continuously eating the main
  // thread on every page that renders Navbar. /plan/* pages render "bare"
  // (no Navbar at all, see SiteChrome.tsx), which is exactly why food logging
  // and Coach Asa chat never showed this — only marketing pages like /signup
  // have Navbar mounted.
  const supabase = useMemo(() => createClient(), [])
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    async function getUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        setProfile(data)
      }
      } catch {
        // Invalid token — clear locally only (API call with stale token would fail too)
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
      }
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-obsidian/80 backdrop-blur-xl border-b border-smoke/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between h-14 items-center">
          {/* Logo */}
          <Link href="/" className="text-base font-bold text-white tracking-[0.15em] uppercase">
            Life-Up Fitness
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/services/fitness" className="text-xs text-ivory/50 tracking-[0.15em] uppercase hover:text-gold transition-colors">
              Fitness
            </Link>

            {user && (
              <Link href="/plan" className="text-xs text-ivory/50 tracking-[0.15em] uppercase hover:text-gold transition-colors">
                My Plan
              </Link>
            )}
            {(profile?.role === 'admin' || profile?.role === 'support') && (
              <Link href="/admin" className="text-xs text-ivory/50 tracking-[0.15em] uppercase hover:text-gold transition-colors">
                Admin
              </Link>
            )}

            {user ? (
              <button
                onClick={handleSignOut}
                className="text-xs text-ivory/30 tracking-[0.15em] uppercase hover:text-gold transition-colors"
              >
                Sign Out
              </button>
            ) : (
              <Link
                href="/login"
                className="text-xs text-gold tracking-[0.15em] uppercase hover:text-gold/70 transition-colors"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-ivory/50 hover:text-gold transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8h16M4 16h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu — real bug fixed 2026-09-04 (Asa's report, new/
            anonymous users on the home screen): this `<nav>` is `fixed
            top-0` with no height cap of its own, so once this dropdown's
            content grew taller than the viewport (a real case on shorter
            screens), the overflow — including Login, always the last item
            — rendered below the visible screen edge with no way to reach
            it: `fixed` elements sit outside the page's own scroll, and
            this div had no scroll container of its own either. Capping
            it to the remaining space below the h-14 bar and letting it
            scroll internally (same fix already applied to ClientMenu's
            drawer for the identical class of bug) means it always stays
            reachable regardless of how tall the menu content gets. */}
        {menuOpen && (
          <div className="md:hidden py-6 border-t border-smoke/30 space-y-5 animate-slide-down max-h-[calc(100dvh-3.5rem)] overflow-y-auto overscroll-contain">
            <Link href="/services/fitness" onClick={() => setMenuOpen(false)} className="block text-sm text-ivory/50 tracking-[0.15em] uppercase hover:text-gold transition-colors py-1">
              Fitness
            </Link>
            {user ? (
              <>
                <Link href="/plan" onClick={() => setMenuOpen(false)} className="block text-xs text-ivory/50 tracking-[0.15em] uppercase hover:text-gold transition-colors">
                  My Plan
                </Link>
                <button onClick={() => { handleSignOut(); setMenuOpen(false); }} className="block text-xs text-ivory/30 tracking-[0.15em] uppercase hover:text-gold transition-colors">
                  Sign Out
                </button>
              </>
            ) : (
              <Link href="/login" onClick={() => setMenuOpen(false)} className="block text-xs text-gold tracking-[0.15em] uppercase">
                Login
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
