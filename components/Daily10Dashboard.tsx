'use client'

import { useEffect, useState, useCallback } from 'react'
import CountUp from './CountUp'

type Stage = {
  automated: boolean
  [key: string]: unknown
}

type Data = {
  generated_at: string
  stages: {
    content: Stage & { connected_platforms: string[]; published_today: number; queued: number }
    blueprint_leads: Stage & { today: number; this_week: number }
    nurture_emails: Stage & { sent_today: number; pending_in_queue: number }
    app_conversions: Stage & { today: number; this_week: number; matched_from_blueprint_this_week: number }
  }
  daily_10_goal: { metric: string; target: number; actual: number }
}

type RefinementStage = { key: string; label: string; live: boolean; current: number; previous: number; change_pct: number | null }
type RefinementHistoryEntry = { week_start: string; note: string; updated_at: string }
type Refinement = {
  stages: RefinementStage[]
  leak: { stage: string; change_pct: number } | null
  current_week_start: string
  current_note: string
  history: RefinementHistoryEntry[]
}

const REFRESH_MS = 60_000

function StatusDot({ on }: { on: boolean }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${on ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-red-400'}`} />
  )
}

// A spinning gear that only turns while its stage is actually live — a still gear means the step isn't running.
function Gear({ on, size = 22 }: { on: boolean; size?: number }) {
  return (
    <span className={on ? 'luf-gear-on' : 'luf-gear-off'} style={{ fontSize: size, lineHeight: 1 }}>⚙️</span>
  )
}

// The connector between two stages: a track with 3 staggered dots flowing left-to-right,
// visualizing people/data actually moving through the pipeline right now.
function FlowTrack({ on }: { on: boolean }) {
  return (
    <div className="flex items-center justify-center px-1 md:w-14 w-full">
      <div className={`luf-flow-track w-full md:w-12 ${on ? '' : 'off'}`}>
        <span className="luf-flow-dot" style={{ animationDelay: '0s' }} />
        <span className="luf-flow-dot" style={{ animationDelay: '0.7s' }} />
        <span className="luf-flow-dot" style={{ animationDelay: '1.4s' }} />
      </div>
    </div>
  )
}

