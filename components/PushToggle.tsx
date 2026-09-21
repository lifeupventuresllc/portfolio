'use client'

import { useEffect, useState } from 'react'

// Trimmed in case a stray space/newline slipped into the Vercel env value.
const PUBLIC = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').trim()

function urlB64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

// Real gap found live, 2026-09-21 (beta item 3, "everything one tap"): the
// subscribe steps used to live only inside the component below, so the
// one-time "Want a daily reminder?" prompt (ReminderPrompt.tsx) could not reuse
// them. Pulled out unchanged so both surfaces run the exact same logic.
export async function enablePushSubscription(): Promise<{ ok: boolean; msg: string }> {
  if (!PUBLIC) return { ok: false, msg: 'Reminders come online once the app is connected.' }
  try {
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return { ok: false, msg: 'Allow notifications to turn on reminders.' }
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(PUBLIC) })
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const res = await fetch('/api/plan/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON(), timezone }) })
    return res.ok ? { ok: true, msg: 'Reminders on. 💛' } : { ok: false, msg: 'Could not save — try again.' }
  } catch { return { ok: false, msg: 'Could not turn on reminders on this device.' } }
}

// Opt-in toggle for daily push reminders. Lives in the ☰ menu. Handles the iPhone
// case (Web Push only works once the app is added to the Home Screen).
export default function PushToggle() {
  const [supported, setSupported] = useState<boolean | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const ok = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    setSupported(ok)
    if (ok) navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription()).then((s) => setEnabled(!!s)).catch(() => {})
  }, [])

  async function enable() {
    setBusy(true); setMsg('')
    const r = await enablePushSubscription()
    if (r.ok) setEnabled(true)
    setMsg(r.msg)
    setBusy(false)
  }

  async function disable() {
    setBusy(true); setMsg('')
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) { await fetch('/api/plan/push/subscribe?endpoint=' + encodeURIComponent(sub.endpoint), { method: 'DELETE' }); await sub.unsubscribe() }
      setEnabled(false); setMsg('Reminders off.')
    } catch { setMsg('Could not turn off.') }
    setBusy(false)
  }

  async function test() {
    setBusy(true)
    const r = await fetch('/api/plan/push/test', { method: 'POST' }).then((x) => x.json()).catch(() => ({ sent: 0 }))
    setMsg(r?.sent ? 'Sent — check your notifications.' : 'Turn reminders on first, then test.')
    setBusy(false)
  }

  if (supported === false) {
    return <p className="text-ivory/40 text-[11px]">On iPhone, tap Share → “Add to Home Screen” to enable reminders.</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-ivory/85 text-sm flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a5 5 0 0 0-5 5v3.5L5 15h14l-2-3.5V8a5 5 0 0 0-5-5Z" /><path d="M10 18a2 2 0 0 0 4 0" /></svg>
          Daily reminders
        </span>
        <button onClick={enabled ? disable : enable} disabled={busy} className={`text-xs font-bold px-3 py-1.5 rounded-full ${enabled ? 'bg-green-500/15 text-green-400' : 'bg-gold text-obsidian'} disabled:opacity-40`}>
          {busy ? '…' : enabled ? 'On' : 'Turn on'}
        </button>
      </div>
      {enabled && <button onClick={test} disabled={busy} className="text-gold/70 text-[11px] mt-1.5 hover:text-gold">Send me a test →</button>}
      {msg && <p className="text-ivory/50 text-[11px] mt-1">{msg}</p>}
    </div>
  )
}
