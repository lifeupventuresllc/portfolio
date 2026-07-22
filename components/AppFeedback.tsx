'use client'

import { useEffect, useMemo, useState } from 'react'
import { FEEDBACK_CATEGORIES, FEEDBACK_SEVERITIES } from '@/lib/feedback-context'

type Row = {
  id: string; rating: 'up' | 'down' | null; text: string
  category: string; severity: string; context: string; page: string; device: string
  logged_on: string; created_at: string; name: string; email: string
}

const date = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const categoryLabel = (k: string) => FEEDBACK_CATEGORIES.find((c) => c.key === k)?.label || k
const severityLabel = (k: string) => FEEDBACK_SEVERITIES.find((s) => s.key === k)?.label || k

function toCsv(rows: Row[]): string {
  const headers: (keyof Row)[] = ['created_at', 'name', 'email', 'rating', 'category', 'severity', 'context', 'page', 'device', 'text']
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const lines = [headers.join(',')]
  for (const r of rows) lines.push(headers.map((h) => escape(String(r[h] ?? ''))).join(','))
  return lines.join('\n')
}

export default function AppFeedback() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [ratingFilter, setRatingFilter] = useState<'all' | 'up' | 'down'>('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all')
  const [severityFilter, setSeverityFilter] = useState<'all' | string>('all')

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
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false
      if (severityFilter !== 'all' && r.severity !== severityFilter) return false
      if (!t) return true
      return [r.name, r.email, r.text, r.context].some((v) => (v || '').toLowerCase().includes(t))
    })
  }, [rows, q, ratingFilter, categoryFilter, severityFilter])

  const upCount = rows.filter((r) => r.rating === 'up').length
  const downCount = rows.filter((r) => r.rating === 'down').length
  const byCategory = useMemo(() => {
    const counts: Record<string, { total: number; down: number }> = {}
    for (const r of rows) {
      counts[r.category] ??= { total: 0, down: 0 }
      counts[r.category].total++
      if (r.rating === 'down') counts[r.category].down++
    }
    return FEEDBACK_CATEGORIES.map((c) => ({ key: c.key, label: c.label, ...(counts[c.key] || { total: 0, down: 0 }) }))
  }, [rows])

  function exportCsv() {
    const blob = new Blob([toCsv(filtered)], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `feedback-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-4xl mx-auto pt-24 pb-8 px-4">
      <h1 className="text-3xl font-bold text-white mb-1">App Feedback</h1>
      <p className="text-ivory/50 text-sm mb-6">Every pulse-check members send from inside the app — inline after a workout/meal/check-in, or from the feedback page.</p>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="px-4 py-2 bg-charcoal border border-smoke rounded-xl text-sm">
          <span className="text-green-400 font-bold">{upCount}</span> <span className="text-ivory/50">working well</span>
        </div>
        <div className="px-4 py-2 bg-charcoal border border-smoke rounded-xl text-sm">
          <span className="text-red-400 font-bold">{downCount}</span> <span className="text-ivory/50">something&apos;s off</span>
        </div>
        <button onClick={exportCsv} disabled={!filtered.length}
          className="ml-auto px-4 py-2 bg-gold text-obsidian rounded-xl text-sm font-bold disabled:opacity-40">
          Export CSV ({filtered.length})
        </button>
      </div>

      {/* Category breakdown — where the signal is actually coming from */}
      <div className="flex flex-wrap gap-2 mb-6">
        {byCategory.map((c) => (
          <div key={c.key} className="px-3.5 py-2 bg-charcoal border border-smoke rounded-xl text-xs">
            <span className="text-ivory/70 font-semibold">{c.label}</span>{' '}
            <span className="text-ivory/40">{c.total}</span>
            {c.down > 0 && <span className="text-red-400 ml-1">({c.down} 👎)</span>}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
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
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 bg-charcoal border border-smoke rounded-xl text-white text-sm focus:outline-none focus:border-gold">
          <option value="all">All areas</option>
          {FEEDBACK_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-4 py-2 bg-charcoal border border-smoke rounded-xl text-white text-sm focus:outline-none focus:border-gold">
          <option value="all">All severities</option>
          {FEEDBACK_SEVERITIES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
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
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span className="px-2 py-0.5 bg-gold/10 text-gold text-[11px] font-semibold rounded-full">{categoryLabel(r.category)}</span>
              {r.severity && <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[11px] font-semibold rounded-full">{severityLabel(r.severity)}</span>}
              {r.context && <span className="px-2 py-0.5 bg-obsidian border border-smoke text-ivory/50 text-[11px] rounded-full">{r.context}</span>}
              {r.page && <span className="px-2 py-0.5 bg-obsidian border border-smoke text-ivory/50 text-[11px] rounded-full">{r.page}</span>}
              {r.device && <span className="px-2 py-0.5 bg-obsidian border border-smoke text-ivory/50 text-[11px] rounded-full">{r.device}</span>}
            </div>
            {r.text && <p className="text-ivory/70 text-sm leading-relaxed">{r.text}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
