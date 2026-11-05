'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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
// prompt / refreshOnPing (2026-10-23): the Nutrition tab reuses this same
// ask, in its own words, and re-renders the two picks once her position
// lands so they come from places open near her.
// 2026-11-05 (Asa's problem #4): once she said "Not now", the Nutrition tab
// never asked again and she had no way back. Now the large ask leaves a small
// "Restaurants near me" button behind; one tap asks the phone right then.
export default function LocationOptIn({ prompt, refreshOnPing = false, large = false }: { prompt?: string; refreshOnPing?: boolean; large?: boolean } = {}) {
  const [show, setShow] = useState(false)
  const [later, setLater] = useState(false)   // she said "Not now" (large only): the small button
  const [blocked, setBlocked] = useState(false) // the phone said no: tell her where to switch it on
  const router = useRouter()

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
            navigator.geolocation.getCurrentPosition(async (pos) => {
              await sendPing(pos.coords.latitude, pos.coords.longitude)
              if (refreshOnPing) router.refresh()
              try { localStorage.setItem('luf_last_ping_at', String(Date.now())) } catch { /* fine */ }
            }, () => {}, { maximumAge: 10 * 60000, timeout: 5000 })
          }
          return
        }
        if (perm?.state === 'denied') { if (!cancelled) setLater(true); return }
        try { if (localStorage.getItem(KEY)) { if (!cancelled) setLater(true); return } } catch { /* storage blocked: still fine to ask once per visit */ }
        if (!cancelled) setShow(true)
      } catch { /* never block Home over this */ }
    })()
    return () => { cancelled = true }
  }, [refreshOnPing, router])

  const dismiss = () => {
    try { localStorage.setItem(KEY, '1') } catch { /* ignore */ }
    setShow(false)
    setLater(true)
  }

  const allow = () => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => { await sendPing(pos.coords.latitude, pos.coords.longitude); try { localStorage.setItem('luf_last_ping_at', String(Date.now())); localStorage.removeItem(KEY) } catch { /* fine */ } setShow(false); setLater(false); setBlocked(false); if (refreshOnPing) router.refresh() },
      () => { setShow(false); setLater(true); setBlocked(true) }, // denied or failed — the permission state itself remembers her real answer
      { maximumAge: 10 * 60000, timeout: 8000 },
    )
  }

  if (!show && large && later) return (
    <div className="max-w-md mx-auto w-full mb-3 flex flex-col gap-2" style={{ fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif' }}>
      <button type="button" onClick={allow} className="nf-press self-start flex items-center gap-2 rounded-full pl-3 pr-4" style={{ height: 44, border: '2px solid rgba(229,169,60,.5)', color: '#EDE7DA', background: 'transparent', fontSize: 15, fontWeight: 600 }}>
        <span aria-hidden>📍</span> Show restaurants near me
      </button>
      {blocked && (
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.4, color: 'rgba(237,231,218,.72)' }}>
          Your phone said no. On iPhone: open Settings, tap Privacy, then Location Services, then Safari Websites, and pick While Using. Then tap the button again.
        </p>
      )}
    </div>
  )
  if (!show) return null
  // large (Nutrition tab, 2026-10-23 — Asa: "make the banner larger"): same
  // ask, easy to read and easy to tap with a thumb. 2026-10-26: the new look
  // (cream on deep green, gold, JetBrains Mono buttons).
  if (large) return (
    <div className="nf-rise max-w-md mx-auto w-full rounded-2xl px-4 py-4 mb-4 flex flex-col gap-3" style={{ fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif', background: 'rgba(237,231,218,.06)', border: '2px solid rgba(229,169,60,.45)' }}>
      <div className="flex items-center gap-3">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E5A93C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
          <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" />
        </svg>
        <p className="flex-1 text-[16px] font-semibold leading-snug" style={{ margin: 0, color: '#EDE7DA' }}>{prompt || 'Want a real pick from wherever you are, the moment you need one?'}</p>
      </div>
      <div className="flex gap-2.5">
        <button onClick={allow} className="nf-press flex-1 rounded-full h-12" style={{ background: '#E5A93C', color: '#021F16', fontFamily: "var(--font-jbmono), 'JetBrains Mono', monospace", fontWeight: 700, fontSize: 13, letterSpacing: '.12em' }}>YES</button>
        <button onClick={dismiss} className="nf-press flex-1 rounded-full h-12" style={{ border: '2px solid rgba(237,231,218,.22)', color: '#EDE7DA', fontFamily: "var(--font-jbmono), 'JetBrains Mono', monospace", fontWeight: 700, fontSize: 13, letterSpacing: '.12em' }}>NOT NOW</button>
      </div>
    </div>
  )
  return (
    <div className="rounded-xl px-3 py-2.5 mb-2 flex items-center gap-2.5" style={{ fontFamily: 'var(--font-poppins)', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(229,169,60,0.4)' }}>
      <span className="text-lg shrink-0" aria-hidden>📍</span>
      <p className="flex-1 text-white text-[11.5px] leading-snug">{prompt || 'Want a real pick from wherever you are, the moment you need one?'}</p>
      <button onClick={allow} className="shrink-0 rounded-full px-3 h-[26px] text-[11px] font-bold" style={{ background: '#E5A93C', color: '#0A0A0F' }}>Yes</button>
      <button onClick={dismiss} className="shrink-0 text-white/50 text-[11px] font-semibold px-1">Not now</button>
    </div>
  )
}
