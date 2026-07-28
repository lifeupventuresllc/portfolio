'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

/* ────────────────────────────────────────────────────────────────
   CORE FOUR — Asa's daily ops / team-meeting review.
   Separate from Founder OS (personal cockpit): this is the business
   review — Promise/Offer, Feedback, The Machine, Marketing/Awareness,
   plus Financials. State persists to localStorage instantly and syncs
   to Supabase (core_four_state) via /api/admin/core-four.
   ──────────────────────────────────────────────────────────────── */

const LS_KEY = 'core_four_state_v1'

type Status = 'on-track' | 'needs-attention' | 'not-active' | ''

const STATUS_META: Record<Exclude<Status, ''>, { label: string; dot: string; text: string }> = {
  'on-track': { label: 'On Track', dot: 'bg-gold', text: 'text-gold' },
  'needs-attention': { label: 'Needs Attention', dot: 'bg-amber-500', text: 'text-amber-400' },
  'not-active': { label: 'Not Yet Active', dot: 'bg-ivory/30', text: 'text-ivory/50' },
}

const PILLARS: { key: string; title: string; sub: string; question: string }[] = [
  {
    key: 'promise',
    title: '1. Promise/Offer',
    sub: 'Is the product/offer delivering on the promise?',
    question: 'Did every client/lead who touched the product move closer to their goal? Where is delivery breaking down?',
  },
  {
    key: 'feedback',
    title: '2. Feedback',
    sub: 'How are users and clients reacting?',
    question: 'What did leads/clients say, click, ignore, or complain about since yesterday?',
  },
  {
    key: 'machine',
    title: '3. The Machine',
    sub: 'How is delivery actually running?',
    question: "What did I do manually today that the app/system should be doing? What's the bottleneck?",
  },
  {
    key: 'marketing',
    title: '4. Marketing/Awareness',
    sub: 'Core Four channels: warm leads, cold outreach, content/organic, paid ads.',
    question: 'Which channels ran today? Which are still dormant?',
  },
]

type PillarEntry = { status: Status; notes: string }
type ActionItem = { text: string; done: boolean }
type DayEntry = {
  pillars: Record<string, PillarEntry>
  marketing: { dmsSent: number; replies: number; linkClicks: number }
  financials: { revenue: string; cashOnHand: string; notes: string }
  actionItems: ActionItem[]
}
type State = { days: Record<string, DayEntry> }

function emptyDay(): DayEntry {
  return {
    pillars: Object.fromEntries(PILLARS.map((p) => [p.key, { status: '', notes: '' }])),
    marketing: { dmsSent: 0, replies: 0, linkClicks: 0 },
    financials: { revenue: '', cashOnHand: '', notes: '' },
    actionItems: [],
  }
}

// Seed 2026-07-28's real check-in so the first load isn't a blank page.
function seedLaunchDay(): DayEntry {
  return {
    pillars: {
      promise: {
        status: 'needs-attention',
        notes: 'Calorie Blueprint MVP ~90% done (UI/UX). Blocked on ~$75 for API integration (Anthropic ~$35 + Google ~$30-40) — needs funding approval before final testing.',
      },
      feedback: {
        status: 'needs-attention',
        notes: 'Cold DM reply rate healthy (~50 DMs → 3-5 replies, 6-10%). Conversion gap: reply → lead-magnet link click is 0/3 on cold leads. 1 warm contact clicked + responded positively. Theory: the pre-link message is the gap, not the magnet — unconfirmed.',
      },
      machine: {
        status: 'not-active',
        notes: 'Client programming still fully manual (Asa programs, Claude formats/builds PDFs). Injury/auto-adjust logic not yet built into the app.',
      },
      marketing: {
        status: 'not-active',
        notes: 'Only 1 of 4 Core Four channels running: cold outreach (IG DMs). Content/organic, warm outreach, and paid ads are all unused.',
      },
    },
    marketing: { dmsSent: 50, replies: 4, linkClicks: 0 },
    financials: { revenue: '', cashOnHand: '', notes: 'Need ~$75 for API integration (Anthropic ~$35 + Google ~$30-40) to unblock MVP.' },
    actionItems: [
      { text: 'Diagnose + rewrite the DM message sent right before the Find Your Fix link', done: false },
      { text: 'MVP UI fixes', done: false },
      { text: 'Fund API integration blocker (~$75)', done: false },
    ],
  }
}

