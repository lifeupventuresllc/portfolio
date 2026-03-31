'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import AdminTable from '@/components/AdminTable'
import SimpleChart from '@/components/SimpleChart'
import CsvImporter from '@/components/CsvImporter'
import ProjectBoard from '@/components/ProjectBoard'
import Templates from '@/components/Templates'
import OutreachAnalytics from '@/components/OutreachAnalytics'
import RevenueForecast from '@/components/RevenueForecast'
import IntakeSubmissions from '@/components/IntakeSubmissions'
import ContentSchedule from '@/components/ContentSchedule'
import BroadcastPanel from '@/components/BroadcastPanel'
import OutreachTrackerPanel from '@/components/OutreachTracker'
import { formatCurrency, formatDate } from '@/lib/utils'

type Profile = {
  id: string
  email: string
  role: string
  created_at: string
}

type Purchase = {
  id: string
  user_id: string
  product_id: string
  stripe_payment_intent: string
  amount: number
  status: string
  created_at: string
  profiles?: { email: string }
}

type EmailRecord = {
  id: string
  user_id: string
  email: string
  type: string
  sent_at: string
}

type DailyMetric = {
  date: string
  total_users: number
  total_customers: number
  total_revenue: number
  total_sales: number
  total_refunds: number
}

type Affiliate = {
  id: string
  code: string
  commission_rate: number
  active: boolean
  created_at: string
  profiles?: { email: string }
  referrals?: { id: string; commission_amount: number; status: string }[]
}

type EventRecord = {
  event_type: string
  count: number
}

type KPIs = {
  totalUsers: number
  totalCustomers: number
  totalRevenue: number
  totalSales: number
  totalRefunds: number
  conversionRate: number
  refundRate: number
  retentionRate: number
}

type FunnelLead = {
  id: string
  name: string
  email: string
  service: string
  status: string
  lead_score: number
  follow_up_stage: number
  notes: string | null
  created_at: string
}

type Prospect = {
  id: string
  name: string
  email: string | null
  platform: string
  prospect_type: string
  instagram: string | null
  notes: string | null
  status: string
  touch_count: number
  created_at: string
}

type TabName = 'overview' | 'users' | 'payments' | 'emails' | 'affiliates' | 'leads' | 'outreach' | 'projects' | 'templates' | 'intake' | 'schedule' | 'broadcast' | 'tracker'

