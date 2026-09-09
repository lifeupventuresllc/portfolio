'use client'

import { useEffect, useMemo, useState } from 'react'

type Row = {
  id: string
  user_id: string | null
  email: string | null
  message: string
  screen: string | null
  app_version: string | null
  os: string | null
  status: 'new' | 'seen' | 'resolved'
  created_at: string
}

const STATUS_STYLE: Record<Row['status'], string> = {
  new: 'bg-gold/15 text-gold border-gold/40',
  seen: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
  resolved: 'bg-green-500/15 text-green-400 border-green-500/40',
}

const when = (s: string) => new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

// Minimum-effort visibility for the "Report an issue" widget (Asa's spec,
// 2026-09-09) — a plain newest-first list she can check daily, with a
// one-tap status update since the column already exists. No admin
// dashboard-building beyond this; if volume grows enough to need filters/
// search/export, this is the same shape as components/AppFeedback.tsx
// (the pulse-check's own list) to extend later, not a rebuild.
export default function AppFeedbackList() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | Row['status']>('all')

  useEffect(() => {
    (async () => {
      setLoading(true); setErr('')
      try {
        const res = await fetch('/api/admin/app-feedback')
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to load')
        setRows(await res.json())
      } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to load') }
      setLoading(false)
    })()
  }, [])

  const filtered = useMemo(() => rows.filter((r) => statusFilter === 'all' || r.status === statusFilter), [rows, statusFilter])
  const newCount = rows.filter((r) => r.status === 'new').length

  async function setStatus(id: string, status: Row['status']) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    await fetch('/api/admin/app-feedback', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    }).catch(() => {})
  }

  return (
    <div className="max-w-3xl mx-auto pt-24 pb-8 px-4">
      <h1 className="text-3xl font-bold text-white mb-1">Bug Reports</h1>
      <p className="text-ivory/50 text-sm mb-6">Everything submitted through the &ldquo;Report an issue&rdquo; button, wherever it was tapped from.</p>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="px-4 py-2 bg-charcoal border border-smoke rounded-xl text-sm">
          <span className="text-gold font-bold">{newCount}</span> <span className="text-ivory/50">new</span>
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | Row['status'])}
          className="px-4 py-2 bg-charcoal border border-smoke rounded-xl text-white text-sm focus:outline-none focus:border-gold">
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="seen">Seen</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {loading && <p className="text-ivory/50 text-sm">Loading…</p>}
      {err && <p className="text-red-400 text-sm">{err}</p>}
      {!loading && !err && filtered.length === 0 && <p className="text-ivory/50 text-sm">No reports yet.</p>}

      <div className="space-y-3">
        {filtered.map((r) => (
          <div key={r.id} className="bg-charcoal border border-smoke rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="text-white text-sm whitespace-pre-wrap break-words">{r.message}</p>
              </div>
              <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${STATUS_STYLE[r.status]}`}>{r.status}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-ivory/40 text-xs mb-3">
              <span>{when(r.created_at)}</span>
              {r.email && <span>· {r.email}</span>}
              {r.screen && <span>· {r.screen}</span>}
              {r.os && <span>· {r.os}</span>}
              {r.app_version && <span>· build {r.app_version}</span>}
            </div>
            <div className="flex gap-2">
              {(['new', 'seen', 'resolved'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(r.id, s)}
                  disabled={r.status === s}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-smoke text-ivory/60 hover:border-gold/40 hover:text-white disabled:opacity-30 disabled:cursor-default transition-colors"
                >
                  Mark {s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
