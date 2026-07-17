'use client'
import { useEffect, useRef } from 'react'

// Keeps a dashboard card "live" without websockets. Runs `refresh`:
//  • on mount,
//  • whenever the tab regains focus / becomes visible (e.g. coming back from
//    logging food or finishing a workout),
//  • when any card broadcasts a change via broadcastRefresh(),
//  • once at local midnight so the day's goals roll over on their own.
// The single writer of this data is the user on their own device, so refetch-on-
// focus is more reliable (and far simpler) than realtime subscriptions.
export function useLiveRefresh(refresh: () => void) {
  const ref = useRef(refresh)
  ref.current = refresh
  useEffect(() => {
    const run = () => ref.current()
    const onVis = () => { if (document.visibilityState === 'visible') run() }
    run()
    window.addEventListener('focus', run)
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('luf:refresh', run as EventListener)
    // Roll over at local midnight (+5s cushion) so new-day goals refresh live.
    const now = new Date()
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5)
    const t = setTimeout(run, Math.max(1000, midnight.getTime() - now.getTime()))
    return () => {
      window.removeEventListener('focus', run)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('luf:refresh', run as EventListener)
      clearTimeout(t)
    }
  }, [])
}

// Tell every live card on the page to refetch now (call after a local mutation).
export function broadcastRefresh() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('luf:refresh'))
}

// Today's date (YYYY-MM-DD) in the BROWSER's local timezone — matches the server's
// tz-cookie day, so celebration dedupe keys and workout progress line up per real day.
export function localTodayISO(): string {
  return new Date().toLocaleDateString('en-CA')
}
