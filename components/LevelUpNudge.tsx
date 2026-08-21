'use client'

import { useEffect, useState } from 'react'

// Proactive "ready to level up?" card — the app watches for it (weeks at current
// level + consistent completions) and suggests it, rather than making her
// self-assess. One tap accepts (her next workout is generated at the new level
// automatically); declining just snoozes it for a couple weeks, no punishment.
const DISMISS_KEY = 'luf_levelup_dismissed_until'

export default function LevelUpNudge() {
  const [state, setState] = useState<{ eligible: boolean; nextLevelName: string | null } | null>(null)
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    let dismissedUntil = 0
    try { dismissedUntil = Number(localStorage.getItem(DISMISS_KEY)) || 0 } catch { /* noop */ }
    if (Date.now() < dismissedUntil) return
    fetch('/api/plan/level-up').then((r) => r.json()).then(setState).catch(() => {})
  }, [])

  async function accept() {
    setAccepted(true)
    try { await fetch('/api/plan/level-up', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accept: true }) }) } catch { /* noop */ }
  }

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now() + 14 * 86400000)) } catch { /* noop */ }
    setState(null)
  }

  if (!state?.eligible) return null

  return (
    <div className="rounded-2xl border border-emerald-400/40 bg-gradient-to-br from-emerald-500/20 to-charcoal bg-charcoal backdrop-blur-md px-5 py-4">
      {accepted ? (
        <p className="text-white font-semibold text-sm">Leveled up to {state.nextLevelName}! Your next workout will reflect it.</p>
      ) : (
        <>
          <p className="text-emerald-300 text-[9px] uppercase tracking-[0.25em] font-semibold mb-1">Level Up?</p>
          <p className="text-white font-semibold text-sm mb-3">You&apos;ve been consistent — ready to move up to {state.nextLevelName}?</p>
          <div className="flex gap-2">
            <button onClick={accept} className="flex-1 bg-emerald-500 text-obsidian px-3 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform">Yes, level me up</button>
            <button onClick={dismiss} className="bg-charcoal border border-smoke text-ivory/60 px-3 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform">Not yet</button>
          </div>
        </>
      )}
    </div>
  )
}
