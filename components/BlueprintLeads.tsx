'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'

type Stats = {
  age?: number; sex?: string; height_in?: number; weight_lbs?: number; goal_weight_lbs?: number | null
  goal?: string; activity?: string; workout_days?: number; workout_length?: string; cardio?: boolean
  bmr?: number; rest_maintenance?: number; workout_maintenance?: number
  protein_g?: number; carbs_g?: number; fats_g?: number; split?: string
  steady_workout?: number; steady_rest?: number; faster_workout?: number; faster_rest?: number
  est_weekly_change_lbs?: number
}
type Row = {
  id: string; name: string; email: string; phone: string | null; status: string
  lead_score: number; created_at: string; last_email_at: string | null; notes: string | null; stats: Stats
}

const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost']
const ACT: Record<string, string> = { none: 'Not active', sedentary: 'Sedentary', light: 'Lightly active', moderate: 'Moderately active', active: 'Active', very_active: 'Very active' }
const LEN: Record<string, string> = { none: 'No workouts', '30_cardio': '30m cardio', '45_strength': '45m strength', '45_60_both': '45-60m both', '60_both': '60m both', '90_intense': '90m intense' }

const fmt = (n?: number | null) => (n === undefined || n === null ? '—' : Math.round(n).toLocaleString())
const height = (inch?: number) => (inch ? `${Math.floor(inch / 12)}'${Math.round(inch % 12)}"` : '—')
const date = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const cap = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—')

