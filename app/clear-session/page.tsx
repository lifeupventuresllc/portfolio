'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ClearSessionPage() {
  const [done, setDone] = useState(false)

  useEffect(() => {
    async function clear() {
      // Clear Supabase auth from localStorage
      const keys = Object.keys(localStorage)
      for (const key of keys) {
        // luf_* = her welcome-seen, location, plan and meal memory on this phone
        if (key.includes('supabase') || key.includes('sb-') || key.startsWith('luf_')) {
          localStorage.removeItem(key)
        }
      }

      try { sessionStorage.clear() } catch { /* fine */ }

      // Also sign out via the client
      const supabase = createClient()
      await supabase.auth.signOut().catch(() => {})

      // Clear any remaining cookies
      document.cookie.split(';').forEach(c => {
        const name = c.trim().split('=')[0]
        if (name.includes('sb-') || name.includes('supabase')) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
        }
      })

      setDone(true)

      // Back to the start as a brand-new visitor (2026-11-06, Asa: testing as
      // a fresh user; it used to dead-end on the log in screen).
      setTimeout(() => {
        window.location.href = '/'
      }, 1500)
    }
    clear()
  }, [])

  return (
    <div className="min-h-[100dvh] bg-obsidian flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-4">
          {done ? 'All cleared.' : 'Clearing…'}
        </h1>
        <p className="text-ivory/60">
          {done ? 'Starting you over as a new visitor…' : 'One second.'}
        </p>
      </div>
    </div>
  )
}
