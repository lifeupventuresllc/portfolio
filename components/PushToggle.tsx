'use client'

import { useEffect, useState } from 'react'

const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

function urlB64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
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
    if (!PUBLIC) { setMsg('Reminders come online once the app is connected.'); return }
    setBusy(true); setMsg('')
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setMsg('Allow notifications to turn on reminders.'); setBusy(false); return }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(PUBLIC) })
      const res = await fetch('/api/plan/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON() }) })
      if (res.ok) { setEnabled(true); setMsg('Reminders on. 💛') } else setMsg('Could not save — try again.')
    } catch { setMsg('Could not turn on reminders on this device.') }
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
        <span className="text-ivory/85 text-sm flex items-center gap-2"><span>🔔</span> Daily reminders</span>
        <button onClick={enabled ? disable : enable} disabled={busy} className={`text-xs font-bold px-3 py-1.5 rounded-full ${enabled ? 'bg-green-500/15 text-green-400' : 'bg-gold text-obsidian'} disabled:opacity-40`}>
          {busy ? '…' : enabled ? 'On' : 'Turn on'}
        </button>
      </div>
      {enabled && <button onClick={test} disabled={busy} className="text-gold/70 text-[11px] mt-1.5 hover:text-gold">Send me a test →</button>}
      {msg && <p className="text-ivory/50 text-[11px] mt-1">{msg}</p>}
    </div>
  )
}
