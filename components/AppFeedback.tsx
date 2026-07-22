'use client'

import { useEffect, useMemo, useState } from 'react'

type Row = { id: string; rating: 'up' | 'down' | null; text: string; logged_on: string; created_at: string; name: string; email: string }

const date = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export default function AppFeedback() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [ratingFilter, setRatingFilter] = useState<'all' | 'up' | 'down'>('all')

  useEffect(() => {
    (async () => {
      setLoading(true); setErr('')
      try {
        const res = await fetch('/api/admin/feedback')
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to load')
        setRows(await res.json())
      } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to load') }
      setLoading(false)
    })()
  }, [])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (ratingFilter !== 'all' && r.rating !== ratingFilter) return false
      if (!t) return true
      return [r.name, r.email, r.text].some((v) => (v || '').toLowerCase().includes(t))
    })
  }, [rows, q, ratingFilter])

  const upCount = rows.filter((r) => r.rating === 'up').length
  const downCount = rows.filter((r) => r.rating === 'down').length

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-white mb-1">App Feedback</h1>
      <p className="text-ivory/50 text-sm mb-6">Every 👍/👎 pulse-check members send from inside the app.</p>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="px-4 py-2 bg-charcoal border border-smoke rounded-xl text-sm">
          <span className="text-green-400 font-bold">{upCount}</span> <span className="text-ivory/50">working well</span>
        </div>
        <div className="px-4 py-2 bg-charcoal border border-smoke rounded-xl text-sm">
          <span className="text-red-400 font-bold">{downCount}</span> <span className="text-ivory/50">something&apos;s off</span>
        </div>
        <input
          value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, or text…"
          className="flex-1 min-w-[200px] px-4 py-2 bg-charcoal border border-smoke rounded-xl text-white text-sm focus:outline-none focus:border-gold"
        />
        <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value as 'all' | 'up' | 'down')}
          className="px-4 py-2 bg-charcoal border border-smoke rounded-xl text-white text-sm focus:outline-none focus:border-gold">
          <option value="all">All ratings</option>
          <option value="up">👍 Working well</option>
          <option value="down">👎 Something&apos;s off</option>
        </select>
      </div>

      {loading && <p className="text-ivory/50 text-sm">Loading…</p>}
      {err && <p className="text-red-400 text-sm">{err}</p>}
      {!loading && !err && filtered.length === 0 && <p className="text-ivory/50 text-sm">No feedback yet.</p>}

      <div className="space-y-3">
        {filtered.map((r) => (
          <div key={r.id} className="bg-charcoal border border-smoke rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="text-white font-semibold text-sm">{r.name}</p>
                <p className="text-ivory/40 text-xs">{r.email}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-2xl">{r.rating === 'up' ? '👍' : r.rating === 'down' ? '👎' : '—'}</span>
                <span className="text-ivory/40 text-xs whitespace-nowrap">{date(r.created_at)}</span>
              </div>
            </div>
            {r.text && <p className="text-ivory/70 text-sm leading-relaxed">{r.text}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
