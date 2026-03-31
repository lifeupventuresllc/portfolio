'use client'

import { useState, useEffect, useCallback } from 'react'

type OutreachEntry = {
  id: string
  date: string
  platform: string
  dms_sent: number
  responses_received: number
  meetings_booked: number
  deals_closed: number
  notes: string | null
  created_at: string
}

const PLATFORMS = ['Instagram', 'TikTok', 'Facebook', 'LinkedIn', 'Email'] as const

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: 'bg-pink-500/20 text-pink-400',
  TikTok: 'bg-purple-500/20 text-purple-400',
  Facebook: 'bg-blue-600/20 text-blue-300',
  LinkedIn: 'bg-blue-700/20 text-blue-300',
  Email: 'bg-emerald-500/20 text-emerald-400',
}

export default function OutreachTracker() {
  const today = new Date().toISOString().split('T')[0]
  const [entries, setEntries] = useState<OutreachEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Quick-add state
  const [quickPlatform, setQuickPlatform] = useState<string>('Instagram')

  // Form state
  const [formPlatform, setFormPlatform] = useState<string>('Instagram')
  const [formDms, setFormDms] = useState('')
  const [formResponses, setFormResponses] = useState('')
  const [formMeetings, setFormMeetings] = useState('')
  const [formDeals, setFormDeals] = useState('')
  const [formNotes, setFormNotes] = useState('')

  const GOAL = 25

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/outreach-tracker?days=7')
      if (!res.ok) throw new Error('Failed to load outreach data')
      const data = await res.json()
      setEntries(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Today's totals
  const todayEntries = entries.filter(e => e.date === today)
  const todayDms = todayEntries.reduce((s, e) => s + e.dms_sent, 0)
  const progress = Math.min((todayDms / GOAL) * 100, 100)

  // Weekly totals
  const weeklyTotals = (() => {
    const days: Record<string, { dms: number; responses: number; meetings: number; deals: number }> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      days[key] = { dms: 0, responses: 0, meetings: 0, deals: 0 }
    }
    for (const e of entries) {
      if (days[e.date]) {
        days[e.date].dms += e.dms_sent
        days[e.date].responses += e.responses_received
        days[e.date].meetings += e.meetings_booked
        days[e.date].deals += e.deals_closed
      }
    }
    return Object.entries(days).map(([date, vals]) => ({ date, ...vals }))
  })()

  const maxDms = Math.max(...weeklyTotals.map(d => d.dms), 1)

  // Conversion metrics
  const totalDms = entries.reduce((s, e) => s + e.dms_sent, 0)
  const totalResponses = entries.reduce((s, e) => s + e.responses_received, 0)
  const totalMeetings = entries.reduce((s, e) => s + e.meetings_booked, 0)
  const totalDeals = entries.reduce((s, e) => s + e.deals_closed, 0)

  const responseRate = totalDms > 0 ? ((totalResponses / totalDms) * 100).toFixed(1) : '0.0'
  const meetingRate = totalResponses > 0 ? ((totalMeetings / totalResponses) * 100).toFixed(1) : '0.0'
  const closeRate = totalMeetings > 0 ? ((totalDeals / totalMeetings) * 100).toFixed(1) : '0.0'

  async function quickAdd(amount: number) {
    setError(null)
    setSuccess(null)
    try {
      // Check if there's an existing entry for today + platform
      const existing = todayEntries.find(e => e.platform === quickPlatform)
      if (existing) {
        const res = await fetch('/api/admin/outreach-tracker', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: existing.id, dms_sent: existing.dms_sent + amount }),
        })
        if (!res.ok) throw new Error('Failed to update')
      } else {
        const res = await fetch('/api/admin/outreach-tracker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: today, platform: quickPlatform, dms_sent: amount }),
        })
        if (!res.ok) throw new Error('Failed to save')
      }
      await fetchData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed'
      setError(msg)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/admin/outreach-tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today,
          platform: formPlatform,
          dms_sent: parseInt(formDms) || 0,
          responses_received: parseInt(formResponses) || 0,
          meetings_booked: parseInt(formMeetings) || 0,
          deals_closed: parseInt(formDeals) || 0,
          notes: formNotes || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to log entry')

      setFormDms('')
      setFormResponses('')
      setFormMeetings('')
      setFormDeals('')
      setFormNotes('')
      setSuccess('Entry logged successfully!')
      await fetchData()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-40 bg-smoke rounded-xl" />
        <div className="h-60 bg-smoke rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Daily Goal Section */}
      <div className="bg-charcoal rounded-xl border border-smoke p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Daily DM Goal</h2>
            <p className="text-xs text-ivory/40">{today}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            todayDms >= GOAL ? 'bg-emerald-500/20 text-emerald-400' :
            todayDms >= 15 ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {todayDms >= GOAL ? 'Goal Reached' : todayDms >= 15 ? 'On Track' : 'Keep Going'}
          </span>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6 mb-4">
          {/* Circular Progress */}
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#1A1A22" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke={progress >= 100 ? '#10b981' : progress >= 60 ? '#C9A84C' : '#eab308'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${progress * 2.64} ${264 - progress * 2.64}`}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-white">{todayDms}</span>
              <span className="text-xs text-ivory/40">/ {GOAL}</span>
            </div>
          </div>

          <div className="flex-1 w-full space-y-3">
            {/* Platform Selector */}
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => setQuickPlatform(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    quickPlatform === p
                      ? 'bg-gold text-obsidian'
                      : 'bg-obsidian border border-smoke text-ivory/50 hover:border-gold hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Quick-add buttons */}
            <div className="flex gap-2">
              {[1, 5, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => quickAdd(n)}
                  className="flex-1 py-2 bg-obsidian border border-smoke rounded-lg text-sm text-white hover:border-gold hover:text-gold transition-colors font-medium"
                >
                  +{n}
                </button>
              ))}
            </div>

            {/* Today by platform */}
            <div className="flex flex-wrap gap-2">
              {todayEntries.map((e) => (
                <span key={e.id} className={`px-2 py-1 rounded-full text-xs font-medium ${PLATFORM_COLORS[e.platform] || 'bg-smoke text-ivory/70'}`}>
                  {e.platform}: {e.dms_sent}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="bg-charcoal rounded-xl border border-smoke p-6">
        <h2 className="text-lg font-semibold text-white mb-4">7-Day Overview</h2>
        <div className="flex items-end gap-2 h-40">
          {weeklyTotals.map((day) => {
            const height = maxDms > 0 ? (day.dms / maxDms) * 100 : 0
            const dayLabel = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })
            const isToday = day.date === today
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-ivory/40">{day.dms}</span>
                <div className="w-full relative" style={{ height: '100px' }}>
                  <div
                    className={`absolute bottom-0 w-full rounded-t-md transition-all duration-300 ${
                      isToday ? 'bg-gold' : 'bg-gold/40'
                    }`}
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                </div>
                <span className={`text-xs ${isToday ? 'text-gold font-semibold' : 'text-ivory/40'}`}>
                  {dayLabel}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Conversion Metrics */}
      <div className="bg-charcoal rounded-xl border border-smoke p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Conversion Funnel (7 days)</h2>

        {/* Rate cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-obsidian rounded-lg p-4 text-center">
            <div className="text-xl font-bold text-white">{responseRate}%</div>
            <div className="text-xs text-ivory/40 mt-1">Response Rate</div>
          </div>
          <div className="bg-obsidian rounded-lg p-4 text-center">
            <div className="text-xl font-bold text-white">{meetingRate}%</div>
            <div className="text-xs text-ivory/40 mt-1">Meeting Rate</div>
          </div>
          <div className="bg-obsidian rounded-lg p-4 text-center">
            <div className="text-xl font-bold text-white">{closeRate}%</div>
            <div className="text-xs text-ivory/40 mt-1">Close Rate</div>
          </div>
        </div>

        {/* Visual funnel */}
        <div className="space-y-2">
          {[
            { label: 'DMs Sent', value: totalDms, color: 'bg-gold' },
            { label: 'Responses', value: totalResponses, color: 'bg-blue-500' },
            { label: 'Meetings', value: totalMeetings, color: 'bg-purple-500' },
            { label: 'Deals Closed', value: totalDeals, color: 'bg-emerald-500' },
          ].map((step, i) => {
            const width = totalDms > 0 ? Math.max((step.value / totalDms) * 100, 4) : 4
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="w-24 text-xs text-ivory/50 text-right">{step.label}</div>
                <div className="flex-1 bg-obsidian rounded-full h-6 overflow-hidden">
                  <div
                    className={`h-full ${step.color} rounded-full flex items-center justify-end pr-2 transition-all duration-500`}
                    style={{ width: `${width}%` }}
                  >
                    <span className="text-xs font-bold text-white">{step.value}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Log Form */}
      <div className="bg-charcoal rounded-xl border border-smoke p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Log Outreach Entry</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs text-ivory/50 mb-1">Platform</label>
              <select
                value={formPlatform}
                onChange={(e) => setFormPlatform(e.target.value)}
                className="w-full px-3 py-2 bg-obsidian border border-smoke rounded-lg text-sm text-white focus:outline-none focus:border-gold"
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-ivory/50 mb-1">DMs Sent</label>
              <input
                type="number"
                value={formDms}
                onChange={(e) => setFormDms(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full px-3 py-2 bg-obsidian border border-smoke rounded-lg text-sm text-white focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-xs text-ivory/50 mb-1">Responses</label>
              <input
                type="number"
                value={formResponses}
                onChange={(e) => setFormResponses(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full px-3 py-2 bg-obsidian border border-smoke rounded-lg text-sm text-white focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-xs text-ivory/50 mb-1">Meetings</label>
              <input
                type="number"
                value={formMeetings}
                onChange={(e) => setFormMeetings(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full px-3 py-2 bg-obsidian border border-smoke rounded-lg text-sm text-white focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-xs text-ivory/50 mb-1">Deals</label>
              <input
                type="number"
                value={formDeals}
                onChange={(e) => setFormDeals(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full px-3 py-2 bg-obsidian border border-smoke rounded-lg text-sm text-white focus:outline-none focus:border-gold"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-ivory/50 mb-1">Notes</label>
            <input
              type="text"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Quick note about today's outreach..."
              className="w-full px-3 py-2 bg-obsidian border border-smoke rounded-lg text-sm text-white focus:outline-none focus:border-gold"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-gold text-obsidian rounded-lg text-sm font-semibold hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving...' : 'Log Entry'}
          </button>
        </form>
      </div>
    </div>
  )
}
