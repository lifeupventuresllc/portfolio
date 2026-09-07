'use client'

import { useState } from 'react'
import Link from 'next/link'

// My Profile form (Asa's ask, 2026-09-07). Plain fetch to app/api/plan/
// profile/route.ts — see that file's own comment for why an email change
// here doesn't go through Supabase's normal confirm-the-new-address flow.
//
// Real bug found live testing (Asa's ask, 2026-09-07): for an anonymous
// session, email used to be required to save anything at all (blocked a
// phone-only save), AND typing one in here would have attached a real email
// with no password ever set — this form never collected one, so she'd have
// no way to log back in as that same identity afterward. isAnonymous drops
// the email field entirely for her (name + phone only) and points to the
// real claim flow (/plan/save, which collects email + password together)
// instead of this form half-doing that job.
export default function ProfileForm({ initialName, initialEmail, initialPhone, isAnonymous }: { initialName: string; initialEmail: string; initialPhone: string; isAnonymous: boolean }) {
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [phone, setPhone] = useState(initialPhone)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!isAnonymous && !email.trim()) { setError('Email is required.'); return }
    setSaving(true); setError(''); setSaved(false)
    try {
      const res = await fetch('/api/plan/profile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: isAnonymous ? null : email, phone }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Something went wrong. Please try again.')
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const field = 'w-full bg-charcoal border border-smoke rounded-xl px-4 py-3 text-white placeholder:text-ivory/30 focus:outline-none focus:border-gold/60 transition-colors'

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-ivory/60 text-xs font-semibold uppercase tracking-wider mb-1.5">Name</label>
        <input value={name} onChange={(e) => { setName(e.target.value); setSaved(false) }} placeholder="Your name" className={field} />
      </div>
      {isAnonymous ? (
        <div className="rounded-xl border border-gold/30 bg-gold/5 px-4 py-3">
          <p className="text-white text-sm font-semibold mb-1">No email on file yet</p>
          <p className="text-ivory/50 text-xs mb-3">Create a real account to add an email and password — that&apos;s the one place both get set together, safely.</p>
          <Link href="/plan/save" className="inline-block text-gold text-xs font-semibold underline underline-offset-4">Save your progress →</Link>
        </div>
      ) : (
        <div>
          <label className="block text-ivory/60 text-xs font-semibold uppercase tracking-wider mb-1.5">Email</label>
          <input value={email} onChange={(e) => { setEmail(e.target.value); setSaved(false) }} type="email" placeholder="you@example.com" className={field} />
        </div>
      )}
      <div>
        <label className="block text-ivory/60 text-xs font-semibold uppercase tracking-wider mb-1.5">Phone</label>
        <input value={phone} onChange={(e) => { setPhone(e.target.value); setSaved(false) }} type="tel" placeholder="(555) 555-5555" className={field} />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {saved && <p className="text-emerald-400 text-sm">Saved.</p>}

      <button onClick={save} disabled={saving} className="w-full bg-gold text-obsidian py-3.5 font-bold text-sm uppercase tracking-wider rounded-2xl disabled:opacity-50">
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  )
}
