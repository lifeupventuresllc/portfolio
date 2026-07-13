'use client'

import { useState } from 'react'

// ⚠️ TEMPORARY — QA ONLY. One button to free-enroll a QA account (server-side
// allowlist enforces who) so the full journey is testable without Stripe.
// Remove this page + /api/plan/test-enroll before public launch.
export default function TestEnrollPage() {
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function enroll() {
    setStatus('working'); setMsg('')
    try {
      const res = await fetch('/api/plan/test-enroll', { method: 'POST' })
      const d = await res.json()
      if (d.success) { setStatus('done'); setTimeout(() => { window.location.href = '/plan/intake' }, 900) }
      else { setStatus('error'); setMsg(d.error || 'Could not enroll.') }
    } catch { setStatus('error'); setMsg('Could not enroll.') }
  }

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-charcoal border border-gold/30 rounded-3xl p-8 text-center">
        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-2">QA Only</p>
        <h1 className="text-2xl font-bold text-white mb-2">Free test enrollment</h1>
        <p className="text-ivory/50 text-sm mb-6">
          Enrolls this QA account into the challenge (no charge) so you can walk the whole journey:
          intake → workout + meals → check-in. Remove before launch.
        </p>
        <button onClick={enroll} disabled={status === 'working' || status === 'done'}
          className="w-full bg-gold text-obsidian py-3.5 rounded-2xl font-bold text-sm uppercase tracking-wider disabled:opacity-50">
          {status === 'working' ? 'Enrolling…' : status === 'done' ? 'Enrolled — taking you to intake…' : 'Enroll me free (test)'}
        </button>
        {status === 'error' && <p className="text-red-400 text-sm mt-3">{msg}</p>}
      </div>
    </div>
  )
}
