'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

/* ────────────────────────────────────────────────────────────────
   FOUNDER OS — Asa Luke's private daily operating cockpit.
   Isolated admin section. State persists to localStorage instantly
   and syncs to Supabase (founder_os_state) via /api/admin/founder.
   ──────────────────────────────────────────────────────────────── */

const LS_KEY = 'founder_os_state_v1'

// The fixed north stars (edit here if the vision ever sharpens).
const MISSION = 'Serve 100,000,000 people every day — through Entertainment, Music, Acting, Fitness, Wellness, and Faith.'
const MANTRA = 'To get what I want, I first provide someone else with what they want.'
const IDENTITY = 'I am a founder, artist, and father who builds systems that serve millions — and honors God and family doing it.'
const PRIMARY_GOAL = 'Build the Asa Luke ecosystem: a media brand + app that reaches 100M daily, funded by a fitness/wellness engine I own.'
const COMPOUNDING_METRIC = 'Owned audience — email list + app users. Grow it every single day.'

const CHECKLIST: { key: string; label: string }[] = [
  { key: 'faith', label: 'Faith time + vision review' },
  { key: 'priority1', label: 'Top priority #1 completed' },
  { key: 'deepwork', label: 'Deep-work block on the big rock' },
  { key: 'content', label: 'Published 1 piece of content' },
  { key: 'served', label: 'Served 1+ person directly' },
  { key: 'outreach', label: 'Outreach quota hit' },
  { key: 'health', label: 'Trained + ate + sleep on track' },
  { key: 'family', label: 'Present time with family' },
  { key: 'journal', label: 'Journaled + set tomorrow’s first action' },
]

// Decision filters — the wall reminders.
const FILTERS = [
  'Serve more people, or serve them deeper?',
  'Does it build an asset I OWN (software, list, IP, brand)?',
  'Is it a system that runs without me — not a task that dies when I stop?',
  'Does it strengthen the wedge (fitness cash) or the engine (content reach)?',
  'Is this the highest-leverage use of today?',
  'Faith filter: proud to show my daughter and stand behind it before God?',
]

const VEHICLES = [
  { name: 'Fitness', tag: 'CASH — wedge, build first', note: 'Cookbook → plans → app subscription → coaching. Funds everything.' },
  { name: 'Wellness', tag: 'CASH — expansion', note: 'Mindset, habits, journal, sleep. Bundled into the membership; raises retention.' },
  { name: 'Faith', tag: 'SOUL — woven through', note: 'The why + integrity filter + trust layer. Monetize gently, last.' },
  { name: 'Entertainment', tag: 'REACH — the engine', note: 'Your content/media machine. The top of funnel for all six. Becomes the umbrella.' },
  { name: 'Music', tag: 'REACH → CASH — scale on the audience', note: 'Release to a warm crowd. Own your masters — generational IP.' },
  { name: 'Acting', tag: 'REACH — longest runway', note: 'Needs the name first. Build audience now; self-produce to show range.' },
]

// The north-star ladder — each 10× forces a new mechanism.
const LADDER = [
  { n: '1', when: 'Now', how: 'Your hands — one person, one DM, one client.' },
  { n: '10', when: 'Mo. 1–6', how: 'Coaching + first content. Still 1:1. Learn what truly helps.' },
  { n: '100', when: 'Year 1', how: 'Content engine + products selling. First shift 1:1 → 1:many.' },
  { n: '1,000', when: 'Year 2–3', how: 'Platform audience + owned email list + app v1.' },
  { n: '10,000', when: 'Year 3–5', how: 'Multi-platform media + subscription + app DAU + first hire.' },
  { n: '100,000', when: 'Year 5–7', how: 'Media brand + app platform + team running systems.' },
  { n: '1,000,000', when: 'Year 7–12', how: 'Software + media do the serving. Owned IP + ecosystem.' },
  { n: '10,000,000', when: 'Year 12–17', how: 'Six vehicles as divisions; you become visionary, not operator.' },
  { n: '100,000,000', when: '~Year 20', how: 'THE MISSION — owned media + app + platform at global scale.' },
]