function todayKey(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function niceDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime()) / 86400000)
}

const WEEK_PLAN = [
  { day: 'Tue 7/28', tasks: 'MVP UI fixes • fund API integration blocker • organize Core Four checklist' },
  { day: 'Wed 7/29', tasks: 'Final MVP testing • integrate new lead-magnet PDFs • add injury auto-adjust logic to app' },
  { day: 'Thu 7/30', tasks: 'Soft launch prep • launch to first 50-100 users • close remaining app blockers' },
  { day: 'Fri 7/31', tasks: 'Build marketing system (content + scheduling) • update Actor Access • personal $360/day system' },
  { day: 'Sat 8/1', tasks: 'Weekly audition submission • review first-user feedback • week wrap / carry-forward review' },
]
const DAILY_STANDING = 'Core Four check-in • Send 50 DMs • Daily audition submission'

type Tab = 'today' | 'week' | 'history'

export default function CoreFour() {
  const [state, setState] = useState<State>({ days: {} })
  const [tab, setTab] = useState<Tab>('today')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'local'>('idle')
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [newItem, setNewItem] = useState('')
  const loaded = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const key = todayKey()
  const LAUNCH_KEY = '2026-07-28'
  const day = state.days[key] ?? (key === LAUNCH_KEY ? seedLaunchDay() : emptyDay())

  // ── Load: localStorage first (instant), then server (source of truth).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) setState(JSON.parse(raw))
      else if (state.days[LAUNCH_KEY] === undefined) {
        setState((s) => ({ ...s, days: { ...s.days, [LAUNCH_KEY]: seedLaunchDay() } }))
      }
    } catch { /* ignore */ }
    fetch('/api/admin/core-four')
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res?.data && typeof res.data === 'object' && res.data.days) {
          setState(res.data as State)
          try { localStorage.setItem(LS_KEY, JSON.stringify(res.data)) } catch { /* ignore */ }
        }
      })
      .catch(() => { /* offline — localStorage only */ })
      .finally(() => { loaded.current = true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Autosave: localStorage immediately, Supabase debounced.
  useEffect(() => {
    if (!loaded.current) return
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)) } catch { /* ignore */ }
    setStatus('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      fetch('/api/admin/core-four', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: state }),
      })
        .then((r) => setStatus(r.ok ? 'saved' : 'local'))
        .catch(() => setStatus('local'))
    }, 800)
  }, [state])

  const saveNow = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)) } catch { /* ignore */ }
    setStatus('saving')
    fetch('/api/admin/core-four', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: state }),
    })
      .then((r) => setStatus(r.ok ? 'saved' : 'local'))
      .catch(() => setStatus('local'))
  }, [state])

  const patchDay = useCallback((patch: Partial<DayEntry>) => {
    setState((s) => {
      const cur = s.days[key] ?? (key === LAUNCH_KEY ? seedLaunchDay() : emptyDay())
      return { ...s, days: { ...s.days, [key]: { ...cur, ...patch } } }
    })
  }, [key])

  const setPillar = (pKey: string, patch: Partial<PillarEntry>) =>
    patchDay({ pillars: { ...day.pillars, [pKey]: { ...day.pillars[pKey], ...patch } } })

  const setMarketing = (patch: Partial<DayEntry['marketing']>) =>
    patchDay({ marketing: { ...day.marketing, ...patch } })

  const setFinancials = (patch: Partial<DayEntry['financials']>) =>
    patchDay({ financials: { ...day.financials, ...patch } })

  const addActionItem = () => {
    if (!newItem.trim()) return
    patchDay({ actionItems: [...day.actionItems, { text: newItem.trim(), done: false }] })
    setNewItem('')
  }
  const toggleActionItem = (i: number) => {
    const items = day.actionItems.map((it, idx) => (idx === i ? { ...it, done: !it.done } : it))
    patchDay({ actionItems: items })
  }
  const removeActionItem = (i: number) => patchDay({ actionItems: day.actionItems.filter((_, idx) => idx !== i) })

  const flaggedCount = PILLARS.filter((p) => day.pillars[p.key]?.status === 'needs-attention').length

  const recentDays = Object.keys(state.days)
    .filter((d) => { const diff = daysBetween(d, key); return diff >= 0 && diff < 21 })
    .sort()
    .reverse()

  return (
    <div className="min-h-screen bg-obsidian px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4 text-xs">
          <a href="/admin" className="text-ivory/40 hover:text-gold transition-colors">← Admin</a>
          <a href="/admin/founder" className="text-ivory/40 hover:text-gold transition-colors">Founder OS ↗</a>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-1">Core Four</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Daily Ops Review</h1>
          </div>
          {flaggedCount > 0 && (
            <div className="text-right">
              <div className="text-3xl font-bold text-amber-400 leading-none">{flaggedCount}</div>
              <div className="text-[10px] text-ivory/50 uppercase tracking-wider mt-1">need attention</div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-ivory/40 mb-6">
          <span>{niceDate(key)}</span>
          <div className="flex items-center gap-3">
            <span>
              {status === 'saving' && 'saving…'}
              {status === 'saved' && 'saved ✓'}
              {status === 'local' && 'saved locally (offline)'}
            </span>
            <button
              onClick={saveNow}
              className="px-3 py-1 rounded-lg bg-gold text-obsidian font-semibold hover:bg-gold/90 transition-colors"
            >
              Save
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-6 border-b border-smoke">
          {(['today', 'week', 'history'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm capitalize border-b-2 transition-colors ${
                tab === t ? 'border-gold text-white' : 'border-transparent text-ivory/50 hover:text-ivory/80'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'today' && (
          <div className="space-y-5">
            {PILLARS.map((p) => {
              const entry = day.pillars[p.key] || { status: '', notes: '' }
              return (
                <div key={p.key} className="bg-charcoal rounded-xl border border-smoke p-6">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h2 className="text-lg font-semibold text-white">{p.title}</h2>
                    <select
                      value={entry.status}
                      onChange={(e) => setPillar(p.key, { status: e.target.value as Status })}
                      className="bg-obsidian border border-smoke rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-gold/50"
                    >
                      <option value="">Set status…</option>
                      <option value="on-track">On Track</option>
                      <option value="needs-attention">Needs Attention</option>
                      <option value="not-active">Not Yet Active</option>
                    </select>
                  </div>
                  <p className="text-ivory/50 text-xs mb-3">{p.sub}</p>
                  <p className="text-ivory/30 text-[11px] italic mb-3">{p.question}</p>
                  {entry.status && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`w-2 h-2 rounded-full ${STATUS_META[entry.status as Exclude<Status, ''>].dot}`} />
                      <span className={`text-xs font-semibold ${STATUS_META[entry.status as Exclude<Status, ''>].text}`}>
                        {STATUS_META[entry.status as Exclude<Status, ''>].label}
                      </span>
                    </div>
                  )}
                  <textarea
                    value={entry.notes}
                    onChange={(e) => setPillar(p.key, { notes: e.target.value })}
                    placeholder="Notes from today's meeting…"
                    rows={2}
                    className="w-full bg-obsidian border border-smoke rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-gold/50 resize-y"
                  />
                  {p.key === 'marketing' && (
                    <div className="grid grid-cols-3 gap-3 mt-4">
                      <NumField label="DMs sent" value={day.marketing.dmsSent} onChange={(v) => setMarketing({ dmsSent: v })} />
                      <NumField label="Replies" value={day.marketing.replies} onChange={(v) => setMarketing({ replies: v })} />
                      <NumField label="Link clicks" value={day.marketing.linkClicks} onChange={(v) => setMarketing({ linkClicks: v })} />
                    </div>
                  )}
                </div>
              )
            })}

            {/* FINANCIALS — the line a real CEO review never skips */}
            <div className="bg-charcoal rounded-xl border border-smoke p-6">
              <h2 className="text-lg font-semibold text-white mb-1">5. Financials</h2>
              <p className="text-ivory/50 text-xs mb-3">Money in, money on hand, money needed.</p>
              <div className="grid sm:grid-cols-2 gap-3 mb-3">
                <TextField label="Revenue today/this period" value={day.financials.revenue} onChange={(v) => setFinancials({ revenue: v })} placeholder="$0" />
                <TextField label="Cash on hand" value={day.financials.cashOnHand} onChange={(v) => setFinancials({ cashOnHand: v })} placeholder="$0" />
              </div>
              <textarea
                value={day.financials.notes}
                onChange={(e) => setFinancials({ notes: e.target.value })}
                placeholder="Funding needs, blockers, upcoming costs…"
                rows={2}
                className="w-full bg-obsidian border border-smoke rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-gold/50 resize-y"
              />
            </div>

            {/* ACTION ITEMS */}
            <div className="bg-charcoal rounded-xl border border-smoke p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Action Items</h2>
              <div className="space-y-2 mb-3">
                {day.actionItems.map((it, i) => (
                  <div key={i} className="flex items-center gap-3 group">
                    <button
                      onClick={() => toggleActionItem(i)}
                      className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center text-xs ${
                        it.done ? 'bg-gold border-gold text-obsidian' : 'border-ivory/30 text-transparent'
                      }`}
                    >✓</button>
                    <span className={`flex-1 text-sm ${it.done ? 'text-ivory/40 line-through' : 'text-white'}`}>{it.text}</span>
                    <button onClick={() => removeActionItem(i)} className="text-ivory/20 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                  </div>
                ))}
                {day.actionItems.length === 0 && <p className="text-ivory/30 text-sm">No action items yet.</p>}
              </div>
              <div className="flex gap-2">
                <input
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addActionItem()}
                  placeholder="Add an action item…"
                  className="flex-1 bg-obsidian border border-smoke rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-gold/50"
                />
                <button onClick={addActionItem} className="px-3 py-2 rounded-lg bg-gold text-obsidian text-sm font-semibold hover:bg-gold/90">Add</button>
              </div>
            </div>
          </div>
        )}

        {tab === 'week' && (
          <div className="space-y-5">
            <div className="bg-charcoal rounded-xl border border-smoke p-6">
              <h2 className="text-lg font-semibold text-white mb-1">This Week — Jul 28 – Aug 1</h2>
              <p className="text-ivory/50 text-xs mb-4">Daily standing (every day): {DAILY_STANDING}</p>
              <div className="space-y-3">
                {WEEK_PLAN.map((w) => (
                  <div key={w.day} className="flex gap-3">
                    <span className="shrink-0 w-16 text-gold text-xs font-bold pt-0.5">{w.day}</span>
                    <span className="text-ivory/80 text-sm">{w.tasks}</span>
                  </div>
                ))}
              </div>
              <p className="text-ivory/30 text-[11px] mt-4">Edit this list directly in components/CoreFour.tsx (WEEK_PLAN) when the week rolls over.</p>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-5">
            <div className="bg-charcoal rounded-xl border border-smoke p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Recent days</h2>
                {recentDays.length > 0 && <span className="text-ivory/30 text-[10px]">tap a day for detail</span>}
              </div>
              {recentDays.length === 0 && <p className="text-ivory/40 text-sm">No days logged yet.</p>}
              <div className="space-y-1">
                {recentDays.map((d) => {
                  const e = state.days[d]
                  const flagged = PILLARS.filter((p) => e.pillars?.[p.key]?.status === 'needs-attention').length
                  const onTrack = PILLARS.filter((p) => e.pillars?.[p.key]?.status === 'on-track').length
                  return (
                    <button
                      key={d}
                      onClick={() => setSelectedDay(d)}
                      className="w-full flex items-center gap-3 text-left rounded-lg px-2 py-2 -mx-2 hover:bg-obsidian/60 transition-colors"
                    >
                      <span className="text-ivory/70 text-xs w-28 shrink-0">{niceDate(d)}</span>
                      <span className="text-gold text-xs w-16">{onTrack} on track</span>
                      <span className="text-amber-400 text-xs w-24">{flagged} flagged</span>
                      <span className="text-ivory/40 text-xs flex-1 text-right">{e.marketing?.dmsSent || 0} DMs · {e.marketing?.linkClicks || 0} clicks</span>
                      <span className="text-ivory/30 text-xs">›</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {selectedDay && state.days[selectedDay] && (
              <div
                className="fixed inset-0 z-50 bg-black/75 flex items-start justify-center overflow-y-auto p-4"
                onClick={() => setSelectedDay(null)}
              >
                <div
                  className="bg-charcoal border border-smoke rounded-xl max-w-lg w-full my-8 p-6"
                  onClick={(ev) => ev.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-white">{niceDate(selectedDay)}</h3>
                    <button onClick={() => setSelectedDay(null)} className="text-ivory/50 hover:text-white text-2xl leading-none">×</button>
                  </div>
                  {(() => {
                    const e = state.days[selectedDay]
                    return (
                      <div className="space-y-4">
                        {PILLARS.map((p) => {
                          const entry = e.pillars?.[p.key]
                          if (!entry || (!entry.status && !entry.notes)) return null
                          return (
                            <div key={p.key}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-white text-sm font-semibold">{p.title}</span>
                                {entry.status && (
                                  <span className={`text-[10px] font-semibold ${STATUS_META[entry.status as Exclude<Status, ''>].text}`}>
                                    {STATUS_META[entry.status as Exclude<Status, ''>].label}
                                  </span>
                                )}
                              </div>
                              {entry.notes && <p className="text-ivory/60 text-xs">{entry.notes}</p>}
                            </div>
                          )
                        })}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <MiniStat label="DMs" value={e.marketing?.dmsSent || 0} />
                          <MiniStat label="Replies" value={e.marketing?.replies || 0} />
                          <MiniStat label="Clicks" value={e.marketing?.linkClicks || 0} />
                        </div>
                        {(e.financials?.revenue || e.financials?.cashOnHand || e.financials?.notes) && (
                          <div>
                            <p className="text-white text-sm font-semibold mb-1">Financials</p>
                            {e.financials.revenue && <p className="text-ivory/60 text-xs">Revenue: {e.financials.revenue}</p>}
                            {e.financials.cashOnHand && <p className="text-ivory/60 text-xs">Cash on hand: {e.financials.cashOnHand}</p>}
                            {e.financials.notes && <p className="text-ivory/60 text-xs">{e.financials.notes}</p>}
                          </div>
                        )}
                        {e.actionItems?.length > 0 && (
                          <div>
                            <p className="text-white text-sm font-semibold mb-1">Action Items</p>
                            {e.actionItems.map((it, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                <span className={it.done ? 'text-gold' : 'text-ivory/30'}>{it.done ? '✓' : '○'}</span>
                                <span className={it.done ? 'text-ivory/50 line-through' : 'text-ivory/80'}>{it.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="text-[10px] text-gold uppercase tracking-wider mb-1 block">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="w-full bg-obsidian border border-smoke rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-gold/50"
      />
    </div>
  )
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-[10px] text-gold uppercase tracking-wider mb-1 block">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-obsidian border border-smoke rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-gold/50"
      />
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-obsidian rounded-lg border border-smoke p-2">
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-[9px] text-ivory/50 uppercase tracking-wide">{label}</div>
    </div>
  )
}
