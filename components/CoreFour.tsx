'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { StatusStackedBarChart, SimpleBarChart } from './CoreFourCharts'

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

/* ── Pillar "logos" — simple stroke icons in the black/gold system ── */
type IconProps = { className?: string }
function IconTarget({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
function IconChat({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M4 5h16v11H8l-4 4V5z" strokeLinejoin="round" />
    </svg>
  )
}
function IconGear({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <circle cx="12" cy="12" r="3" />
      <path strokeLinecap="round" d="M12 3v2.5M12 18.5V21M21 12h-2.5M5.5 12H3M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8M18.4 18.4l-1.8-1.8M7.4 7.4 5.6 5.6" />
    </svg>
  )
}
function IconMegaphone({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path strokeLinejoin="round" d="M3 10v4h3l6 4V6L6 10H3z" />
      <path strokeLinecap="round" d="M15 9.5a3.5 3.5 0 0 1 0 5M17.5 7a7 7 0 0 1 0 10" />
    </svg>
  )
}
function IconDollar({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.5v11M15 9c0-1.4-1.3-2.2-3-2.2S9 7.6 9 9s1.2 1.9 3 2.2 3 .8 3 2.3-1.3 2.5-3 2.5-3-.8-3-2.3" />
    </svg>
  )
}

type SectionMeta = { key: string; title: string; sub: string; question: string; Icon: (p: IconProps) => JSX.Element }

const PILLARS: SectionMeta[] = [
  {
    key: 'promise',
    title: '1. Promise/Offer',
    sub: 'Is the product/offer delivering on the promise?',
    question: 'Did every client/lead who touched the product move closer to their goal? Where is delivery breaking down?',
    Icon: IconTarget,
  },
  {
    key: 'feedback',
    title: '2. Feedback',
    sub: 'How are users and clients reacting?',
    question: 'What did leads/clients say, click, ignore, or complain about since yesterday?',
    Icon: IconChat,
  },
  {
    key: 'machine',
    title: '3. The Machine',
    sub: 'How is delivery actually running?',
    question: "What did I do manually today that the app/system should be doing? What's the bottleneck?",
    Icon: IconGear,
  },
  {
    key: 'marketing',
    title: '4. Marketing/Awareness',
    sub: 'Core Four channels: warm leads, cold outreach, content/organic, paid ads.',
    question: 'Which channels ran today? Which are still dormant?',
    Icon: IconMegaphone,
  },
]
const FINANCIALS_META: SectionMeta = {
  key: 'financials',
  title: '5. Financials',
  sub: 'Money in, money on hand, money needed.',
  question: 'What did we make, what do we have on hand, and what do we need?',
  Icon: IconDollar,
}
const ALL_SECTIONS: SectionMeta[] = [...PILLARS, FINANCIALS_META]

type NoteEntry = { time: string; text: string }
type PillarEntry = { status: Status; notes: string; log?: NoteEntry[] }
type ActionItem = { text: string; done: boolean }
type DayEntry = {
  topPriority: string
  pillars: Record<string, PillarEntry>
  marketing: { dmsSent: number; replies: number; linkClicks: number }
  financials: { status: Status; revenue: string; cashOnHand: string; notes: string; log?: NoteEntry[] }
  actionItems: ActionItem[]
}
type State = { days: Record<string, DayEntry> }

function emptyDay(): DayEntry {
  return {
    topPriority: '',
    pillars: Object.fromEntries(PILLARS.map((p) => [p.key, { status: '', notes: '', log: [] }])),
    marketing: { dmsSent: 0, replies: 0, linkClicks: 0 },
    financials: { status: '', revenue: '', cashOnHand: '', notes: '', log: [] },
    actionItems: [],
  }
}

// Seed 2026-07-28's real check-in so the first load isn't a blank page.
function seedLaunchDay(): DayEntry {
  return {
    topPriority: 'Diagnose + rewrite the DM message sent right before the Find Your Fix link (reply→click gap).',
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
    financials: { status: 'needs-attention', revenue: '', cashOnHand: '', notes: 'Need ~$75 for API integration (Anthropic ~$35 + Google ~$30-40) to unblock MVP.' },
    actionItems: [
      { text: 'Diagnose + rewrite the DM message sent right before the Find Your Fix link', done: false },
      { text: 'MVP UI fixes', done: false },
      { text: 'Fund API integration blocker (~$75)', done: false },
    ],
  }
}

function getStatus(e: DayEntry | undefined, key: string): Status {
  if (!e) return ''
  if (key === 'financials') return e.financials?.status || ''
  return e.pillars?.[key]?.status || ''
}
function getNotesFor(e: DayEntry | undefined, key: string): string {
  if (!e) return ''
  if (key === 'financials') return e.financials?.notes || ''
  return e.pillars?.[key]?.notes || ''
}
function getLog(e: DayEntry | undefined, key: string): NoteEntry[] {
  if (!e) return []
  if (key === 'financials') return e.financials?.log || []
  return e.pillars?.[key]?.log || []
}
function nowTime(): string {
  return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function niceDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function daysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate() }
function firstWeekday(year: number, month: number) { return new Date(year, month, 1).getDay() }
function dk(year: number, month: number, day: number) { return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` }

function buildMonthMatrix(year: number, month: number): (string | null)[][] {
  const total = daysInMonth(year, month)
  const startPad = firstWeekday(year, month)
  const cells: (string | null)[] = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= total; d++) cells.push(dk(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (string | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

type DaySummary = 'none' | 'flagged' | 'ontrack' | 'logged'
function summarizeDay(e?: DayEntry): DaySummary {
  if (!e) return 'none'
  const statuses = ALL_SECTIONS.map((s) => getStatus(e, s.key)).filter(Boolean)
  if (statuses.includes('needs-attention')) return 'flagged'
  if (statuses.includes('on-track')) return 'ontrack'
  if (statuses.length > 0) return 'logged'
  return 'none'
}
const SUMMARY_DOT: Record<DaySummary, string> = {
  none: 'bg-transparent',
  flagged: 'bg-amber-500',
  ontrack: 'bg-gold',
  logged: 'bg-ivory/35',
}

const WEEK_PLAN = [
  { day: 'Tue 7/28', tasks: 'MVP UI fixes • fund API integration blocker • organize Core Four checklist' },
  { day: 'Wed 7/29', tasks: 'Final MVP testing • integrate new lead-magnet PDFs • add injury auto-adjust logic to app' },
  { day: 'Thu 7/30', tasks: 'Soft launch prep • launch to first 50-100 users • close remaining app blockers' },
  { day: 'Fri 7/31', tasks: 'Build marketing system (content + scheduling) • update Actor Access • personal $360/day system' },
  { day: 'Sat 8/1', tasks: 'Weekly audition submission • review first-user feedback • week wrap / carry-forward review' },
]
const DAILY_STANDING = 'Core Four check-in • Send 50 DMs • Daily audition submission'

type Tab = 'today' | 'pillars' | 'calendar' | 'metrics' | 'week' | 'overview'
const TAB_LABELS: Record<Tab, string> = { today: 'Today', pillars: 'Pillars', calendar: 'Calendar', metrics: 'Metrics', week: 'Week', overview: 'Weekly Overview' }

// ── Metrics aggregation — rolls every logged day up into day/month/year buckets ──
type Bucket = { label: string; dates: string[] }
function aggregateDates(state: State, dates: string[]) {
  let onTrack = 0, needsAttention = 0, notActive = 0
  let dmsSent = 0, replies = 0, linkClicks = 0
  let revenue = 0
  let itemsTotal = 0, itemsDone = 0
  dates.forEach((d) => {
    const e = state.days[d]
    if (!e) return
    ALL_SECTIONS.forEach((s) => {
      const st = getStatus(e, s.key)
      if (st === 'on-track') onTrack++
      else if (st === 'needs-attention') needsAttention++
      else if (st === 'not-active') notActive++
    })
    dmsSent += e.marketing?.dmsSent || 0
    replies += e.marketing?.replies || 0
    linkClicks += e.marketing?.linkClicks || 0
    if (e.financials?.revenue) {
      const n = Number(e.financials.revenue.replace(/[^0-9.-]/g, ''))
      if (!isNaN(n)) revenue += n
    }
    ;(e.actionItems || []).forEach((it) => { itemsTotal++; if (it.done) itemsDone++ })
  })
  return { onTrack, needsAttention, notActive, dmsSent, replies, linkClicks, revenue, itemsTotal, itemsDone, actionPct: itemsTotal > 0 ? Math.round((itemsDone / itemsTotal) * 100) : 0 }
}
function dayBuckets(anchorKey: string, count: number): Bucket[] {
  const out: Bucket[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = addDays(anchorKey, -i)
    out.push({ label: shortDate(d), dates: [d] })
  }
  return out
}
function monthBuckets(state: State, anchorKey: string, count: number): Bucket[] {
  const [ay, am] = anchorKey.split('-').map(Number)
  const out: Bucket[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(ay, am - 1 - i, 1)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const dates = Object.keys(state.days).filter((k) => k.startsWith(ym))
    out.push({ label: `${MONTH_NAMES[d.getMonth()].slice(0, 3)} '${String(d.getFullYear()).slice(2)}`, dates })
  }
  return out
}
function yearBuckets(state: State): Bucket[] {
  const years = new Set<number>(Object.keys(state.days).map((k) => Number(k.slice(0, 4))))
  years.add(new Date().getFullYear())
  return Array.from(years).sort((a, b) => a - b).map((y) => ({ label: String(y), dates: Object.keys(state.days).filter((k) => k.startsWith(String(y))) }))
}

function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + n)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function mondayOf(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  const dow = new Date(y, m - 1, d).getDay()
  return addDays(key, -((dow + 6) % 7))
}
function weekDates(anchorKey: string): string[] {
  const mon = mondayOf(anchorKey)
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i))
}
function shortDayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short' })
}
function shortDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function CoreFour() {
  const [state, setState] = useState<State>({ days: {} })
  const [tab, setTab] = useState<Tab>('today')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'local'>('idle')
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null)
  const [newItem, setNewItem] = useState('')
  const [newLogText, setNewLogText] = useState('')
  const [calView, setCalView] = useState<'month' | 'year'>('month')
  const [metricView, setMetricView] = useState<'day' | 'month' | 'year'>('day')
  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const loaded = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const key = todayKey()
  const LAUNCH_KEY = '2026-07-28'
  const day = state.days[key] ?? (key === LAUNCH_KEY ? seedLaunchDay() : emptyDay())

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

  const setTopPriority = (v: string) => patchDay({ topPriority: v })
  const setPillar = (pKey: string, patch: Partial<PillarEntry>) =>
    patchDay({ pillars: { ...day.pillars, [pKey]: { ...day.pillars[pKey], ...patch } } })
  const setMarketing = (patch: Partial<DayEntry['marketing']>) =>
    patchDay({ marketing: { ...day.marketing, ...patch } })
  const setFinancials = (patch: Partial<DayEntry['financials']>) =>
    patchDay({ financials: { ...day.financials, ...patch } })

  // Appendable notes log — separate from the single status "notes" field,
  // so jotting a note during the day never overwrites an earlier one.
  const appendLog = (sectionKey: string, text: string) => {
    if (!text.trim()) return
    const entry: NoteEntry = { time: nowTime(), text: text.trim() }
    if (sectionKey === 'financials') {
      setFinancials({ log: [...(day.financials.log || []), entry] })
    } else {
      setPillar(sectionKey, { log: [...(day.pillars[sectionKey]?.log || []), entry] })
    }
  }
  const removeLogEntry = (sectionKey: string, idx: number) => {
    if (sectionKey === 'financials') {
      setFinancials({ log: (day.financials.log || []).filter((_, i) => i !== idx) })
    } else {
      setPillar(sectionKey, { log: (day.pillars[sectionKey]?.log || []).filter((_, i) => i !== idx) })
    }
  }

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

  const flaggedCount = ALL_SECTIONS.filter((s) => getStatus(day, s.key) === 'needs-attention').length
  const openPillar = (k: string) => { setSelectedPillar(k); setTab('pillars') }

  const goToMonth = (y: number, m: number) => { setCalYear(y); setCalMonth(m); setCalView('month'); setTab('calendar') }
  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1) } else setCalMonth((m) => m - 1) }
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1) } else setCalMonth((m) => m + 1) }

  return (
    <div className="min-h-screen bg-obsidian px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4 text-xs">
          <a href="/admin" className="text-ivory/40 hover:text-gold transition-colors">← Admin</a>
          <a href="/admin/founder" className="text-ivory/40 hover:text-gold transition-colors">Founder OS ↗</a>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-1">🏛️ Core Four</p>
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
            <button onClick={saveNow} className="px-3 py-1 rounded-lg bg-gold text-obsidian font-semibold hover:bg-gold/90 transition-colors">
              Save
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-6 border-b border-smoke overflow-x-auto">
          {(['today', 'pillars', 'calendar', 'metrics', 'week', 'overview'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); if (t !== 'pillars') setSelectedPillar(null) }}
              className={`px-3 py-2 text-sm border-b-2 whitespace-nowrap transition-colors ${
                tab === t ? 'border-gold text-white' : 'border-transparent text-ivory/50 hover:text-ivory/80'
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {tab === 'today' && (
          <div className="space-y-5">
            {/* TOP PRIORITY — the one thing that matters most today */}
            <div className="bg-charcoal rounded-xl border border-gold/30 p-6">
              <p className="text-[10px] text-gold uppercase tracking-wider mb-2">Today&rsquo;s #1 Priority</p>
              <input
                value={day.topPriority}
                onChange={(e) => setTopPriority(e.target.value)}
                placeholder="What's the one thing that matters most today?"
                className="w-full bg-transparent text-white text-lg font-semibold outline-none border-b border-transparent focus:border-smoke py-1 placeholder:text-ivory/25 placeholder:font-normal"
              />
            </div>

            {/* ACTION ITEMS — what's required, right under today's priority */}
            <div className="bg-charcoal rounded-xl border border-smoke p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Action Items — What&rsquo;s Required</h2>
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

            {/* STANDING QUESTIONS — directed at each department/pillar, ask every morning */}
            <div className="bg-charcoal rounded-xl border border-smoke p-6">
              <h2 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Standing Questions — by department</h2>
              <div className="space-y-3.5">
                {ALL_SECTIONS.map((s) => (
                  <div key={s.key} className="flex items-start gap-2.5">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-obsidian border border-gold/30 flex items-center justify-center text-gold mt-0.5">
                      <s.Icon className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <p className="text-gold text-[10px] font-semibold uppercase tracking-wider">{s.title.replace(/^\d\.\s*/, '')}</p>
                      <p className="text-ivory/60 text-xs leading-relaxed">{s.question}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PILLAR SNAPSHOT — click into any category */}
            <div>
              <h2 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">The Pillars — tap to open</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ALL_SECTIONS.map((s) => (
                  <PillarTile key={s.key} sec={s} day={day} onClick={() => openPillar(s.key)} />
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'pillars' && (
          <div className="space-y-5">
            {!selectedPillar && (
              <>
                <p className="text-ivory/40 text-xs">Tap a pillar to open its full review — today&rsquo;s status, notes, and history.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {ALL_SECTIONS.map((s) => (
                    <PillarTile key={s.key} sec={s} day={day} onClick={() => setSelectedPillar(s.key)} />
                  ))}
                </div>
              </>
            )}
            {selectedPillar && (() => {
              const sec = ALL_SECTIONS.find((s) => s.key === selectedPillar)!
              const st = getStatus(day, sec.key)
              const notes = getNotesFor(day, sec.key)
              const history = Object.keys(state.days)
                .filter((d) => d !== key)
                .sort()
                .reverse()
                .map((d) => ({ d, status: getStatus(state.days[d], sec.key), notes: getNotesFor(state.days[d], sec.key) }))
                .filter((h) => h.status || h.notes)
                .slice(0, 30)
              return (
                <div className="space-y-5">
                  <button onClick={() => setSelectedPillar(null)} className="text-ivory/50 hover:text-gold text-xs">← All pillars</button>
                  <div className="bg-charcoal rounded-xl border border-smoke p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="w-12 h-12 shrink-0 rounded-full bg-obsidian border border-gold/40 flex items-center justify-center text-gold">
                        <sec.Icon className="w-6 h-6" />
                      </span>
                      <div>
                        <h2 className="text-lg font-semibold text-white">{sec.title}</h2>
                        <p className="text-ivory/50 text-xs">{sec.sub}</p>
                      </div>
                    </div>
                    <div className="border-l-2 border-gold/50 pl-3 mb-4">
                      <p className="text-ivory/70 text-sm italic">{sec.question}</p>
                    </div>

                    <label className="text-[10px] text-gold uppercase tracking-wider mb-1 block">Today&rsquo;s status</label>
                    <select
                      value={st}
                      onChange={(e) => (sec.key === 'financials' ? setFinancials({ status: e.target.value as Status }) : setPillar(sec.key, { status: e.target.value as Status }))}
                      className="bg-obsidian border border-smoke rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-gold/50 mb-4"
                    >
                      <option value="">Set status…</option>
                      <option value="on-track">On Track</option>
                      <option value="needs-attention">Needs Attention</option>
                      <option value="not-active">Not Yet Active</option>
                    </select>

                    <label className="text-[10px] text-gold uppercase tracking-wider mb-1 block">Summary Notes <span className="text-ivory/30 normal-case">(the one-line takeaway — shown on tiles, weekly review)</span></label>
                    <textarea
                      value={notes}
                      onChange={(e) => (sec.key === 'financials' ? setFinancials({ notes: e.target.value }) : setPillar(sec.key, { notes: e.target.value }))}
                      rows={3}
                      className="w-full bg-obsidian border border-smoke rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-gold/50 resize-y"
                    />

                    {sec.key === 'marketing' && (
                      <div className="grid grid-cols-3 gap-3 mt-4">
                        <NumField label="DMs sent" value={day.marketing.dmsSent} onChange={(v) => setMarketing({ dmsSent: v })} />
                        <NumField label="Replies" value={day.marketing.replies} onChange={(v) => setMarketing({ replies: v })} />
                        <NumField label="Link clicks" value={day.marketing.linkClicks} onChange={(v) => setMarketing({ linkClicks: v })} />
                      </div>
                    )}
                    {sec.key === 'financials' && (
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <TextField label="Revenue" value={day.financials.revenue} onChange={(v) => setFinancials({ revenue: v })} placeholder="$0" />
                        <TextField label="Cash on hand" value={day.financials.cashOnHand} onChange={(v) => setFinancials({ cashOnHand: v })} placeholder="$0" />
                      </div>
                    )}
                  </div>

                  {/* NOTES LOG — appendable, timestamped, never overwritten */}
                  <div className="bg-charcoal rounded-xl border border-smoke p-6">
                    <h3 className="text-sm font-semibold text-white mb-1">Notes Log — Today</h3>
                    <p className="text-ivory/40 text-xs mb-4">Jot as many notes as you want throughout the day — each one sticks, nothing gets overwritten.</p>
                    <div className="space-y-2 mb-3">
                      {getLog(day, sec.key).map((n, i) => (
                        <div key={i} className="flex items-start gap-2 group bg-obsidian rounded-lg border border-smoke px-3 py-2">
                          <span className="text-gold text-[10px] font-semibold shrink-0 pt-0.5">{n.time}</span>
                          <span className="flex-1 text-ivory/80 text-sm">{n.text}</span>
                          <button onClick={() => removeLogEntry(sec.key, i)} className="text-ivory/20 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0">✕</button>
                        </div>
                      ))}
                      {getLog(day, sec.key).length === 0 && <p className="text-ivory/30 text-sm">No log entries yet today.</p>}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={newLogText}
                        onChange={(e) => setNewLogText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { appendLog(sec.key, newLogText); setNewLogText('') } }}
                        placeholder="Add a timestamped note…"
                        className="flex-1 bg-obsidian border border-smoke rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-gold/50"
                      />
                      <button
                        onClick={() => { appendLog(sec.key, newLogText); setNewLogText('') }}
                        className="px-3 py-2 rounded-lg bg-gold text-obsidian text-sm font-semibold hover:bg-gold/90"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="bg-charcoal rounded-xl border border-smoke p-6">
                    <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">History — {sec.title.replace(/^\d\.\s*/, '')}</h3>
                    {history.length === 0 && <p className="text-ivory/30 text-sm">No history yet for this pillar.</p>}
                    <div className="space-y-3">
                      {history.map((h) => (
                        <div key={h.d} className="border-l-2 border-smoke pl-3">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-gold text-xs">{niceDate(h.d)}</span>
                            {h.status && <span className={`text-[10px] font-semibold ${STATUS_META[h.status as Exclude<Status, ''>].text}`}>{STATUS_META[h.status as Exclude<Status, ''>].label}</span>}
                          </div>
                          {h.notes && <p className="text-ivory/60 text-xs">{h.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {tab === 'calendar' && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              {(['month', 'year'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setCalView(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                    calView === v ? 'bg-gold text-obsidian' : 'bg-charcoal border border-smoke text-ivory/60 hover:text-white'
                  }`}
                >
                  {v} view
                </button>
              ))}
            </div>

            {calView === 'month' && (
              <div className="bg-charcoal rounded-xl border border-smoke p-6">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={prevMonth} className="text-ivory/50 hover:text-gold px-2">‹</button>
                  <h2 className="text-white font-semibold">{MONTH_NAMES[calMonth]} {calYear}</h2>
                  <button onClick={nextMonth} className="text-ivory/50 hover:text-gold px-2">›</button>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {WEEKDAY_LABELS.map((w) => (
                    <div key={w} className="text-center text-[10px] text-ivory/40 uppercase py-1">{w}</div>
                  ))}
                </div>
                <div className="space-y-1">
                  {buildMonthMatrix(calYear, calMonth).map((week, wi) => (
                    <div key={wi} className="grid grid-cols-7 gap-1">
                      {week.map((dstr, di) => {
                        if (!dstr) return <div key={di} />
                        const dayNum = Number(dstr.split('-')[2])
                        const summary = summarizeDay(state.days[dstr])
                        const isToday = dstr === key
                        return (
                          <button
                            key={dstr}
                            onClick={() => setSelectedDay(dstr)}
                            className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-1 text-xs hover:bg-obsidian/60 transition-colors ${
                              isToday ? 'ring-1 ring-gold' : ''
                            }`}
                          >
                            <span className="text-ivory/70">{dayNum}</span>
                            <span className={`w-1.5 h-1.5 rounded-full ${SUMMARY_DOT[summary]}`} />
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {calView === 'year' && (
              <div className="bg-charcoal rounded-xl border border-smoke p-6">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setCalYear((y) => y - 1)} className="text-ivory/50 hover:text-gold px-2">‹</button>
                  <h2 className="text-white font-semibold">{calYear}</h2>
                  <button onClick={() => setCalYear((y) => y + 1)} className="text-ivory/50 hover:text-gold px-2">›</button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                  {MONTH_NAMES.map((mName, mi) => (
                    <div key={mName}>
                      <button onClick={() => goToMonth(calYear, mi)} className="text-ivory/70 hover:text-gold text-[11px] font-semibold mb-1.5 block">{mName.slice(0, 3)}</button>
                      <div className="grid grid-cols-7 gap-[3px]">
                        {buildMonthMatrix(calYear, mi).flat().map((dstr, i) => {
                          if (!dstr) return <div key={i} className="w-2 h-2" />
                          const summary = summarizeDay(state.days[dstr])
                          return (
                            <button
                              key={dstr}
                              onClick={() => setSelectedDay(dstr)}
                              title={dstr}
                              className={`w-2 h-2 rounded-[2px] ${SUMMARY_DOT[summary]} ${summary === 'none' ? 'bg-ivory/10' : ''}`}
                            />
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'metrics' && (() => {
          const buckets =
            metricView === 'day' ? dayBuckets(key, 30) :
            metricView === 'month' ? monthBuckets(state, key, 12) :
            yearBuckets(state)
          const rolled = buckets.map((b) => ({ label: b.label, ...aggregateDates(state, b.dates) }))
          return (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                {(['day', 'month', 'year'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setMetricView(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                      metricView === v ? 'bg-gold text-obsidian' : 'bg-charcoal border border-smoke text-ivory/60 hover:text-white'
                    }`}
                  >
                    {v === 'day' ? 'Last 30 Days' : v === 'month' ? 'Last 12 Months' : 'By Year'}
                  </button>
                ))}
              </div>

              <StatusStackedBarChart
                title="Pillar Health"
                buckets={rolled.map((r) => ({ label: r.label, onTrack: r.onTrack, needsAttention: r.needsAttention, notActive: r.notActive }))}
              />

              <div className="grid sm:grid-cols-3 gap-4">
                <SimpleBarChart title="DMs Sent" buckets={rolled.map((r) => ({ label: r.label, value: r.dmsSent }))} />
                <SimpleBarChart title="Replies" buckets={rolled.map((r) => ({ label: r.label, value: r.replies }))} />
                <SimpleBarChart title="Link Clicks" buckets={rolled.map((r) => ({ label: r.label, value: r.linkClicks }))} />
              </div>

              <SimpleBarChart
                title="Revenue"
                sub="Summed from Financials → Revenue field, parsed as a number per entry."
                buckets={rolled.map((r) => ({ label: r.label, value: r.revenue }))}
                format={(v) => `$${v.toLocaleString()}`}
              />

              <SimpleBarChart
                title="Action Item Completion Rate"
                sub="% of that period's action items marked done."
                buckets={rolled.map((r) => ({ label: r.label, value: r.actionPct }))}
                format={(v) => `${v}%`}
              />
            </div>
          )
        })()}

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

        {tab === 'overview' && <WeeklyOverviewTab state={state} anchorKey={key} />}

        {/* DAY DETAIL MODAL — opened from Calendar (month or year view) */}
        {selectedDay && state.days[selectedDay] && (
          <div className="fixed inset-0 z-50 bg-black/75 flex items-start justify-center overflow-y-auto p-4" onClick={() => setSelectedDay(null)}>
            <div className="bg-charcoal border border-smoke rounded-xl max-w-lg w-full my-8 p-6" onClick={(ev) => ev.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white">{niceDate(selectedDay)}</h3>
                <button onClick={() => setSelectedDay(null)} className="text-ivory/50 hover:text-white text-2xl leading-none">×</button>
              </div>
              {(() => {
                const e = state.days[selectedDay]
                return (
                  <div className="space-y-4">
                    {e.topPriority && (
                      <div>
                        <p className="text-[10px] text-gold uppercase tracking-wider mb-1">Top Priority</p>
                        <p className="text-white text-sm font-semibold">{e.topPriority}</p>
                      </div>
                    )}
                    {ALL_SECTIONS.map((s) => {
                      const st = getStatus(e, s.key)
                      const notes = getNotesFor(e, s.key)
                      if (!st && !notes) return null
                      return (
                        <div key={s.key}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white text-sm font-semibold">{s.title}</span>
                            {st && <span className={`text-[10px] font-semibold ${STATUS_META[st as Exclude<Status, ''>].text}`}>{STATUS_META[st as Exclude<Status, ''>].label}</span>}
                          </div>
                          {notes && <p className="text-ivory/60 text-xs">{notes}</p>}
                        </div>
                      )
                    })}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <MiniStat label="DMs" value={e.marketing?.dmsSent || 0} />
                      <MiniStat label="Replies" value={e.marketing?.replies || 0} />
                      <MiniStat label="Clicks" value={e.marketing?.linkClicks || 0} />
                    </div>
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
    </div>
  )
}

function PillarTile({ sec, day, onClick }: { sec: SectionMeta; day: DayEntry; onClick: () => void }) {
  const st = getStatus(day, sec.key)
  const notes = getNotesFor(day, sec.key)
  return (
    <button onClick={onClick} className="bg-charcoal rounded-xl border border-smoke hover:border-gold/40 p-4 text-left transition-colors">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-10 h-10 shrink-0 rounded-full bg-obsidian border border-gold/40 flex items-center justify-center text-gold">
          <sec.Icon className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <p className="text-white text-sm font-semibold leading-tight truncate">{sec.title.replace(/^\d\.\s*/, '')}</p>
          {st ? (
            <span className={`text-[10px] font-semibold ${STATUS_META[st as Exclude<Status, ''>].text}`}>{STATUS_META[st as Exclude<Status, ''>].label}</span>
          ) : (
            <span className="text-[10px] text-ivory/30">Set status →</span>
          )}
        </div>
      </div>
      {notes && <p className="text-ivory/50 text-xs truncate">{notes}</p>}
    </button>
  )
}

// Fortune-500-style Weekly Business Review — read-only, meant to be
// screen-shared or screenshotted and sent to the team. Aggregates the
// Mon–Sun week containing `anchorKey` across every logged day.
function WeeklyOverviewTab({ state, anchorKey }: { state: State; anchorKey: string }) {
  const wk = weekDates(anchorKey)
  const rangeLabel = `${shortDate(wk[0])} – ${shortDate(wk[6])}`

  const pillarRollups = ALL_SECTIONS.map((s) => {
    const entries = wk.map((d) => ({ d, status: getStatus(state.days[d], s.key), notes: getNotesFor(state.days[d], s.key) }))
    let overall: Status = ''
    if (entries.some((e) => e.status === 'needs-attention')) overall = 'needs-attention'
    else if (entries.some((e) => e.status === 'on-track')) overall = 'on-track'
    else if (entries.some((e) => e.status)) overall = 'not-active'
    return { sec: s, entries, overall, notesList: entries.filter((e) => e.notes) }
  })

  const marketing = wk.reduce(
    (acc, d) => {
      const m = state.days[d]?.marketing
      if (!m) return acc
      return { dmsSent: acc.dmsSent + (m.dmsSent || 0), replies: acc.replies + (m.replies || 0), linkClicks: acc.linkClicks + (m.linkClicks || 0) }
    },
    { dmsSent: 0, replies: 0, linkClicks: 0 }
  )
  const replyRate = marketing.dmsSent > 0 ? Math.round((marketing.replies / marketing.dmsSent) * 100) : 0
  const clickRate = marketing.replies > 0 ? Math.round((marketing.linkClicks / marketing.replies) * 100) : 0

  let revenueSum = 0, revenueHasData = false, cashOnHand = ''
  const financialNotes: { day: string; text: string }[] = []
  wk.forEach((d) => {
    const f = state.days[d]?.financials
    if (!f) return
    if (f.revenue) {
      const n = Number(f.revenue.replace(/[^0-9.-]/g, ''))
      if (!isNaN(n)) { revenueSum += n; revenueHasData = true }
    }
    if (f.cashOnHand) cashOnHand = f.cashOnHand
    if (f.notes) financialNotes.push({ day: shortDayLabel(d), text: f.notes })
  })

  const topPriorities = wk.filter((d) => state.days[d]?.topPriority).map((d) => ({ day: shortDayLabel(d), text: state.days[d]!.topPriority }))

  let itemsTotal = 0, itemsDone = 0
  const openItems: { day: string; text: string }[] = []
  wk.forEach((d) => {
    const items = state.days[d]?.actionItems || []
    items.forEach((it) => {
      itemsTotal++
      if (it.done) itemsDone++
      else openItems.push({ day: shortDayLabel(d), text: it.text })
    })
  })

  return (
    <div className="space-y-5">
      <div className="bg-charcoal rounded-xl border border-smoke p-6">
        <p className="text-gold text-xs uppercase tracking-wider mb-1">Life-Up Ventures — Weekly Business Review</p>
        <h2 className="text-white text-xl font-bold mb-1">Week of {rangeLabel}</h2>
        <p className="text-ivory/40 text-xs">Prepared for department review · {itemsDone}/{itemsTotal} action items closed this week</p>
      </div>

      {/* EXECUTIVE SUMMARY — RAG status per pillar at a glance */}
      <div className="bg-charcoal rounded-xl border border-smoke p-6">
        <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Executive Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {pillarRollups.map(({ sec, overall }) => (
            <div key={sec.key} className="bg-obsidian rounded-lg border border-smoke p-3 flex items-center gap-2.5">
              <span className="w-8 h-8 shrink-0 rounded-full bg-charcoal border border-gold/40 flex items-center justify-center text-gold">
                <sec.Icon className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold truncate">{sec.title.replace(/^\d\.\s*/, '')}</p>
                {overall ? (
                  <span className={`text-[10px] font-semibold ${STATUS_META[overall as Exclude<Status, ''>].text}`}>{STATUS_META[overall as Exclude<Status, ''>].label}</span>
                ) : (
                  <span className="text-[10px] text-ivory/30">Not reported</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PER-DEPARTMENT DETAIL — day-by-day strip + notes rollup */}
      <div className="bg-charcoal rounded-xl border border-smoke p-6 space-y-5">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Department Detail</h3>
        {pillarRollups.map(({ sec, entries, notesList }) => (
          <div key={sec.key} className="pb-5 border-b border-smoke last:border-0 last:pb-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-7 h-7 shrink-0 rounded-full bg-obsidian border border-gold/30 flex items-center justify-center text-gold">
                <sec.Icon className="w-3.5 h-3.5" />
              </span>
              <span className="text-white text-sm font-semibold">{sec.title.replace(/^\d\.\s*/, '')}</span>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {entries.map((e) => (
                <div key={e.d} className="text-center">
                  <div className="text-[9px] text-ivory/30 uppercase mb-1">{shortDayLabel(e.d)[0]}</div>
                  <div className={`w-full h-1.5 rounded-full ${e.status ? SUMMARY_DOT[e.status === 'needs-attention' ? 'flagged' : e.status === 'on-track' ? 'ontrack' : 'logged'] : 'bg-ivory/10'}`} />
                </div>
              ))}
            </div>
            {notesList.length > 0 ? (
              <div className="space-y-1">
                {notesList.map((n) => (
                  <p key={n.d} className="text-ivory/60 text-xs"><span className="text-gold">{shortDayLabel(n.d)}:</span> {n.notes}</p>
                ))}
              </div>
            ) : (
              <p className="text-ivory/30 text-xs">No notes logged this week.</p>
            )}
          </div>
        ))}
      </div>

      {/* WEEKLY KPIs */}
      <div className="bg-charcoal rounded-xl border border-smoke p-6">
        <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Marketing — Weekly Totals</h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          <MiniStat label="DMs Sent" value={marketing.dmsSent} />
          <MiniStat label="Replies" value={marketing.replies} />
          <MiniStat label="Link Clicks" value={marketing.linkClicks} />
          <MiniStat label="Reply Rate %" value={replyRate} />
          <MiniStat label="Click Rate %" value={clickRate} />
        </div>
      </div>

      <div className="bg-charcoal rounded-xl border border-smoke p-6">
        <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Financials — Weekly</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-obsidian rounded-lg border border-smoke p-3">
            <div className="text-lg font-bold text-white">{revenueHasData ? `$${revenueSum.toLocaleString()}` : '—'}</div>
            <div className="text-[9px] text-ivory/50 uppercase tracking-wide">Revenue this week</div>
          </div>
          <div className="bg-obsidian rounded-lg border border-smoke p-3">
            <div className="text-lg font-bold text-white">{cashOnHand || '—'}</div>
            <div className="text-[9px] text-ivory/50 uppercase tracking-wide">Latest cash on hand</div>
          </div>
        </div>
        {financialNotes.length > 0 && (
          <div className="space-y-1">
            {financialNotes.map((n, i) => (
              <p key={i} className="text-ivory/60 text-xs"><span className="text-gold">{n.day}:</span> {n.text}</p>
            ))}
          </div>
        )}
      </div>

      {topPriorities.length > 0 && (
        <div className="bg-charcoal rounded-xl border border-smoke p-6">
          <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Top Priorities Logged</h3>
          <div className="space-y-1.5">
            {topPriorities.map((p, i) => (
              <p key={i} className="text-sm"><span className="text-gold font-semibold">{p.day}:</span> <span className="text-ivory/80">{p.text}</span></p>
            ))}
          </div>
        </div>
      )}

      {openItems.length > 0 && (
        <div className="bg-charcoal rounded-xl border border-smoke p-6">
          <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Open Action Items Carrying Forward</h3>
          <div className="space-y-1.5">
            {openItems.map((it, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-ivory/30">○</span>
                <span className="text-ivory/80">{it.text}</span>
                <span className="text-ivory/30 text-xs">({it.day})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-ivory/30 text-[11px] text-center">Screenshot or share your screen on this tab to send the team a clean weekly review — no editing controls, read-only.</p>
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