type Priority = { text: string; done: boolean }
type Metrics = { content: number; served: number; outreach: number; deepWork: number }
type Journal = { peopleServed: string; win: string; lesson: string; gratitude: string; tomorrow: string }
type DayEntry = {
  priorities: Priority[]
  serviceGoal: number
  checklist: Record<string, boolean>
  metrics: Metrics
  journal: Journal
}
type State = { days: Record<string, DayEntry> }

function newDay(): DayEntry {
  return {
    priorities: [
      { text: '', done: false },
      { text: '', done: false },
      { text: '', done: false },
    ],
    serviceGoal: 3,
    checklist: {},
    metrics: { content: 0, served: 0, outreach: 0, deepWork: 0 },
    journal: { peopleServed: '', win: '', lesson: '', gratitude: '', tomorrow: '' },
  }
}

function todayKey(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function prevKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() - 1)
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${dt.getFullYear()}-${mm}-${dd}`
}

function niceDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

// Whole days from date `a` to date `b` (positive if b is later).
function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime()) / 86400000)
}

// A day "counts" for the streak when the daily minimum is met.
function dayCounts(e?: DayEntry): boolean {
  if (!e) return false
  return !!(e.checklist.content && e.checklist.served && e.checklist.journal)
}

function computeStreak(days: Record<string, DayEntry>): number {
  let streak = 0
  let key = todayKey()
  // If today isn't done yet, start counting from yesterday so the streak
  // doesn't read 0 all day until the evening.
  if (!dayCounts(days[key])) key = prevKey(key)
  while (dayCounts(days[key])) {
    streak++
    key = prevKey(key)
  }
  return streak
}

type Tab = 'today' | 'progress' | 'journal' | 'compass'

export default function FounderOS() {
  const [state, setState] = useState<State>({ days: {} })
  const [tab, setTab] = useState<Tab>('today')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'local'>('idle')
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const loaded = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const key = todayKey()
  const day = state.days[key] ?? newDay()

  // ── Load: localStorage first (instant), then server (source of truth).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) setState(JSON.parse(raw))
    } catch { /* ignore */ }
    fetch('/api/admin/founder')
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res?.data && typeof res.data === 'object' && res.data.days) {
          setState(res.data as State)
          try { localStorage.setItem(LS_KEY, JSON.stringify(res.data)) } catch { /* ignore */ }
        }
      })
      .catch(() => { /* offline — localStorage only */ })
      .finally(() => { loaded.current = true })
  }, [])

  // ── Autosave: localStorage immediately, Supabase debounced.
  useEffect(() => {
    if (!loaded.current) return
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)) } catch { /* ignore */ }
    setStatus('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      fetch('/api/admin/founder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: state }),
      })
        .then((r) => setStatus(r.ok ? 'saved' : 'local'))
        .catch(() => setStatus('local'))
    }, 800)
  }, [state])

  // ── Explicit Save button: flush to the cloud immediately, skip the debounce.
  const saveNow = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)) } catch { /* ignore */ }
    setStatus('saving')
    fetch('/api/admin/founder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: state }),
    })
      .then((r) => setStatus(r.ok ? 'saved' : 'local'))
      .catch(() => setStatus('local'))
  }, [state])

  // ── Mutators (all operate on today's entry).
  const patchDay = useCallback((patch: Partial<DayEntry>) => {
    setState((s) => {
      const cur = s.days[key] ?? newDay()
      return { ...s, days: { ...s.days, [key]: { ...cur, ...patch } } }
    })
  }, [key])

  const setPriority = (i: number, text: string) => {
    const priorities = day.priorities.map((p, idx) => (idx === i ? { ...p, text } : p))
    patchDay({ priorities })
  }
  const togglePriority = (i: number) => {
    const priorities = day.priorities.map((p, idx) => (idx === i ? { ...p, done: !p.done } : p))
    patchDay({ priorities })
  }
  const toggleCheck = (k: string) => patchDay({ checklist: { ...day.checklist, [k]: !day.checklist[k] } })
  const bumpMetric = (k: keyof Metrics, delta: number) =>
    patchDay({ metrics: { ...day.metrics, [k]: Math.max(0, day.metrics[k] + delta) } })
  const setJournal = (k: keyof Journal, v: string) => patchDay({ journal: { ...day.journal, [k]: v } })

  const streak = computeStreak(state.days)
  const doneCount = CHECKLIST.filter((c) => day.checklist[c.key]).length
  const journalDays = Object.keys(state.days)
    .filter((d) => {
      const j = state.days[d].journal
      return j && (j.win || j.lesson || j.peopleServed || j.tomorrow)
    })
    .sort()
    .reverse()

  // ── Progress analytics (derived from every saved day) ──
  const allKeys = Object.keys(state.days)
  const daysLogged = allKeys.length
  const sumMetric = (k: keyof Metrics) => allKeys.reduce((t, d) => t + (state.days[d].metrics?.[k] || 0), 0)
  const totalServed = sumMetric('served')
  const totalContent = sumMetric('content')
  const bestServed = allKeys.reduce((m, d) => Math.max(m, state.days[d].metrics?.served || 0), 0)

  const windowTotals = (n: number) =>
    allKeys
      .filter((d) => { const diff = daysBetween(d, key); return diff >= 0 && diff < n })
      .reduce(
        (acc, d) => {
          const m = state.days[d].metrics || ({} as Metrics)
          return {
            content: acc.content + (m.content || 0),
            served: acc.served + (m.served || 0),
            outreach: acc.outreach + (m.outreach || 0),
            deepWork: acc.deepWork + (m.deepWork || 0),
          }
        },
        { content: 0, served: 0, outreach: 0, deepWork: 0 }
      )
  const weekTotals = windowTotals(7)
  const monthTotals = windowTotals(30)

  // Current ladder rung from your best single day of people served.
  const ladderNums = LADDER.map((r) => Number(r.n.replace(/,/g, '')))
  let reachedIdx = -1
  for (let i = 0; i < ladderNums.length; i++) if (bestServed >= ladderNums[i]) reachedIdx = i
  const currentRung = LADDER[Math.max(0, reachedIdx)]
  const nextRung = LADDER[Math.min(LADDER.length - 1, reachedIdx + 1)]

  const recentDays = allKeys
    .filter((d) => { const diff = daysBetween(d, key); return diff >= 0 && diff < 14 })
    .sort()
    .reverse()

  return (
    <div className="min-h-screen bg-obsidian px-4 py-10">
      <div className="max-w-3xl mx-auto">
        {/* Minimal top bar — this page has no site nav (standalone cockpit) */}
        <div className="flex items-center justify-between mb-4 text-xs">
          <a href="/admin" className="text-ivory/40 hover:text-gold transition-colors">← Admin</a>
          <a href="/" className="text-ivory/40 hover:text-gold transition-colors">asaluke.io ↗</a>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-1">Founder OS</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Serve 100M Daily</h1>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gold leading-none">{streak}</div>
            <div className="text-[10px] text-ivory/50 uppercase tracking-wider mt-1">day streak</div>
          </div>
        </div>

        {/* Save status + date + explicit Save */}
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

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-smoke">
          {(['today', 'progress', 'journal', 'compass'] as Tab[]).map((t) => (
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
            {/* VISION BOARD — glance in 10 seconds */}
            <div className="bg-charcoal rounded-xl border border-smoke p-6">
              <div className="grid gap-4">
                <Field label="Mission">{MISSION}</Field>
                <Field label="Mantra"><span className="italic">“{MANTRA}”</span></Field>
                <Field label="Identity">{IDENTITY}</Field>
                <Field label="Primary Goal">{PRIMARY_GOAL}</Field>
                <div className="grid sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <p className="text-[10px] text-gold uppercase tracking-wider mb-1">Today’s #1 Action</p>
                    <p className="text-white text-sm font-medium min-h-[1.25rem]">
                      {day.priorities[0]?.text || <span className="text-ivory/30">set it below ↓</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gold uppercase tracking-wider mb-1">Today’s Service Goal</p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => patchDay({ serviceGoal: Math.max(0, day.serviceGoal - 1) })} className="w-6 h-6 rounded bg-smoke text-ivory hover:bg-smoke/70">−</button>
                      <span className="text-white text-sm">Help <span className="text-gold font-bold">{day.serviceGoal}</span> people</span>
                      <button onClick={() => patchDay({ serviceGoal: day.serviceGoal + 1 })} className="w-6 h-6 rounded bg-smoke text-ivory hover:bg-smoke/70">+</button>
                    </div>
                  </div>
                </div>
                <Field label="The One Metric That Compounds">{COMPOUNDING_METRIC}</Field>
              </div>
            </div>

            {/* TOP 3 PRIORITIES */}
            <div className="bg-charcoal rounded-xl border border-smoke p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Today’s Top 3 Priorities</h2>
              <div className="space-y-2">
                {day.priorities.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <button
                      onClick={() => togglePriority(i)}
                      className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center text-xs ${
                        p.done ? 'bg-gold border-gold text-obsidian' : 'border-ivory/30 text-transparent'
                      }`}
                    >✓</button>
                    <span className="text-ivory/40 text-sm w-4">{i + 1}</span>
                    <input
                      value={p.text}
                      onChange={(e) => setPriority(i, e.target.value)}
                      placeholder={i === 0 ? 'The needle-mover (do this first)…' : 'Priority…'}
                      className={`flex-1 bg-transparent text-sm outline-none border-b border-transparent focus:border-smoke py-1 ${
                        p.done ? 'text-ivory/40 line-through' : 'text-white'
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* DAILY CHECKLIST */}
            <div className="bg-charcoal rounded-xl border border-smoke p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Daily Non-Negotiables</h2>
                <span className="text-sm text-ivory/50">{doneCount}/{CHECKLIST.length}</span>
              </div>
              <div className="h-1.5 bg-smoke rounded-full mb-4 overflow-hidden">
                <div className="h-full bg-gold transition-all" style={{ width: `${(doneCount / CHECKLIST.length) * 100}%` }} />
              </div>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                {CHECKLIST.map((c) => (
                  <button key={c.key} onClick={() => toggleCheck(c.key)} className="flex items-center gap-3 text-left group">
                    <span className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center text-xs ${
                      day.checklist[c.key] ? 'bg-gold border-gold text-obsidian' : 'border-ivory/30 text-transparent group-hover:border-ivory/60'
                    }`}>✓</span>
                    <span className={`text-sm ${day.checklist[c.key] ? 'text-ivory/40 line-through' : 'text-ivory/80'}`}>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* METRICS */}
            <div className="bg-charcoal rounded-xl border border-smoke p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Today’s Leading Metrics</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stepper label="Content" value={day.metrics.content} onBump={(d) => bumpMetric('content', d)} />
                <Stepper label="People served" value={day.metrics.served} onBump={(d) => bumpMetric('served', d)} />
                <Stepper label="Outreach" value={day.metrics.outreach} onBump={(d) => bumpMetric('outreach', d)} />
                <Stepper label="Deep-work hrs" value={day.metrics.deepWork} onBump={(d) => bumpMetric('deepWork', d)} />
              </div>
            </div>
          </div>
        )}

        {tab === 'progress' && (
          <div className="space-y-5">
            {/* Headline stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatTile label="Day streak" value={streak} accent />
              <StatTile label="Days logged" value={daysLogged} />
              <StatTile label="Served (all-time)" value={totalServed} />
              <StatTile label="Content (all-time)" value={totalContent} />
            </div>

            {/* Milestone — the served-daily ladder with your current rung */}
            <div className="bg-charcoal rounded-xl border border-smoke p-6">
              <h2 className="text-lg font-semibold text-white mb-1">Milestone — people served daily</h2>
              <p className="text-ivory/50 text-xs mb-4">
                Best day so far: <span className="text-gold font-semibold">{bestServed}</span> served · you’re on rung{' '}
                <span className="text-white font-semibold">{currentRung.n}</span> → next:{' '}
                <span className="text-white font-semibold">{nextRung.n}</span> ({nextRung.how})
              </p>
              <div className="space-y-1.5">
                {LADDER.map((r, i) => {
                  const reached = i <= reachedIdx
                  const isCurrent = i === Math.max(0, reachedIdx)
                  return (
                    <div key={r.n} className={`flex items-baseline gap-3 ${reached ? 'opacity-100' : 'opacity-40'}`}>
                      <span className={`shrink-0 w-4 text-center text-xs ${reached ? 'text-gold' : 'text-ivory/30'}`}>{reached ? '✓' : '○'}</span>
                      <span className={`shrink-0 text-right w-24 font-bold tabular-nums ${isCurrent ? 'text-gold' : 'text-white'}`}>{r.n}</span>
                      <span className="shrink-0 text-[10px] text-ivory/40 w-16">{r.when}</span>
                      <span className="text-ivory/60 text-xs">{r.how}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* This week / this month rollups */}
            <div className="grid sm:grid-cols-2 gap-3">
              <RollupCard title="This week (last 7 days)" t={weekTotals} />
              <RollupCard title="This month (last 30 days)" t={monthTotals} />
            </div>

            {/* Recent days — tap any day for full detail */}
            <div className="bg-charcoal rounded-xl border border-smoke p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Recent days</h2>
                {recentDays.length > 0 && <span className="text-ivory/30 text-[10px]">tap a day for detail</span>}
              </div>
              {recentDays.length === 0 && (
                <p className="text-ivory/40 text-sm">No days logged yet — head to the Today tab and start.</p>
              )}
              <div className="space-y-1">
                {recentDays.map((d) => {
                  const e = state.days[d]
                  const done = CHECKLIST.filter((c) => e.checklist?.[c.key]).length
                  const pct = Math.round((done / CHECKLIST.length) * 100)
                  return (
                    <button
                      key={d}
                      onClick={() => setSelectedDay(d)}
                      className="w-full flex items-center gap-3 text-left rounded-lg px-2 py-1.5 -mx-2 hover:bg-obsidian/60 transition-colors"
                    >
                      <span className="text-ivory/70 text-xs w-24 shrink-0">{niceDate(d)}</span>
                      <div className="flex-1 h-2 bg-smoke rounded-full overflow-hidden">
                        <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-ivory/40 text-[10px] w-8 text-right">{done}/{CHECKLIST.length}</span>
                      <span className="text-ivory/60 text-xs w-16 text-right">{e.metrics?.served || 0} served</span>
                      <span className="text-ivory/30 text-xs">›</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Day detail modal */}
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
                    const m = e.metrics || { content: 0, served: 0, outreach: 0, deepWork: 0 }
                    const j = e.journal || { peopleServed: '', win: '', lesson: '', gratitude: '', tomorrow: '' }
                    const prios = (e.priorities || []).filter((p) => p.text)
                    const metricRows: [string, keyof Metrics][] = [['Content', 'content'], ['Served', 'served'], ['Outreach', 'outreach'], ['Deep hrs', 'deepWork']]
                    return (
                      <div className="space-y-5">
                        <div className="grid grid-cols-4 gap-2 text-center">
                          {metricRows.map(([lab, k]) => (
                            <div key={k} className="bg-obsidian rounded-lg border border-smoke p-2">
                              <div className="text-xl font-bold text-white">{m[k] || 0}</div>
                              <div className="text-[9px] text-ivory/50 uppercase tracking-wide">{lab}</div>
                            </div>
                          ))}
                        </div>
                        {prios.length > 0 && (
                          <div>
                            <p className="text-[10px] text-gold uppercase tracking-wider mb-2">Priorities</p>
                            {prios.map((p, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm">
                                <span className={p.done ? 'text-gold' : 'text-ivory/30'}>{p.done ? '✓' : '○'}</span>
                                <span className={p.done ? 'text-ivory/50 line-through' : 'text-white'}>{p.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] text-gold uppercase tracking-wider mb-2">Non-negotiables</p>
                          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
                            {CHECKLIST.map((c) => (
                              <div key={c.key} className="flex items-center gap-2 text-xs">
                                <span className={e.checklist?.[c.key] ? 'text-gold' : 'text-ivory/25'}>{e.checklist?.[c.key] ? '✓' : '○'}</span>
                                <span className={e.checklist?.[c.key] ? 'text-ivory/70' : 'text-ivory/30'}>{c.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {(j.peopleServed || j.win || j.lesson || j.gratitude || j.tomorrow) && (
                          <div className="space-y-2">
                            <p className="text-[10px] text-gold uppercase tracking-wider">Journal</p>
                            {j.peopleServed && <DetailLine label="Served" value={j.peopleServed} />}
                            {j.win && <DetailLine label="Win" value={j.win} />}
                            {j.lesson && <DetailLine label="Lesson" value={j.lesson} />}
                            {j.gratitude && <DetailLine label="Gratitude" value={j.gratitude} />}
                            {j.tomorrow && <DetailLine label="Tomorrow" value={j.tomorrow} />}
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

        {tab === 'journal' && (
          <div className="space-y-5">
            <div className="bg-charcoal rounded-xl border border-smoke p-6">
              <h2 className="text-lg font-semibold text-white mb-1">Tonight’s 5-Minute Journal</h2>
              <p className="text-ivory/40 text-xs mb-5">{niceDate(key)}</p>
              <div className="space-y-4">
                <JField label="People I served today (who + how)" value={day.journal.peopleServed} onChange={(v) => setJournal('peopleServed', v)} />
                <JField label="Biggest win" value={day.journal.win} onChange={(v) => setJournal('win', v)} />
                <JField label="Biggest lesson" value={day.journal.lesson} onChange={(v) => setJournal('lesson', v)} />
                <JField label="Gratitude (3)" value={day.journal.gratitude} onChange={(v) => setJournal('gratitude', v)} />
                <JField label="Tomorrow’s first action (write it now)" value={day.journal.tomorrow} onChange={(v) => setJournal('tomorrow', v)} />
              </div>
            </div>

            {journalDays.length > 1 && (
              <div className="bg-charcoal rounded-xl border border-smoke p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Past Entries</h2>
                <div className="space-y-4">
                  {journalDays.filter((d) => d !== key).slice(0, 30).map((d) => {
                    const j = state.days[d].journal
                    return (
                      <div key={d} className="border-l-2 border-smoke pl-3">
                        <p className="text-gold text-xs mb-1">{niceDate(d)}</p>
                        {j.win && <p className="text-ivory/80 text-sm"><span className="text-ivory/40">Win: </span>{j.win}</p>}
                        {j.lesson && <p className="text-ivory/80 text-sm"><span className="text-ivory/40">Lesson: </span>{j.lesson}</p>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'compass' && (
          <div className="space-y-5">
            <div className="bg-charcoal rounded-xl border border-smoke p-6">
              <h2 className="text-lg font-semibold text-white mb-3">The Strategy, in one breath</h2>
              <p className="text-ivory/80 text-sm leading-relaxed">
                One brand (“Asa Luke”), one audience, six vehicles built <span className="text-gold">in sequence off one engine</span> — not six businesses at once.
                <span className="text-white"> Content</span> is the daily-reach engine. <span className="text-white">Fitness/Wellness</span> is the cash engine that funds everything.
                <span className="text-white"> Faith</span> is the soul underneath. Music, Acting, and Entertainment scale later on the audience the engine builds.
                Move value from rented attention into <span className="text-gold">owned assets</span> (app, list, IP) every day.
              </p>
            </div>

            <div className="bg-charcoal rounded-xl border border-smoke p-6">
              <h2 className="text-lg font-semibold text-white mb-4">The 5 Decision Filters</h2>
              <ol className="space-y-2">
                {FILTERS.map((f, i) => (
                  <li key={i} className="flex gap-3 text-sm text-ivory/80">
                    <span className="text-gold shrink-0">{i < 5 ? i + 1 : '★'}</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ol>
              <p className="text-ivory/40 text-xs mt-4">Fails two or more → it’s a no.</p>
            </div>

            <div className="bg-charcoal rounded-xl border border-smoke p-6">
              <h2 className="text-lg font-semibold text-white mb-4">The Six Vehicles</h2>
              <div className="space-y-3">
                {VEHICLES.map((v) => (
                  <div key={v.name}>
                    <div className="flex items-baseline gap-2">
                      <span className="text-white text-sm font-semibold">{v.name}</span>
                      <span className="text-gold text-[10px] uppercase tracking-wider">{v.tag}</span>
                    </div>
                    <p className="text-ivory/60 text-xs">{v.note}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* THE LADDER — people served daily */}
            <div className="bg-charcoal rounded-xl border border-smoke p-6">
              <h2 className="text-lg font-semibold text-white mb-1">People Served Daily — the ladder</h2>
              <p className="text-ivory/40 text-xs mb-4">Your north star. Each 10× forces a new mechanism. You can’t skip rungs.</p>
              <div className="space-y-1.5">
                {LADDER.map((r, i) => (
                  <div key={r.n} className="flex items-baseline gap-3">
                    <span className={`shrink-0 text-right w-24 font-bold tabular-nums ${i === LADDER.length - 1 ? 'text-gold' : 'text-white'}`}>{r.n}</span>
                    <span className="shrink-0 text-[10px] text-ivory/40 w-16">{r.when}</span>
                    <span className="text-ivory/70 text-xs">{r.how}</span>
                  </div>
                ))}
              </div>
              <p className="text-ivory/40 text-xs mt-4">Stuck at a rung? You’re missing the next asset. The plateau names your next build.</p>
            </div>

            <div className="bg-charcoal rounded-xl border border-smoke p-6">
              <h2 className="text-lg font-semibold text-white mb-3">Build first (dependency order)</h2>
              <ol className="space-y-1.5 text-sm text-ivory/80 list-decimal list-inside">
                <li>Install the daily habit (this dashboard + journal, unbroken).</li>
                <li><span className="text-gold">Run two tracks in parallel from Day 1:</span> (A) ship the fitness cash engine to “sellable,” and (B) turn on the awareness/content engine — 1 platform, daily, every post points to the free magnet. <span className="text-ivory/50">Don’t wait for a perfect product to start being seen.</span></li>
                <li>Close the loop: aware → free magnet → email → paid offer, measured weekly.</li>
                <li>Amplify awareness: collabs, then a 2nd platform, then paid ads (only once it converts free).</li>
                <li>Systematize + document so it runs 80% without you, then hire (editor first — feed the engine).</li>
                <li>Then expand vehicles: music drop, acting push, community, platform.</li>
              </ol>
              <p className="text-ivory/40 text-xs mt-4">Full manual: <span className="text-ivory/60">~/Desktop/Master-Operating-System/</span></p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm text-ivory/80"><span className="text-ivory/40">{label}: </span>{value}</p>
  )
}

function StatTile({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="bg-charcoal rounded-xl border border-smoke p-4 text-center">
      <div className={`text-3xl font-bold ${accent ? 'text-gold' : 'text-white'}`}>{value}</div>
      <div className="text-[10px] text-ivory/50 uppercase tracking-wider mt-1">{label}</div>
    </div>
  )
}

function RollupCard({ title, t }: { title: string; t: { content: number; served: number; outreach: number; deepWork: number } }) {
  const rows: [string, number][] = [
    ['Content', t.content],
    ['People served', t.served],
    ['Outreach', t.outreach],
    ['Deep-work hrs', t.deepWork],
  ]
  return (
    <div className="bg-charcoal rounded-xl border border-smoke p-5">
      <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>
      <div className="grid grid-cols-2 gap-y-2 text-sm">
        {rows.map(([label, val]) => (
          <div key={label} className="contents">
            <span className="text-ivory/50">{label}</span>
            <span className="text-white text-right font-semibold">{val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] text-gold uppercase tracking-wider mb-1">{label}</p>
      <p className="text-white text-sm leading-relaxed">{children}</p>
    </div>
  )
}

function Stepper({ label, value, onBump }: { label: string; value: number; onBump: (d: number) => void }) {
  return (
    <div className="bg-obsidian rounded-lg border border-smoke p-3 text-center">
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-[10px] text-ivory/50 uppercase tracking-wider mb-2">{label}</div>
      <div className="flex items-center justify-center gap-2">
        <button onClick={() => onBump(-1)} className="w-6 h-6 rounded bg-smoke text-ivory hover:bg-smoke/70">−</button>
        <button onClick={() => onBump(1)} className="w-6 h-6 rounded bg-gold text-obsidian hover:bg-gold/90">+</button>
      </div>
    </div>
  )
}

function JField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[11px] text-gold uppercase tracking-wider mb-1 block">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full bg-obsidian border border-smoke rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-gold/50 resize-y"
      />
    </div>
  )
}
