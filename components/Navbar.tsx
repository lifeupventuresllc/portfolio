'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Profile = {
  role: string
}

export default function Navbar() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    async function getUser() {
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
            Asa Luke
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/services/content-editing" className="text-xs text-ivory/50 tracking-[0.15em] uppercase hover:text-gold transition-colors">
              Content
            </Link>
            <Link href="/services/audio-engineering" className="text-xs text-ivory/50 tracking-[0.15em] uppercase hover:text-gold transition-colors">
              Music
            </Link>
            <Link href="/#fitness" className="text-xs text-ivory/50 tracking-[0.15em] uppercase hover:text-gold transition-colors">
              Fitness
            </Link>

            {user && (
              <Link href="/content" className="text-xs text-ivory/50 tracking-[0.15em] uppercase hover:text-gold transition-colors">
                My Purchases
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

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden py-6 border-t border-smoke/30 space-y-4">
            <Link href="/services/content-editing" onClick={() => setMenuOpen(false)} className="block text-xs text-ivory/50 tracking-[0.15em] uppercase hover:text-gold transition-colors">
              Content
            </Link>
            <Link href="/services/audio-engineering" onClick={() => setMenuOpen(false)} className="block text-xs text-ivory/50 tracking-[0.15em] uppercase hover:text-gold transition-colors">
              Music
            </Link>
            <Link href="/#fitness" onClick={() => setMenuOpen(false)} className="block text-xs text-ivory/50 tracking-[0.15em] uppercase hover:text-gold transition-colors">
              Fitness
            </Link>
            {user ? (
              <>
                <Link href="/content" onClick={() => setMenuOpen(false)} className="block text-xs text-ivory/50 tracking-[0.15em] uppercase hover:text-gold transition-colors">
                  My Purchases
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
