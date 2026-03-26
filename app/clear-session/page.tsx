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
        if (key.includes('supabase') || key.includes('sb-')) {
          localStorage.removeItem(key)
        }
      }

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

      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = '/login'
      }, 2000)
    }
    clear()
  }, [])

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-4">
          {done ? 'Session Cleared!' : 'Clearing session...'}
        </h1>
        <p className="text-ivory/60">
          {done ? 'Redirecting to login...' : 'Please wait...'}
        </p>
      </div>
    </div>
  )
}
