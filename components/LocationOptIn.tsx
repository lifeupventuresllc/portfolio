'use client'

import { useEffect, useState } from 'react'

const KEY = 'luf_location_prompt_dismissed'
// Re-send her position at most this often once she's said yes once — no
// background timer, just "on every real Home visit, if it's been a while."
const REPING_MINUTES = 20

async function sendPing(lat: number, lng: number) {
  try { await fetch('/api/plan/location-ping', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lat, lng }) }) } catch { /* next real visit tries again */ }
}

// Real gap found live, 2026-09-23 (Asa's direct ask): the eating-out engine
// could only ever act on a scheduled "eat out day" or her own typed
// message — it had no way to know she's actually standing at a real,
// known restaurant right now. This is the ONE real permission ask for
// that, matching item 3's own "no button without a tap" rule
// (components/ReminderPrompt.tsx): never calls the browser's own
// location prompt until she taps Yes here herself.
export default function LocationOptIn() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!('geolocation' in navigator)) return
    let cancelled = false
    ;(async () => {
      try {
        // Already decided (either direction) — a real answer already on
        // file always wins over asking again.
        const perm = 'permissions' in navigator ? await navigator.permissions.query({ name: 'geolocation' as PermissionName }).catch(() => null) : null
        if (perm?.state === 'granted') {
          const last = Number(localStorage.getItem('luf_last_ping_at') || 0)
          if (Date.now() - last > REPING_MINUTES * 60000) {
            navigator.geolocation.getCurrentPosition((pos) => {
              sendPing(pos.coords.latitude, pos.coords.longitude)
              try { localStorage.setItem('luf_last_ping_at', String(Date.now())) } catch { /* fine */ }
            }, () => {}, { maximumAge: 10 * 60000, timeout: 5000 })
          }
          return
        }
        if (perm?.state === 'denied') return
        try { if (localStorage.getItem(KEY)) return } catch { /* storage blocked: still fine to ask once per visit */ }
        if (!cancelled) setShow(true)
      } catch { /* never block Home over this */ }
    })()
    return () => { cancelled = true }
  }, [])

  const dismiss = () => {
    try { localStorage.setItem(KEY, '1') } catch { /* ignore */ }
    setShow(false)
  }

  const allow = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => { sendPing(pos.coords.latitude, pos.coords.longitude); try { localStorage.setItem('luf_last_ping_at', String(Date.now())) } catch { /* fine */ } setShow(false) },
      () => setShow(false), // denied or failed — never ask again this visit; permission state itself remembers her real answer
      { maximumAge: 10 * 60000, timeout: 8000 },
    )
  }

  if (!show) return null
  return (
    <div className="rounded-xl px-3 py-2.5 mb-2 flex items-center gap-2.5" style={{ fontFamily: 'var(--font-poppins)', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(229,169,60,0.4)' }}>
      <span className="text-lg shrink-0" aria-hidden>📍</span>
      <p className="flex-1 text-white text-[11.5px] leading-snug">Want a real pick from wherever you are, the moment you need one?</p>
      <button onClick={allow} className="shrink-0 rounded-full px-3 h-[26px] text-[11px] font-bold" style={{ background: '#E5A93C', color: '#0A0A0F' }}>Yes</button>
      <button onClick={dismiss} className="shrink-0 text-white/50 text-[11px] font-semibold px-1">Not now</button>
    </div>
  )
}
