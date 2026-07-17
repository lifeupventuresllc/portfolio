'use client'

import { useEffect } from 'react'

// Registers the service worker so the app is installable ("Add to Home Screen")
// and works offline. Silent no-op where service workers aren't supported.
export default function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])
  return null
}
