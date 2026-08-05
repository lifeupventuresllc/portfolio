'use client'

import { useEffect, useState } from 'react'

// Opt-in toggle for calendar access, matching PushToggle's pattern. Lives in
// the ☰ menu — sees a packed/stacking schedule before it becomes an obvious
// crisis. Purely a signal feed, nothing here is shown back to her verbatim.
export default function CalendarToggle() {
  const [connected, setConnected] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/calendar/status').then((r) => r.json()).then((d) => setConnected(!!d.connected)).catch(() => setConnected(false))
  }, [])

  if (connected === null) return null

  return (
    <div className="flex items-center justify-between">
      <span className="text-ivory/85 text-sm flex items-center gap-2"><span>📅</span> Calendar awareness</span>
      {connected ? (
        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-green-500/15 text-green-400">Connected</span>
      ) : (
        <a href="/api/calendar/connect" className="text-xs font-bold px-3 py-1.5 rounded-full bg-gold text-obsidian">Connect</a>
      )}
    </div>
  )
}
