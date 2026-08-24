'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

export type RosterRow = {
  id: string
  name: string | null
  email: string | null
  tier: string
  status: string
  intakeDone: boolean
  pending: number // check-ins awaiting your reply
  lastCheckin: string | null
  createdAt: string
  isBeta: boolean // comped $0 enrollment (e.g. a beta-test promo code)
  hasNegativeFeedback: boolean // submitted a 👎 quick-feedback
  lastActiveAt: string | null // real app-usage signal, any /plan/* page load
}

function ago(s: string | null): string {
  if (!s) return 'no check-ins yet'
  const days = Math.floor((Date.now() - new Date(s).getTime()) / 86400000)
  if (days <= 0) return 'checked in today'
  if (days === 1) return 'checked in 1d ago'
  return `checked in ${days}d ago`
}

// The pre-beta-launch "one thing" (2026-08-24): a real answer to "how do we
// even measure active users," using the last_active_at signal that was
// already being tracked but never surfaced anywhere. active = opened the
// app in the last 24h; quiet = has a real history but nothing in 3+ days
// (worth a check-in during a beta); never = signed up, never actually opened it.
function activityStatus(lastActiveAt: string | null): { label: string; tone: 'active' | 'quiet' | 'never' } {
  if (!lastActiveAt) return { label: 'never opened the app', tone: 'never' }
  const days = (Date.now() - new Date(lastActiveAt).getTime()) / 86400000
  if (days < 1) return { label: 'active today', tone: 'active' }
  if (days < 2) return { label: 'active yesterday', tone: 'active' }
  if (days < 3) return { label: `active ${Math.floor(days)}d ago`, tone: 'quiet' }
  return { label: `quiet ${Math.floor(days)}d`, tone: 'quiet' }
}

export default function ClientRoster({ rows }: { rows: RosterRow[] }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'attention' | 'active' | 'beta' | 'quiet'>('all')

  const needsAttention = (r: RosterRow) => r.pending > 0 || !r.intakeDone || r.hasNegativeFeedback
  // Inner Circle pays for priority same-day replies — a pending check-in from her
  // shouldn't sit buried behind everyone else's. Real sort, not just a badge.
  const isPriority = (r: RosterRow) => r.tier === 'inner_circle' && r.pending > 0
  // "Gone quiet" — a real, already-completed intake with no real app activity
  // in 3+ days. Distinct from "no intake" (never started) — this is someone
  // who WAS using it and stopped, exactly who a beta tester follow-up should
  // target first.
  const isQuiet = (r: RosterRow) => r.intakeDone && (!r.lastActiveAt || (Date.now() - new Date(r.lastActiveAt).getTime()) / 86400000 >= 3)
  const counts = useMemo(() => ({
    all: rows.length,
    attention: rows.filter(needsAttention).length,
    active: rows.filter((r) => r.status === 'active').length,
    beta: rows.filter((r) => r.isBeta).length,
    quiet: rows.filter(isQuiet).length,
  }), [rows])

  const shown = useMemo(() => rows
    .filter((r) => {
      if (filter === 'attention' && !needsAttention(r)) return false
      if (filter === 'active' && r.status !== 'active') return false
      if (filter === 'beta' && !r.isBeta) return false
      if (filter === 'quiet' && !isQuiet(r)) return false
      const hay = `${r.name || ''} ${r.email || ''}`.toLowerCase()
      return hay.includes(q.toLowerCase())
    })
    .sort((a, b) => Number(isPriority(b)) - Number(isPriority(a))),
  [rows, q, filter])

  const chip = (f: typeof filter, label: string, n: number) => (
    <button onClick={() => setFilter(f)}
      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${filter === f ? 'bg-gold text-obsidian' : 'bg-charcoal border border-smoke text-ivory/60'}`}>
      {label} · {n}
    </button>
  )

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {chip('all', 'All', counts.all)}
        {chip('attention', '⚠ Needs you', counts.attention)}
        {chip('active', 'Active', counts.active)}
        {counts.beta > 0 && chip('beta', '🎁 Beta testers', counts.beta)}
        {counts.quiet > 0 && chip('quiet', 'Gone quiet', counts.quiet)}
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email…"
        className="w-full px-4 py-3 bg-obsidian border border-smoke rounded-xl text-white text-sm mb-4 focus:outline-none focus:border-gold" />

      <div className="space-y-2">
        {shown.map((r) => (
          <Link key={r.id} href={`/admin/clients/${r.id}`}
            className="block bg-charcoal border border-smoke rounded-2xl p-4 hover:border-gold/50 transition-colors">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm truncate">
                  {r.name || r.email?.split('@')[0] || 'Client'}
                  {r.tier === 'inner_circle' && <span className="ml-2 text-[9px] bg-gold/15 text-gold px-2 py-0.5 rounded-full uppercase tracking-wider">Inner Circle</span>}
                  {r.isBeta && <span className="ml-2 text-[9px] bg-blue-500/15 text-blue-300 px-2 py-0.5 rounded-full uppercase tracking-wider">🎁 Beta</span>}
                </p>
                <p className="text-ivory/40 text-xs truncate">{r.email} · {ago(r.lastCheckin)}</p>
              </div>
              <div className="flex items-center gap-2 flex-none">
                {(() => { const a = activityStatus(r.lastActiveAt); return (
                  <span className={`text-[10px] px-2 py-1 rounded-full font-semibold whitespace-nowrap ${a.tone === 'active' ? 'bg-emerald-500/15 text-emerald-400' : a.tone === 'quiet' ? 'bg-amber-500/15 text-amber-400' : 'bg-ivory/10 text-ivory/40'}`}>
                    {a.label}
                  </span>
                ) })()}
                {isPriority(r) && <span className="text-[10px] bg-gold/20 text-gold px-2 py-1 rounded-full font-semibold whitespace-nowrap">⚡ reply today</span>}
                {r.hasNegativeFeedback && <span className="text-[10px] bg-red-500/15 text-red-400 px-2 py-1 rounded-full font-semibold whitespace-nowrap">👎 feedback</span>}
                {r.pending > 0 && <span className="text-[10px] bg-red-500/15 text-red-400 px-2 py-1 rounded-full font-semibold whitespace-nowrap">{r.pending} to reply</span>}
                {!r.intakeDone && <span className="text-[10px] bg-amber-500/15 text-amber-400 px-2 py-1 rounded-full font-semibold whitespace-nowrap">no intake</span>}
                <span className="text-ivory/30">→</span>
              </div>
            </div>
          </Link>
        ))}
        {shown.length === 0 && <p className="text-ivory/40 text-sm text-center py-10">No clients match.</p>}
      </div>
    </div>
  )
}
