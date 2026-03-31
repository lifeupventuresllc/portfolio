'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type FunnelStep = {
  label: string
  count: number
  color: string
}

type SourceData = {
  source: string
  count: number
}

type DailyMetric = {
  date: string
  page_views: number
  checkouts: number
  signups: number
  purchases: number
}

export default function TrafficAnalytics() {
  const [funnel, setFunnel] = useState<FunnelStep[]>([])
  const [sources, setSources] = useState<SourceData[]>([])
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState(30)

  useEffect(() => {
    loadData()
  }, [dateRange])

  async function loadData() {
    setLoading(true)
    const supabase = createClient()
    const since = new Date()
    since.setDate(since.getDate() - dateRange)
    const sinceStr = since.toISOString()

    // Fetch all events in range
    const { data: events } = await supabase
      .from('events')
      .select('event_type, metadata, created_at')
      .gte('created_at', sinceStr)
      .order('created_at', { ascending: true })

    const allEvents = events || []

    // Funnel steps
    const pageViews = allEvents.filter(e => e.event_type === 'page_view_landing' || e.event_type === 'page_view').length
    const funnelViews = allEvents.filter(e => e.event_type === 'funnel_view' || e.event_type === 'page_view_funnel').length
    const checkouts = allEvents.filter(e => e.event_type === 'checkout_started').length
    const purchases = allEvents.filter(e => e.event_type === 'purchase' || e.event_type === 'purchase_completed').length
    const funnelSubmits = allEvents.filter(e => e.event_type === 'funnel_submit' || e.event_type === 'funnel_lead_captured').length

    setFunnel([
      { label: 'Page Views', count: pageViews || funnelViews || allEvents.length, color: '#C9A84C' },
      { label: 'Funnel Views', count: funnelViews || funnelSubmits, color: '#D4C5A0' },
      { label: 'Lead Captured', count: funnelSubmits, color: '#C9A84C' },
      { label: 'Checkouts', count: checkouts, color: '#D4C5A0' },
      { label: 'Purchases', count: purchases, color: '#C9A84C' },
    ])

    // Source breakdown (from metadata.source or event_type patterns)
    const sourceMap: Record<string, number> = {}
    for (const e of allEvents) {
      const meta = e.metadata as Record<string, string> | null
      let src = meta?.source || meta?.referrer || 'direct'

      // Classify by event type pattern
      if (e.event_type.includes('funnel')) src = meta?.source || 'funnel'
      if (e.event_type.includes('landing')) src = meta?.source || 'landing'

      // Normalize
      if (src.includes('instagram')) src = 'Instagram'
      else if (src.includes('tiktok')) src = 'TikTok'
      else if (src.includes('google')) src = 'Google'
      else if (src.includes('facebook')) src = 'Facebook'
      else if (src === 'direct' || src === '') src = 'Direct'
      else src = src.charAt(0).toUpperCase() + src.slice(1)

      sourceMap[src] = (sourceMap[src] || 0) + 1
    }

    const sortedSources = Object.entries(sourceMap)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)

    setSources(sortedSources)

    // Daily metrics (group events by day)
    const dailyMap: Record<string, DailyMetric> = {}
    for (const e of allEvents) {
      const day = e.created_at.split('T')[0]
      if (!dailyMap[day]) dailyMap[day] = { date: day, page_views: 0, checkouts: 0, signups: 0, purchases: 0 }
      if (e.event_type.includes('view') || e.event_type.includes('landing')) dailyMap[day].page_views++
      if (e.event_type === 'checkout_started') dailyMap[day].checkouts++
      if (e.event_type.includes('signup')) dailyMap[day].signups++
      if (e.event_type.includes('purchase')) dailyMap[day].purchases++
    }
    setDailyMetrics(Object.values(dailyMap).slice(-14))

    setLoading(false)
  }

  const maxFunnel = Math.max(...funnel.map(f => f.count), 1)
  const maxSource = Math.max(...sources.map(s => s.count), 1)

  if (loading) {
    return <div style={{ color: '#D4C5A0', padding: 40, textAlign: 'center' }}>Loading analytics...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Date Range Selector */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {[7, 14, 30, 90].map(d => (
          <button
            key={d}
            onClick={() => setDateRange(d)}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: `1px solid ${dateRange === d ? '#C9A84C' : '#2A2A35'}`,
              background: dateRange === d ? 'rgba(201,168,76,0.15)' : '#1A1A22',
              color: dateRange === d ? '#C9A84C' : '#D4C5A0',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {d}d
          </button>
        ))}
      </div>

      {/* Conversion Funnel */}
      <div style={{ background: '#1A1A22', border: '1px solid #2A2A35', borderRadius: 8, padding: 24 }}>
        <h3 style={{ color: '#C9A84C', fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Conversion Funnel</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {funnel.map((step, i) => {
            const prevCount = i > 0 ? funnel[i - 1].count : step.count
            const dropOff = prevCount > 0 && i > 0 ? ((1 - step.count / prevCount) * 100).toFixed(0) : null
            return (
              <div key={step.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#F5F5F5', fontSize: 13 }}>{step.label}</span>
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {dropOff && parseInt(dropOff) > 0 && (
                      <span style={{ color: '#ef4444', fontSize: 11 }}>-{dropOff}%</span>
                    )}
                    <span style={{ color: '#C9A84C', fontSize: 13, fontWeight: 600 }}>{step.count}</span>
                  </span>
                </div>
                <div style={{ height: 8, background: '#0A0A0F', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(step.count / maxFunnel) * 100}%`,
                      background: step.color,
                      borderRadius: 4,
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        {funnel.length > 1 && funnel[0].count > 0 && (
          <div style={{ marginTop: 16, padding: '12px 16px', background: '#0A0A0F', borderRadius: 6, textAlign: 'center' }}>
            <span style={{ color: '#D4C5A0', fontSize: 12 }}>Overall Conversion: </span>
            <span style={{ color: '#C9A84C', fontWeight: 700, fontSize: 16 }}>
              {((funnel[funnel.length - 1].count / funnel[0].count) * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Traffic Sources */}
      <div style={{ background: '#1A1A22', border: '1px solid #2A2A35', borderRadius: 8, padding: 24 }}>
        <h3 style={{ color: '#C9A84C', fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Traffic Sources</h3>
        {sources.length === 0 ? (
          <p style={{ color: '#D4C5A0', fontSize: 13 }}>No traffic data yet. Events will appear as visitors interact with the site.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sources.map(s => (
              <div key={s.source}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#F5F5F5', fontSize: 13 }}>{s.source}</span>
                  <span style={{ color: '#C9A84C', fontSize: 13, fontWeight: 600 }}>{s.count}</span>
                </div>
                <div style={{ height: 6, background: '#0A0A0F', borderRadius: 3, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(s.count / maxSource) * 100}%`,
                      background: '#C9A84C',
                      borderRadius: 3,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Daily Activity Chart */}
      <div style={{ background: '#1A1A22', border: '1px solid #2A2A35', borderRadius: 8, padding: 24 }}>
        <h3 style={{ color: '#C9A84C', fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Daily Activity (Last 14 Days)</h3>
        {dailyMetrics.length === 0 ? (
          <p style={{ color: '#D4C5A0', fontSize: 13 }}>No daily data yet.</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
            {dailyMetrics.map((d, i) => {
              const maxVal = Math.max(...dailyMetrics.map(m => m.page_views), 1)
              const isToday = i === dailyMetrics.length - 1
              return (
                <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: '#D4C5A0', fontSize: 10 }}>{d.page_views}</span>
                  <div
                    style={{
                      width: '100%',
                      height: `${(d.page_views / maxVal) * 80}px`,
                      minHeight: 4,
                      background: isToday ? '#C9A84C' : '#2A2A35',
                      borderRadius: 3,
                    }}
                  />
                  <span style={{ color: isToday ? '#C9A84C' : '#D4C5A0', fontSize: 9 }}>
                    {new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