function DailyOutreachTracker() {
  const today = new Date().toISOString().split('T')[0]
  const storageKey = `outreach_${today}`

  const [count, setCount] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem(storageKey) || '0', 10)
    }
    return 0
  })

  function updateCount(newCount: number) {
    const val = Math.max(0, newCount)
    setCount(val)
    localStorage.setItem(storageKey, val.toString())
  }

  const goal = 25
  const progress = Math.min((count / goal) * 100, 100)
  const isOnTrack = count >= 15

  return (
    <div className="bg-charcoal rounded-xl border border-smoke p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Daily Outreach</h2>
          <p className="text-xs text-ivory/40">{today}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          isOnTrack ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'
        }`}>
          {isOnTrack ? 'On Track' : 'Keep Going'}
        </span>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => updateCount(count - 1)}
          className="w-10 h-10 rounded-lg bg-obsidian border border-smoke text-white hover:border-gold transition-colors flex items-center justify-center text-lg font-bold"
        >
          -
        </button>
        <div className="text-4xl font-bold text-white flex-1 text-center">
          {count} <span className="text-lg text-ivory/30">/ {goal}</span>
        </div>
        <button
          onClick={() => updateCount(count + 1)}
          className="w-10 h-10 rounded-lg bg-gold text-obsidian hover:bg-gold/90 transition-colors flex items-center justify-center text-lg font-bold"
        >
          +
        </button>
      </div>

      <div className="w-full bg-obsidian rounded-full h-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            progress >= 100 ? 'bg-emerald-500' : progress >= 60 ? 'bg-gold' : 'bg-yellow-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-ivory/30 mt-2 text-center">
        {count >= goal ? 'Goal reached! Keep crushing it.' : `${goal - count} more DMs to hit your daily goal`}
      </p>
    </div>
  )
}

export default function AdminDashboard({ userRole }: { userRole: string }) {
  const supabase = createClient()
  const isAdmin = userRole === 'admin'

  const [activeTab, setActiveTab] = useState<TabName>('overview')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [emailRecords, setEmailRecords] = useState<EmailRecord[]>([])
  const [, setDailyMetrics] = useState<DailyMetric[]>([])
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [funnelData, setFunnelData] = useState<EventRecord[]>([])
  const [kpis, setKpis] = useState<KPIs>({
    totalUsers: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    totalSales: 0,
    totalRefunds: 0,
    conversionRate: 0,
    refundRate: 0,
    retentionRate: 0,
  })
  const [leads, setLeads] = useState<FunnelLead[]>([])
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [leadStatusFilter, setLeadStatusFilter] = useState('all')
  const [prospectStatusFilter, setProspectStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [userSearch, setUserSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [emailTypeFilter, setEmailTypeFilter] = useState<string>('all')

  // Affiliate form
  const [newAffUserId, setNewAffUserId] = useState('')
  const [newAffCode, setNewAffCode] = useState('')
  const [newAffRate, setNewAffRate] = useState('20')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [profilesRes, purchasesRes, emailsRes, metricsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('purchases').select('*, profiles(email)').order('created_at', { ascending: false }),
        supabase.from('emails').select('*').order('sent_at', { ascending: false }),
        supabase.from('daily_metrics').select('*').order('date', { ascending: true }).limit(30),
      ])

      if (profilesRes.error) throw profilesRes.error
      if (purchasesRes.error) throw purchasesRes.error

      const allProfiles = profilesRes.data || []
      const allPurchases = purchasesRes.data || []

      setProfiles(allProfiles)
      setPurchases(allPurchases)
      setEmailRecords(emailsRes.data || [])
      setDailyMetrics(metricsRes.data || [])

      // Compute KPIs
      const totalUsers = allProfiles.length
      const totalCustomers = allProfiles.filter(p => p.role === 'customer').length
      const completedPurchases = allPurchases.filter(p => p.status === 'completed')
      const refundedPurchases = allPurchases.filter(p => p.status === 'refunded')
      const totalRevenue = completedPurchases.reduce((sum, p) => sum + p.amount, 0)
      const totalSales = completedPurchases.length
      const totalRefunds = refundedPurchases.length

      const retentionRate = totalCustomers > 0 || totalRefunds > 0
        ? (totalCustomers / (totalCustomers + totalRefunds)) * 100
        : 0

      setKpis({
        totalUsers,
        totalCustomers,
        totalRevenue,
        totalSales,
        totalRefunds,
        conversionRate: totalUsers > 0 ? (totalSales / totalUsers) * 100 : 0,
        refundRate: totalSales > 0 ? (totalRefunds / (totalSales + totalRefunds)) * 100 : 0,
        retentionRate,
      })

      // Fetch affiliates (admin only)
      if (isAdmin) {
        const affRes = await fetch('/api/admin/affiliates')
        if (affRes.ok) setAffiliates(await affRes.json())
      }

      // Fetch CRM leads
      const leadsRes = await fetch('/api/admin/leads')
      if (leadsRes.ok) setLeads(await leadsRes.json())

      // Fetch outreach prospects
      const prospectsRes = await fetch('/api/admin/prospects')
      if (prospectsRes.ok) setProspects(await prospectsRes.json())

      // Fetch funnel data
      const { data: events } = await supabase
        .from('events')
        .select('event_type')

      if (events) {
        const counts: Record<string, number> = {}
        events.forEach(e => {
          counts[e.event_type] = (counts[e.event_type] || 0) + 1
        })
        setFunnelData(Object.entries(counts).map(([event_type, count]) => ({ event_type, count })))
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load data'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [supabase, isAdmin])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleRefund(purchaseId: string, paymentIntent: string) {
    if (!confirm('Are you sure you want to refund this purchase?')) return

    try {
      const response = await fetch('/api/admin/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId, paymentIntent }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Refund failed')
      }

      await fetchData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Refund failed'
      alert(msg)
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error
      await fetchData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update role'
      alert(msg)
    }
  }

  async function handleCreateAffiliate(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch('/api/admin/affiliates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: newAffUserId, code: newAffCode, commissionRate: parseInt(newAffRate) }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create affiliate')
      }
      setNewAffUserId('')
      setNewAffCode('')
      setNewAffRate('20')
      await fetchData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed'
      alert(msg)
    }
  }

  async function handleDeactivateAffiliate(id: string) {
    if (!confirm('Deactivate this affiliate?')) return
    await fetch('/api/admin/affiliates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    await fetchData()
  }

  // Apply filters
  const filteredProfiles = profiles.filter(p => {
    if (userSearch && !p.email.toLowerCase().includes(userSearch.toLowerCase())) return false
    if (roleFilter !== 'all' && p.role !== roleFilter) return false
    return true
  })

  const filteredPurchases = purchases.filter(p => {
    if (paymentStatusFilter !== 'all' && p.status !== paymentStatusFilter) return false
    if (dateFrom && new Date(p.created_at) < new Date(dateFrom)) return false
    if (dateTo && new Date(p.created_at) > new Date(dateTo + 'T23:59:59')) return false
    return true
  })

  const filteredEmails = emailRecords.filter(e => {
    if (emailTypeFilter !== 'all' && e.type !== emailTypeFilter) return false
    return true
  })

  const filteredRevenue = filteredPurchases
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0)

  // Chart data
  const signupsByDay = (() => {
    const last14 = profiles
      .map(p => p.created_at.split('T')[0])
      .reduce((acc: Record<string, number>, d) => { acc[d] = (acc[d] || 0) + 1; return acc }, {})
    return Object.entries(last14)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([label, value]) => ({ label: label.slice(5), value }))
  })()

  const revenueByDay = (() => {
    const byDay = purchases
      .filter(p => p.status === 'completed')
      .reduce((acc: Record<string, number>, p) => {
        const d = p.created_at.split('T')[0]
        acc[d] = (acc[d] || 0) + p.amount
        return acc
      }, {})
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([label, value]) => ({ label: label.slice(5), value }))
  })()

  async function handleLeadStatusChange(id: string, status: string) {
    await fetch('/api/admin/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    await fetchData()
  }

  async function handleProspectStatusChange(id: string, status: string) {
    await fetch('/api/admin/prospects', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    await fetchData()
  }

  const filteredLeads = leads.filter(l =>
    leadStatusFilter === 'all' || l.status === leadStatusFilter
  )

  const filteredProspects = prospects.filter(p =>
    prospectStatusFilter === 'all' || p.status === prospectStatusFilter
  )

  const tabs: TabName[] = isAdmin
    ? ['overview', 'schedule', 'leads', 'outreach', 'broadcast', 'tracker', 'projects', 'intake', 'templates', 'users', 'payments', 'emails', 'affiliates']
    : ['overview', 'schedule', 'leads', 'outreach', 'projects', 'intake', 'templates', 'users', 'payments', 'emails']

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-smoke rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-smoke rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        {!isAdmin && (
          <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium">
            Support View (Read Only)
          </span>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-charcoal rounded-xl border border-smoke p-5">
          <div className="text-sm text-ivory/50">Total Users</div>
          <div className="text-2xl font-bold text-white mt-1">{kpis.totalUsers}</div>
        </div>
        <div className="bg-charcoal rounded-xl border border-smoke p-5">
          <div className="text-sm text-ivory/50">Total Sales</div>
          <div className="text-2xl font-bold text-white mt-1">{kpis.totalSales}</div>
        </div>
        <div className="bg-charcoal rounded-xl border border-smoke p-5">
          <div className="text-sm text-ivory/50">Total Revenue</div>
          <div className="text-2xl font-bold text-white mt-1">{formatCurrency(kpis.totalRevenue)}</div>
        </div>
        <div className="bg-charcoal rounded-xl border border-smoke p-5">
          <div className="text-sm text-ivory/50">Conversion Rate</div>
          <div className="text-2xl font-bold text-white mt-1">{kpis.conversionRate.toFixed(1)}%</div>
        </div>
        <div className="bg-charcoal rounded-xl border border-smoke p-5">
          <div className="text-sm text-ivory/50">Customers</div>
          <div className="text-2xl font-bold text-white mt-1">{kpis.totalCustomers}</div>
        </div>
        <div className="bg-charcoal rounded-xl border border-smoke p-5">
          <div className="text-sm text-ivory/50">Refunds</div>
          <div className="text-2xl font-bold text-white mt-1">{kpis.totalRefunds}</div>
        </div>
        <div className="bg-charcoal rounded-xl border border-smoke p-5">
          <div className="text-sm text-ivory/50">Refund Rate</div>
          <div className="text-2xl font-bold text-white mt-1">{kpis.refundRate.toFixed(1)}%</div>
        </div>
        <div className="bg-charcoal rounded-xl border border-smoke p-5">
          <div className="text-sm text-ivory/50">Retention Rate</div>
          <div className="text-2xl font-bold text-white mt-1">{kpis.retentionRate.toFixed(1)}%</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-smoke mb-6 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'border-gold text-white'
                : 'border-transparent text-ivory/50 hover:text-ivory/70'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Daily Outreach Tracker */}
          <DailyOutreachTracker />

          {/* Outreach Analytics */}
          <OutreachAnalytics prospects={prospects} />

          {/* Revenue Forecast */}
          <RevenueForecast purchases={purchases} leads={leads} prospects={prospects} />

          {/* Trends */}
          <div className="grid md:grid-cols-2 gap-6">
            <SimpleChart
              data={signupsByDay}
              title="Signups (Last 14 Days)"
            />
            <SimpleChart
              data={revenueByDay}
              title="Revenue (Last 14 Days)"
              formatValue={(v) => formatCurrency(v)}
            />
          </div>

          {/* Funnel */}
          {funnelData.length > 0 && (
            <div className="bg-charcoal rounded-xl border border-smoke p-6">
              <h2 className="text-lg font-semibold mb-4">Funnel</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Page Views', key: 'page_view_landing' },
                  { label: 'Checkouts Started', key: 'checkout_started' },
                  { label: 'Signups', type: 'profiles' },
                  { label: 'Purchases', type: 'purchases' },
                ].map((step, i) => {
                  let count = 0
                  if (step.type === 'profiles') count = kpis.totalUsers
                  else if (step.type === 'purchases') count = kpis.totalSales
                  else count = funnelData.find(f => f.event_type === step.key)?.count || 0
                  return (
                    <div key={i} className="text-center p-4 bg-obsidian rounded-xl">
                      <div className="text-2xl font-bold text-white">{count}</div>
                      <div className="text-xs text-ivory/50 mt-1">{step.label}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recent Signups */}
          <div className="bg-charcoal rounded-xl border border-smoke p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Signups</h2>
            <AdminTable
              columns={[
                { key: 'email', label: 'Email' },
                { key: 'role', label: 'Role', render: (item) => (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    item.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                    item.role === 'support' ? 'bg-yellow-500/20 text-yellow-400' :
                    item.role === 'customer' ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-smoke text-ivory/70'
                  }`}>{item.role}</span>
                )},
                { key: 'created_at', label: 'Joined', render: (item) => formatDate(item.created_at) },
              ]}
              data={profiles.slice(0, 5)}
              emptyMessage="No users yet"
            />
          </div>

          {/* Recent Payments */}
          <div className="bg-charcoal rounded-xl border border-smoke p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Payments</h2>
            <AdminTable
              columns={[
                { key: 'email', label: 'Customer', render: (item) => item.profiles?.email || 'Unknown' },
                { key: 'amount', label: 'Amount', render: (item) => formatCurrency(item.amount) },
                { key: 'status', label: 'Status', render: (item) => (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    item.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                    item.status === 'refunded' ? 'bg-red-500/20 text-red-400' :
                    item.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>{item.status}</span>
                )},
                { key: 'created_at', label: 'Date', render: (item) => formatDate(item.created_at) },
              ]}
              data={purchases.slice(0, 5)}
              emptyMessage="No payments yet"
            />
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-charcoal rounded-xl border border-smoke p-6">
          <div className="flex flex-wrap gap-4 mb-6">
            <input
              type="text"
              placeholder="Search by email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="px-3 py-2 border border-smoke rounded-lg text-sm focus:outline-none focus:border-gold"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-smoke rounded-lg text-sm focus:outline-none focus:border-gold"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="support">Support</option>
              <option value="customer">Customer</option>
              <option value="free">Free</option>
            </select>
          </div>

          <AdminTable
            columns={[
              { key: 'email', label: 'Email' },
              { key: 'role', label: 'Role', render: (item) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  item.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                  item.role === 'support' ? 'bg-yellow-500/20 text-yellow-400' :
                  item.role === 'customer' ? 'bg-emerald-500/20 text-emerald-400' :
                  'bg-smoke text-ivory/70'
                }`}>{item.role}</span>
              )},
              { key: 'created_at', label: 'Joined', render: (item) => formatDate(item.created_at) },
              ...(isAdmin ? [{
                key: 'actions', label: 'Actions', render: (item: Profile) => (
                  <select
                    value={item.role}
                    onChange={(e) => handleRoleChange(item.id, e.target.value)}
                    className="text-xs border border-smoke rounded px-2 py-1"
                  >
                    <option value="free">Free</option>
                    <option value="customer">Customer</option>
                    <option value="support">Support</option>
                    <option value="admin">Admin</option>
                  </select>
                ),
              }] : []),
            ]}
            data={filteredProfiles}
            emptyMessage="No users found"
          />
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="bg-charcoal rounded-xl border border-smoke p-6">
          <div className="flex flex-wrap gap-4 mb-6">
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="px-3 py-2 border border-smoke rounded-lg text-sm focus:outline-none focus:border-gold"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="refunded">Refunded</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-smoke rounded-lg text-sm"
              placeholder="From"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-smoke rounded-lg text-sm"
              placeholder="To"
            />
            {(dateFrom || dateTo) && (
              <div className="text-sm text-ivory/50 self-center">
                Filtered revenue: <strong>{formatCurrency(filteredRevenue)}</strong>
              </div>
            )}
          </div>

          <AdminTable
            columns={[
              { key: 'email', label: 'Customer', render: (item) => item.profiles?.email || 'Unknown' },
              { key: 'amount', label: 'Amount', render: (item) => formatCurrency(item.amount) },
              { key: 'status', label: 'Status', render: (item) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  item.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                  item.status === 'refunded' ? 'bg-red-500/20 text-red-400' :
                  item.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>{item.status}</span>
              )},
              { key: 'created_at', label: 'Date', render: (item) => formatDate(item.created_at) },
              ...(isAdmin ? [{
                key: 'actions', label: 'Actions', render: (item: Purchase) => (
                  item.status === 'completed' ? (
                    <button
                      onClick={() => handleRefund(item.id, item.stripe_payment_intent)}
                      className="text-xs text-red-600 hover:text-red-800 font-medium"
                    >
                      Refund
                    </button>
                  ) : null
                ),
              }] : []),
            ]}
            data={filteredPurchases}
            emptyMessage="No payments found"
          />
        </div>
      )}

      {/* Emails Tab (CRM) */}
      {activeTab === 'emails' && (
        <div className="bg-charcoal rounded-xl border border-smoke p-6">
          <div className="flex flex-wrap gap-4 mb-6">
            <select
              value={emailTypeFilter}
              onChange={(e) => setEmailTypeFilter(e.target.value)}
              className="px-3 py-2 border border-smoke rounded-lg text-sm focus:outline-none focus:border-gold"
            >
              <option value="all">All Types</option>
              <option value="signup">Signup</option>
              <option value="welcome">Welcome</option>
              <option value="purchase">Purchase</option>
              <option value="refund">Refund</option>
              <option value="onboarding_day3">Onboarding Day 3</option>
              <option value="onboarding_day7">Onboarding Day 7</option>
            </select>
            <span className="text-sm text-ivory/50 self-center">
              {filteredEmails.length} email{filteredEmails.length !== 1 ? 's' : ''}
            </span>
          </div>

          <AdminTable
            columns={[
              { key: 'email', label: 'Recipient' },
              { key: 'type', label: 'Type', render: (item) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  item.type === 'purchase' ? 'bg-emerald-500/20 text-emerald-400' :
                  item.type === 'refund' ? 'bg-red-500/20 text-red-400' :
                  item.type === 'welcome' ? 'bg-blue-500/20 text-blue-400' :
                  item.type.startsWith('onboarding') ? 'bg-purple-500/20 text-purple-400' :
                  'bg-smoke text-ivory/70'
                }`}>{item.type}</span>
              )},
              { key: 'sent_at', label: 'Sent', render: (item) => formatDate(item.sent_at) },
            ]}
            data={filteredEmails}
            emptyMessage="No emails sent yet"
          />
        </div>
      )}

      {/* CRM Leads Tab */}
      {activeTab === 'leads' && (
        <div className="space-y-6">
          {/* Lead Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {['new', 'contacted', 'qualified', 'converted', 'lost'].map(status => (
              <div key={status} className="bg-charcoal rounded-xl border border-smoke p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {leads.filter(l => l.status === status).length}
                </div>
                <div className="text-xs text-ivory/50 capitalize mt-1">{status}</div>
              </div>
            ))}
          </div>

          <div className="bg-charcoal rounded-xl border border-smoke p-6">
            <div className="flex flex-wrap gap-4 mb-6">
              <select
                value={leadStatusFilter}
                onChange={(e) => setLeadStatusFilter(e.target.value)}
                className="px-3 py-2 border border-smoke rounded-lg text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="converted">Converted</option>
                <option value="lost">Lost</option>
              </select>
              <span className="text-sm text-ivory/50 self-center">
                {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}
              </span>
            </div>

            <AdminTable
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'email', label: 'Email' },
                { key: 'service', label: 'Service', render: (item) => (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    item.service === 'content' ? 'bg-blue-500/20 text-blue-400' :
                    item.service === 'audio' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>{item.service}</span>
                )},
                { key: 'lead_score', label: 'Score', render: (item) => {
                  const score = item.lead_score || 0
                  const color = score >= 36 ? 'bg-emerald-500/20 text-emerald-400' : score >= 16 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                  const label = score >= 36 ? 'Hot' : score >= 16 ? 'Warm' : 'Cold'
                  return (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
                      {score} {label}
                    </span>
                  )
                }},
                { key: 'status', label: 'Status', render: (item: FunnelLead) => (
                  <select
                    value={item.status}
                    onChange={(e) => handleLeadStatusChange(item.id, e.target.value)}
                    className={`text-xs border rounded px-2 py-1 ${
                      item.status === 'converted' ? 'border-green-300 bg-green-50' :
                      item.status === 'lost' ? 'border-red-300 bg-red-50' :
                      'border-smoke'
                    }`}
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="converted">Converted</option>
                    <option value="lost">Lost</option>
                  </select>
                )},
                { key: 'follow_up_stage', label: 'Follow-Up', render: (item) => (
                  <span className="text-xs text-ivory/50">Stage {item.follow_up_stage || 0}/3</span>
                )},
                { key: 'created_at', label: 'Date', render: (item) => formatDate(item.created_at) },
              ]}
              data={filteredLeads}
              emptyMessage="No leads yet — share your funnel to start capturing leads"
            />
          </div>
        </div>
      )}

      {/* Outreach / SDR Tab */}
      {activeTab === 'outreach' && (
        <div className="space-y-6">
          {/* Prospect Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {['new', 'contacted', 'replied', 'free-sample', 'pitched', 'closed'].map(status => (
              <div key={status} className="bg-charcoal rounded-xl border border-smoke p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {prospects.filter(p => p.status === status).length}
                </div>
                <div className="text-xs text-ivory/50 capitalize mt-1">{status.replace('-', ' ')}</div>
              </div>
            ))}
          </div>

          {/* CSV Import */}
          <CsvImporter onImported={fetchData} />

          <div className="bg-charcoal rounded-xl border border-smoke p-6">
            <div className="flex flex-wrap gap-4 mb-6">
              <select
                value={prospectStatusFilter}
                onChange={(e) => setProspectStatusFilter(e.target.value)}
                className="px-3 py-2 border border-smoke rounded-lg text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="replied">Replied</option>
                <option value="free-sample">Free Sample</option>
                <option value="pitched">Pitched</option>
                <option value="closed">Closed</option>
                <option value="lost">Lost</option>
              </select>
              <span className="text-sm text-ivory/50 self-center">
                {filteredProspects.length} prospect{filteredProspects.length !== 1 ? 's' : ''}
              </span>
            </div>

            <AdminTable
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'email', label: 'Email', render: (item) => item.email || '—' },
                { key: 'platform', label: 'Platform', render: (item) => (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-smoke text-ivory/70 capitalize">
                    {item.platform}
                  </span>
                )},
                { key: 'prospect_type', label: 'Type', render: (item) => (
                  <span className="text-xs capitalize">{item.prospect_type}</span>
                )},
                { key: 'instagram', label: 'IG', render: (item) => item.instagram ? (
                  <a href={`https://instagram.com/${item.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                    {item.instagram}
                  </a>
                ) : '—' },
                { key: 'status', label: 'Status', render: (item: Prospect) => (
                  <select
                    value={item.status}
                    onChange={(e) => handleProspectStatusChange(item.id, e.target.value)}
                    className="text-xs border border-smoke rounded px-2 py-1"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="replied">Replied</option>
                    <option value="free-sample">Free Sample</option>
                    <option value="pitched">Pitched</option>
                    <option value="closed">Closed</option>
                    <option value="lost">Lost</option>
                  </select>
                )},
                { key: 'touch_count', label: 'Touches', render: (item) => item.touch_count },
                { key: 'created_at', label: 'Added', render: (item) => formatDate(item.created_at) },
              ]}
              data={filteredProspects}
              emptyMessage="No prospects yet — add prospects via the API or CSV import"
            />
          </div>
        </div>
      )}

      {/* Projects Tab */}
      {activeTab === 'projects' && <ProjectBoard />}

      {/* Intake Tab */}
      {/* Schedule Tab */}
      {activeTab === 'schedule' && <ContentSchedule />}

      {/* Intake Tab */}
      {activeTab === 'intake' && <IntakeSubmissions />}

      {/* Templates Tab */}
      {activeTab === 'templates' && <Templates />}

      {/* Broadcast Tab (Admin only) */}
      {activeTab === 'broadcast' && isAdmin && <BroadcastPanel />}

      {/* Tracker Tab (Admin only) */}
      {activeTab === 'tracker' && isAdmin && <OutreachTrackerPanel />}

      {/* Affiliates Tab (Admin only) */}
      {activeTab === 'affiliates' && isAdmin && (
        <div className="space-y-6">
          {/* Create Affiliate */}
          <div className="bg-charcoal rounded-xl border border-smoke p-6">
            <h2 className="text-lg font-semibold mb-4">Create Affiliate</h2>
            <form onSubmit={handleCreateAffiliate} className="flex flex-wrap gap-4">
              <select
                value={newAffUserId}
                onChange={(e) => setNewAffUserId(e.target.value)}
                required
                className="px-3 py-2 border border-smoke rounded-lg text-sm"
              >
                <option value="">Select User...</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.email}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Referral code"
                value={newAffCode}
                onChange={(e) => setNewAffCode(e.target.value)}
                required
                className="px-3 py-2 border border-smoke rounded-lg text-sm"
              />
              <input
                type="number"
                placeholder="Commission %"
                value={newAffRate}
                onChange={(e) => setNewAffRate(e.target.value)}
                min="1"
                max="100"
                className="px-3 py-2 border border-smoke rounded-lg text-sm w-28"
              />
              <button
                type="submit"
                className="bg-gold text-obsidian px-4 py-2 rounded-lg text-sm hover:bg-gold/90"
              >
                Create
              </button>
            </form>
          </div>

          {/* Affiliate List */}
          <div className="bg-charcoal rounded-xl border border-smoke p-6">
            <h2 className="text-lg font-semibold mb-4">Affiliates</h2>
            <AdminTable
              columns={[
                { key: 'email', label: 'User', render: (item) => item.profiles?.email || 'Unknown' },
                { key: 'code', label: 'Code', render: (item) => (
                  <code className="text-xs bg-smoke px-2 py-1 rounded">{item.code}</code>
                )},
                { key: 'commission_rate', label: 'Rate', render: (item) => `${item.commission_rate}%` },
                { key: 'referrals', label: 'Referrals', render: (item) => (item.referrals || []).length },
                { key: 'earnings', label: 'Earnings', render: (item) =>
                  formatCurrency((item.referrals || []).reduce((s: number, r: { commission_amount: number }) => s + r.commission_amount, 0))
                },
                { key: 'active', label: 'Status', render: (item) => (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    item.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-smoke text-ivory/70'
                  }`}>{item.active ? 'Active' : 'Inactive'}</span>
                )},
                { key: 'actions', label: '', render: (item) => item.active ? (
                  <button
                    onClick={() => handleDeactivateAffiliate(item.id)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Deactivate
                  </button>
                ) : null },
              ]}
              data={affiliates}
              emptyMessage="No affiliates yet"
            />
          </div>
        </div>
      )}
    </div>
  )
}
