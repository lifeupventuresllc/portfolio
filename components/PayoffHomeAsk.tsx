'use client'

import { useState } from 'react'
import { PAYOFF_OPTIONS } from '@/lib/payoff'

// The catch-up ask (2026-09-24) for anyone who finished real intake before
// the "what's your why" step existed — same real problem the "Change my
// goal" fix solved for the goal question, just for payoffs: without this,
// an existing account would never get personalized messaging unless she
// happened to go dig it out of Settings herself. Shown once on Home; a real
// server-side skip marker (app/api/plan/payoff-ask/route.ts), never a
// device-scoped flag — see that route's comment for why that matters.
export default function PayoffHomeAsk() {
  const [visible, setVisible] = useState(true)
  const [picked, setPicked] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  const toggle = (v: string) => setPicked((a) => (a.includes(v) ? a.filter((x) => x !== v) : [...a, v]))

  async function save() {
    if (saving) return
    setSaving(true); setError(false)
    try {
      const res = await fetch('/api/plan/payoff-ask', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoffs: picked }),
      })
      if (!res.ok) throw new Error('save failed')
      setVisible(false)
    } catch {
      setError(true); setSaving(false)
    }
  }

  async function skip() {
    if (saving) return
    setSaving(true)
    try {
      await fetch('/api/plan/payoff-ask', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skip: true }),
      })
    } catch { /* best-effort — never block her over this */ }
    setVisible(false)
  }

  if (!visible) return null
  return (
    <div className="mb-3 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-4">
      <p className="text-gold text-xs font-semibold tracking-[0.15em] uppercase">One quick thing</p>
      <p className="text-white text-base font-bold mt-1">What&apos;s your why?</p>
      <p className="text-ivory/60 text-xs mt-0.5 mb-3">Pick what&apos;s true for you — we&apos;ll remind you of it, not just your numbers.</p>
      <div className="grid grid-cols-1 gap-2 mb-3">
        {PAYOFF_OPTIONS.map((o) => (
          <button
            key={o.v}
            onClick={() => toggle(o.v)}
            disabled={saving}
            className={`w-full text-left py-3 px-3.5 rounded-xl border font-semibold text-sm transition-all disabled:opacity-50 ${
              picked.includes(o.v) ? 'bg-charcoal bg-gradient-to-br from-gold/20 to-charcoal border-gold text-gold' : 'bg-charcoal border-smoke text-white'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {error && <p className="text-red-400 text-xs mb-2">Couldn&apos;t save just now — tap Save to retry.</p>}
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving || !picked.length} className="flex-1 py-2.5 rounded-xl bg-gold text-obsidian font-bold text-xs uppercase tracking-wider disabled:opacity-40 active:scale-95 transition-transform">
          {saving ? '…' : 'Save'}
        </button>
        <button onClick={skip} disabled={saving} className="text-ivory/50 text-xs font-semibold px-1">Not now</button>
      </div>
    </div>
  )
}
