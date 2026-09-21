'use client'

import { useEffect, useState } from 'react'
import { enablePushSubscription } from '@/components/PushToggle'

const KEY = 'luf_reminder_prompt_dismissed'

// Real gap found live, 2026-09-21 (beta item 3, "everything one tap"): turning
// on daily reminders meant hamburger menu -> "Turn on" -> phone prompt, hidden
// where nobody looks. This offers it once, right after her first finished
// step, with one Yes button. Yes runs the SAME subscribe logic the menu toggle
// uses (enablePushSubscription) — the phone's permission prompt only ever
// appears from that tap, never on its own. Shows only if push is supported,
// permission is still undecided, she is not subscribed, and she has not
// dismissed it (localStorage can throw, so every access is guarded).
export default function ReminderPrompt({ trigger }: { trigger: boolean }) {
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!trigger) return
    let cancelled = false
    ;(async () => {
      try {
        if (!('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window)) return
        if (Notification.permission !== 'default') return
        try { if (localStorage.getItem(KEY)) return } catch { /* storage blocked: still fine to ask once per visit */ }
        const reg = await navigator.serviceWorker.ready
        if (await reg.pushManager.getSubscription()) return
        if (!cancelled) setShow(true)
      } catch { /* never block the card over a reminder */ }
    })()
    return () => { cancelled = true }
  }, [trigger])

  const dismiss = () => {
    try { localStorage.setItem(KEY, '1') } catch { /* ignore */ }
    setShow(false)
  }

  const yes = async () => {
    setBusy(true)
    const r = await enablePushSubscription()
    setBusy(false)
    if (r.ok) { setMsg(r.msg); try { localStorage.setItem(KEY, '1') } catch { /* ignore */ } setTimeout(() => setShow(false), 1800) }
    else { setMsg(r.msg) }
  }

  if (!show) return null
  return (
    <div className="mb-2 flex items-center gap-2 rounded-xl border border-white/15 bg-black/30 px-3 py-2" style={{ fontFamily: 'var(--font-poppins)' }}>
      <span className="flex-1 text-white/85 text-[12px] font-semibold">{msg || 'Want a daily reminder?'}</span>
      {!msg.startsWith('Reminders on') && (
        <>
          <button onClick={yes} disabled={busy} className="rounded-full px-3 h-[26px] text-[11px] font-bold disabled:opacity-60" style={{ background: '#E5A93C', color: '#0A0A0F' }}>{busy ? '…' : 'Yes'}</button>
          <button onClick={dismiss} disabled={busy} className="text-white/55 text-[11px] font-semibold px-1">Not now</button>
        </>
      )}
    </div>
  )
}