export default function BlueprintLeads() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [goalFilter, setGoalFilter] = useState('all')
  const [open, setOpen] = useState<string | null>(null)

  async function load() {
    setLoading(true); setErr('')
    try {
      const res = await fetch('/api/admin/blueprint-leads')
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to load')
      setRows(await res.json())
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to load') }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function setStatus(id: string, status: string) {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)))
    await fetch('/api/admin/leads', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
  }

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (goalFilter !== 'all' && r.stats.goal !== goalFilter) return false
      if (!t) return true
      return [r.name, r.email, r.phone].some((v) => (v || '').toLowerCase().includes(t))
    })
  }, [rows, q, statusFilter, goalFilter])

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 864e5
    return {
      total: rows.length,
      week: rows.filter((r) => new Date(r.created_at).getTime() > weekAgo).length,
      newCount: rows.filter((r) => r.status === 'new').length,
      converted: rows.filter((r) => r.status === 'converted').length,
      lose: rows.filter((r) => r.stats.goal === 'lose').length,
      gain: rows.filter((r) => r.stats.goal === 'gain').length,
    }
  }, [rows])

  function exportCSV() {
    const head = ['Name', 'Email', 'Phone', 'Status', 'Date', 'Goal', 'Goal Weight', 'Age', 'Sex', 'Height(in)', 'Weight', 'Activity', 'Workout Days', 'Session', 'BMR', 'Rest Maint', 'Workout Maint', 'Steady Workout', 'Steady Rest', 'Faster Workout', 'Faster Rest', 'Protein g', 'Carbs g', 'Fats g', 'Est lb/wk']
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines = filtered.map((r) => {
      const s = r.stats
      return [r.name, r.email, r.phone, r.status, date(r.created_at), s.goal, s.goal_weight_lbs, s.age, s.sex, s.height_in, s.weight_lbs, s.activity, s.workout_days, s.workout_length, s.bmr, s.rest_maintenance, s.workout_maintenance, s.steady_workout, s.steady_rest, s.faster_workout, s.faster_rest, s.protein_g, s.carbs_g, s.fats_g, s.est_weekly_change_lbs].map(esc).join(',')
    })
    const csv = [head.map(esc).join(','), ...lines].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url; a.download = `blueprint-leads-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  }

  const statCards = [
    { label: 'Total Leads', value: stats.total, c: 'text-gold' },
    { label: 'New / Uncontacted', value: stats.newCount, c: 'text-emerald-400' },
    { label: 'This Week', value: stats.week, c: 'text-blue-400' },
    { label: 'Converted', value: stats.converted, c: 'text-purple-400' },
    { label: 'Goal: Lose', value: stats.lose, c: 'text-pink-400' },
    { label: 'Goal: Gain', value: stats.gain, c: 'text-orange-400' },
  ]

  return (
    <div className="min-h-screen bg-obsidian text-ivory px-4 sm:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <a href="/admin" className="text-ivory/40 text-xs hover:text-gold">← Back to Admin</a>
            <h1 className="text-2xl font-bold text-white mt-1">Calorie Blueprint Leads</h1>
            <p className="text-ivory/50 text-sm">Every lead from the free blueprint — contact info + full stats.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="px-3 py-2 bg-charcoal border border-smoke rounded-lg text-sm hover:border-gold/50">↻ Refresh</button>
            <button onClick={exportCSV} className="px-4 py-2 bg-gold text-obsidian rounded-lg text-sm font-semibold hover:bg-gold/90">Export CSV</button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          {statCards.map((s) => (
            <div key={s.label} className="bg-charcoal rounded-xl border border-smoke p-4 text-center">
              <div className={`text-2xl font-bold ${s.c}`}>{s.value}</div>
              <div className="text-[11px] text-ivory/50 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone…"
            className="flex-1 min-w-[200px] px-3 py-2 bg-charcoal border border-smoke rounded-lg text-sm placeholder-ivory/30 focus:outline-none focus:border-gold" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 bg-charcoal border border-smoke rounded-lg text-sm">
            <option value="all">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
          </select>
          <select value={goalFilter} onChange={(e) => setGoalFilter(e.target.value)} className="px-3 py-2 bg-charcoal border border-smoke rounded-lg text-sm">
            <option value="all">All goals</option>
            <option value="lose">Lose</option>
            <option value="gain">Gain</option>
            <option value="maintain">Maintain</option>
          </select>
          <span className="text-sm text-ivory/50 self-center">{filtered.length} of {rows.length}</span>
        </div>

        {err && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">{err}</div>}
        {loading ? (
          <div className="text-ivory/50 text-sm py-10 text-center">Loading leads…</div>
        ) : filtered.length === 0 ? (
          <div className="text-ivory/50 text-sm py-10 text-center bg-charcoal border border-smoke rounded-xl">No leads yet — share asaluke.io/blueprint to start capturing.</div>
        ) : (
          <div className="bg-charcoal border border-smoke rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ivory/40 text-xs uppercase border-b border-smoke">
                  <th className="p-3">Name</th><th className="p-3">Contact</th><th className="p-3">Goal</th>
                  <th className="p-3">Body</th><th className="p-3">Training</th><th className="p-3">Steady (W/R)</th>
                  <th className="p-3">Protein</th><th className="p-3">Status</th><th className="p-3">Date</th><th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const s = r.stats
                  const isOpen = open === r.id
                  return (
                    <Fragment key={r.id}>
                      <tr className="border-b border-smoke/40 hover:bg-obsidian/40">
                        <td className="p-3 font-medium text-white whitespace-nowrap">{r.name || '—'}</td>
                        <td className="p-3 whitespace-nowrap">
                          <a href={`mailto:${r.email}`} className="text-gold hover:underline block">{r.email}</a>
                          {r.phone && <a href={`tel:${r.phone}`} className="text-ivory/50 text-xs hover:underline">{r.phone}</a>}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="capitalize">{s.goal || '—'}</span>
                          {s.goal_weight_lbs ? <span className="text-ivory/40 text-xs block">→ {s.goal_weight_lbs} lb</span> : null}
                        </td>
                        <td className="p-3 whitespace-nowrap text-ivory/70 text-xs">
                          {s.weight_lbs ? `${s.weight_lbs} lb` : '—'}{s.age ? ` · ${s.age}y` : ''}{s.sex ? ` · ${cap(s.sex)}` : ''}
                        </td>
                        <td className="p-3 whitespace-nowrap text-ivory/70 text-xs">
                          {s.workout_days !== undefined ? `${s.workout_days}×/wk` : '—'}<span className="block text-ivory/40">{ACT[s.activity || ''] || '—'}</span>
                        </td>
                        <td className="p-3 whitespace-nowrap">{fmt(s.steady_workout)} / {fmt(s.steady_rest)}</td>
                        <td className="p-3 whitespace-nowrap text-emerald-400">{s.protein_g ? `${s.protein_g}g` : '—'}</td>
                        <td className="p-3">
                          <select value={r.status} onChange={(e) => setStatus(r.id, e.target.value)}
                            className="text-xs bg-obsidian border border-smoke rounded px-2 py-1 text-ivory">
                            {STATUSES.map((st) => <option key={st} value={st}>{cap(st)}</option>)}
                          </select>
                        </td>
                        <td className="p-3 whitespace-nowrap text-ivory/50 text-xs">{date(r.created_at)}</td>
                        <td className="p-3"><button onClick={() => setOpen(isOpen ? null : r.id)} className="text-gold text-xs">{isOpen ? 'Hide' : 'Details'}</button></td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-obsidian/60 border-b border-smoke/40">
                          <td colSpan={10} className="p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-xs">
                              <Detail k="Height" v={height(s.height_in)} />
                              <Detail k="Weight → Goal" v={`${fmt(s.weight_lbs)} → ${s.goal_weight_lbs ? s.goal_weight_lbs + ' lb' : '—'}`} />
                              <Detail k="Session length" v={LEN[s.workout_length || ''] || '—'} />
                              <Detail k="Cardio" v={s.cardio === undefined ? '—' : s.cardio ? 'Yes' : 'No'} />
                              <Detail k="BMR" v={fmt(s.bmr)} />
                              <Detail k="Rest maintenance" v={fmt(s.rest_maintenance)} />
                              <Detail k="Workout maintenance" v={fmt(s.workout_maintenance)} />
                              <Detail k="Est. change / wk" v={s.est_weekly_change_lbs !== undefined ? `${s.est_weekly_change_lbs} lb` : '—'} />
                              <Detail k="Steady plan" v={`${fmt(s.steady_workout)} workout / ${fmt(s.steady_rest)} rest`} />
                              <Detail k="Faster plan" v={`${fmt(s.faster_workout)} workout / ${fmt(s.faster_rest)} rest`} />
                              <Detail k="Macros (P/C/F)" v={`${fmt(s.protein_g)} / ${fmt(s.carbs_g)} / ${fmt(s.fats_g)} g`} />
                              <Detail k="Split %" v={s.split || '—'} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-ivory/30 text-xs mt-4">Contact records are stored in funnel_leads; full stats in the blueprint_lead event log. Older leads (before full capture) show what was saved in their summary.</p>
      </div>
    </div>
  )
}

function Detail({ k, v }: { k: string; v: string }) {
  return <div><span className="text-ivory/40">{k}: </span><span className="text-white">{v}</span></div>
}
