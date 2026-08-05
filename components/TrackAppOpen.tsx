'use client'

import { useEffect } from 'react'

// Fires once per browser session (not every navigation) — the timestamp
// itself is the signal, this just keeps it fresh without hammering the DB.
export default function TrackAppOpen() {
  useEffect(() => {
    const key = 'luf_open_tracked'
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    fetch('/api/plan/track-open', { method: 'POST' }).catch(() => {})
  }, [])
  return null
}
