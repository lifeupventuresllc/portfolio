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
}

function ago(s: string | null): string {
  if (!s) return 'no check-ins yet'
  const days = Math.floor((Date.now() - new Date(s).getTime()) / 86400000)
  if (days <= 0) return 'checked in today'
  if (days === 1) return 'checked in 1d ago'
  return `checked in ${days}d ago`
}

export default function ClientRoster({ rows }: { rows: RosterRow[] }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'attention' | 'active'>('all')

  const needsAttention = (r: RosterRow) => r.pending > 0 || !r.intakeDone
  const counts = useMemo(() => ({
    all: rows.length,
    attention: rows.filter(needsAttention).length,
    active: rows.filter((r) => r.status === 'active').length,
  }), [rows])

  const shown = useMemo(() => rows.filter((r) => {
    if (filter === 'attention' && !needsAttention(r)) return false
    if (filter === 'active' && r.status !== 'active') return false
    const hay = `${r.name || ''} ${r.email || ''}`.toLowerCase()
    return hay.includes(q.toLowerCase())
  }), [rows, q, filter])

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
                </p>
                <p className="text-ivory/40 text-xs truncate">{r.email} · {ago(r.lastCheckin)}</p>
              </div>
              <div className="flex items-center gap-2 flex-none">
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