export default function Daily10Dashboard() {
  const [data, setData] = useState<Data | null>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)

  const [refinement, setRefinement] = useState<Refinement | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/daily-10')
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to load')
      setData(await res.json())
      setErr('')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load')
    }
    setLoading(false)
  }, [])

  const loadRefinement = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/daily-10/refinement')
      if (!res.ok) return
      const r: Refinement = await res.json()
      setRefinement(r)
      setNoteDraft(r.current_note)
    } catch {
      // non-critical panel — fail silently, pipeline stages above still work
    }
  }, [])

  useEffect(() => {
    load()
    loadRefinement()
    const id = setInterval(load, REFRESH_MS)
    return () => clearInterval(id)
  }, [load, loadRefinement])

  async function saveNote() {
    if (!refinement) return
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/admin/daily-10/refinement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start: refinement.current_week_start, note: noteDraft }),
      })
      if (res.ok) {
        setSaved(true)
        setRefinement({ ...refinement, current_note: noteDraft })
      }
    } finally {
      setSaving(false)
    }
  }

  const goalPct = data ? Math.min(100, Math.round((data.daily_10_goal.actual / data.daily_10_goal.target) * 100)) : 0

  return (
    <div className="min-h-screen bg-obsidian text-ivory px-4 sm:px-8 pt-24 pb-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <a href="/admin" className="text-ivory/40 text-xs hover:text-gold">← Back to Admin</a>
            <h1 className="text-2xl font-bold text-white mt-1">🔟 The Daily 10</h1>
            <p className="text-ivory/50 text-sm">Live view of the system that&rsquo;s supposed to serve 10 people a day — every stage, in one place.</p>
          </div>
          <button onClick={load} className="px-3 py-2 bg-charcoal border border-smoke rounded-lg text-sm hover:border-gold/50">↻ Refresh</button>
        </div>

        {err && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl">{err}</div>}

        {loading ? (
          <div className="animate-pulse h-40 bg-charcoal rounded-xl" />
        ) : data && (
          <>
            {/* Daily 10 goal bar */}
            <div className="bg-charcoal rounded-xl border border-smoke p-5 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-ivory/60">Today&rsquo;s goal — new Blueprint leads</span>
                <span className="text-lg font-bold text-gold">{data.daily_10_goal.actual} / {data.daily_10_goal.target}</span>
              </div>
              <div className="h-3 rounded-full bg-obsidian overflow-hidden">
                <div
                  className="h-full bg-gold transition-all duration-500"
                  style={{ width: `${goalPct}%` }}
                />
              </div>
            </div>

            {/* Pipeline — the machine. Gears spin and dots flow only where the step is actually automated and running. */}
            <div className="flex flex-col md:flex-row items-stretch gap-2 mb-6">
              {/* Content */}
              <div className={`flex-1 bg-charcoal rounded-xl border p-5 transition-colors ${data.stages.content.automated ? 'border-smoke' : 'border-red-500/20'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Gear on={data.stages.content.automated} />
                  <StatusDot on={data.stages.content.automated} />
                  <span className="text-xs uppercase tracking-wide text-ivory/50">Content</span>
                </div>
                <div className="text-2xl font-bold text-white"><CountUp value={data.stages.content.published_today} /></div>
                <div className="text-[11px] text-ivory/50 mb-2">posted today</div>
                <div className="text-xs text-ivory/40">{data.stages.content.queued} queued</div>
                {!data.stages.content.automated && (
                  <div className="mt-3 text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-1">
                    Not connected — Instagram/TikTok OAuth not finished
                  </div>
                )}
              </div>
              <FlowTrack on={data.stages.content.automated} />

              {/* Blueprint Leads */}
              <div className="flex-1 bg-charcoal rounded-xl border border-smoke p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Gear on={data.stages.blueprint_leads.automated} />
                  <StatusDot on={data.stages.blueprint_leads.automated} />
                  <span className="text-xs uppercase tracking-wide text-ivory/50">Blueprint Leads</span>
                </div>
                <div className="text-2xl font-bold text-white"><CountUp value={data.stages.blueprint_leads.today} /></div>
                <div className="text-[11px] text-ivory/50 mb-2">today</div>
                <div className="text-xs text-ivory/40">{data.stages.blueprint_leads.this_week} this week</div>
              </div>
              <FlowTrack on={data.stages.blueprint_leads.automated} />

              {/* Nurture Emails */}
              <div className="flex-1 bg-charcoal rounded-xl border border-smoke p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Gear on={data.stages.nurture_emails.automated} />
                  <StatusDot on={data.stages.nurture_emails.automated} />
                  <span className="text-xs uppercase tracking-wide text-ivory/50">Nurture Emails</span>
                </div>
                <div className="text-2xl font-bold text-white"><CountUp value={data.stages.nurture_emails.sent_today} /></div>
                <div className="text-[11px] text-ivory/50 mb-2">sent today</div>
                <div className="text-xs text-ivory/40">{data.stages.nurture_emails.pending_in_queue} pending in queue</div>
              </div>
              <FlowTrack on={data.stages.nurture_emails.automated} />

              {/* App Conversions */}
              <div className="flex-1 bg-charcoal rounded-xl border border-smoke p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Gear on={data.stages.app_conversions.automated} />
                  <StatusDot on={data.stages.app_conversions.automated} />
                  <span className="text-xs uppercase tracking-wide text-ivory/50">App Conversions</span>
                </div>
                <div className="text-2xl font-bold text-white"><CountUp value={data.stages.app_conversions.today} /></div>
                <div className="text-[11px] text-ivory/50 mb-2">today</div>
                <div className="text-xs text-ivory/40">{data.stages.app_conversions.this_week} this week · {data.stages.app_conversions.matched_from_blueprint_this_week} traced back to a Blueprint lead</div>
              </div>
            </div>

            <p className="text-[11px] text-ivory/30 mb-6">
              Auto-refreshes every 60s · last updated {new Date(data.generated_at).toLocaleTimeString()}
            </p>

            {/* Refinement — Step 6: weekly review & adjustment */}
            {refinement && (
              <div className="bg-charcoal rounded-xl border border-smoke p-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs uppercase tracking-wide text-ivory/50">🔁 Refinement — weekly review</span>
                </div>
                <p className="text-[11px] text-ivory/40 mb-4">This week vs. the 7 days before it, for every live stage.</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {refinement.stages.map(s => (
                    <div key={s.key} className={`rounded-lg border p-3 ${!s.live ? 'border-smoke/50 opacity-50' : 'border-smoke'}`}>
                      <div className="text-[11px] text-ivory/50 mb-1">{s.label}</div>
                      <div className="text-lg font-bold text-white">{s.current}</div>
                      <div className="text-[11px]">
                        {s.change_pct === null ? (
                          <span className="text-ivory/40">new (was 0)</span>
                        ) : (
                          <span className={s.change_pct > 0 ? 'text-emerald-400' : s.change_pct < 0 ? 'text-red-400' : 'text-ivory/40'}>
                            {s.change_pct > 0 ? '+' : ''}{s.change_pct}% vs last week
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {refinement.leak ? (
                  <div className="mb-4 text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    ⚠️ Likely leak this week: <strong>{refinement.leak.stage}</strong> is down {Math.abs(refinement.leak.change_pct)}% vs. last week.
                  </div>
                ) : (
                  <div className="mb-4 text-[12px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                    ✅ No leak flagged — live stages are flat or growing week-over-week.
                  </div>
                )}

                <label className="block text-[11px] text-ivory/50 mb-1">This week&rsquo;s adjustment (week of {refinement.current_week_start})</label>
                <textarea
                  value={noteDraft}
                  onChange={e => { setNoteDraft(e.target.value); setSaved(false) }}
                  placeholder="What did you notice this week? What are you changing next week?"
                  className="w-full min-h-[80px] bg-obsidian border border-smoke rounded-lg p-3 text-sm text-ivory placeholder:text-ivory/30 focus:outline-none focus:border-gold/50"
                />
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={saveNote}
                    disabled={saving}
                    className="px-3 py-2 bg-gold/90 text-obsidian text-sm font-semibold rounded-lg hover:bg-gold disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save adjustment'}
                  </button>
                  {saved && <span className="text-[11px] text-emerald-400">Saved</span>}
                </div>

                {refinement.history.length > 0 && (
                  <details className="mt-4">
                    <summary className="text-[11px] text-ivory/40 cursor-pointer hover:text-ivory/60">Past weeks ({refinement.history.length})</summary>
                    <ul className="mt-2 space-y-2">
                      {refinement.history.map(h => (
                        <li key={h.week_start} className="text-[12px] text-ivory/60 border-l-2 border-smoke pl-3">
                          <span className="text-ivory/40">Week of {h.week_start}:</span> {h.note || <em className="text-ivory/30">no note</em>}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
