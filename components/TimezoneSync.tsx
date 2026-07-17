'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Writes the browser's IANA timezone into a `tz` cookie so the server can compute
// day-boundaries in the user's local time. Refreshes once if the tz changed (e.g.
// travel) so the very next render uses the correct local day.
export default function TimezoneSync() {
  const router = useRouter()
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (!tz) return
      const current = document.cookie.split('; ').find((c) => c.startsWith('tz='))?.split('=')[1]
      if (current !== tz) {
        document.cookie = `tz=${tz}; path=/; max-age=31536000; samesite=lax`
        router.refresh()
      }
    } catch { /* ignore */ }
  }, [router])
  return null
}
