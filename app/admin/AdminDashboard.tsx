'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import AdminTable from '@/components/AdminTable'
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

type KPIs = {
  totalUsers: number
  totalCustomers: number
  totalRevenue: number
  totalSales: number
  totalRefunds: number
  conversionRate: number
  refundRate: number
}

export default function AdminDashboard() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'payments'>('overview')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [kpis, setKpis] = useState<KPIs>({
    totalUsers: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    totalSales: 0,
    totalRefunds: 0,
    conversionRate: 0,
    refundRate: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [userSearch, setUserSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [profilesRes, purchasesRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('purchases').select('*, profiles(email)').order('created_at', { ascending: false }),
      ])

      if (profilesRes.error) throw profilesRes.error
      if (purchasesRes.error) throw purchasesRes.error

      const allProfiles = profilesRes.data || []
      const allPurchases = purchasesRes.data || []

      setProfiles(allProfiles)
      setPurchases(allPurchases)

      // Compute KPIs
      const totalUsers = allProfiles.length
      const totalCustomers = allProfiles.filter(p => p.role === 'customer').length
      const completedPurchases = allPurchases.filter(p => p.status === 'completed')
      const refundedPurchases = allPurchases.filter(p => p.status === 'refunded')
      const totalRevenue = completedPurchases.reduce((sum, p) => sum + p.amount, 0)
      const totalSales = completedPurchases.length
      const totalRefunds = refundedPurchases.length

      setKpis({
        totalUsers,
        totalCustomers,
        totalRevenue,
        totalSales,
        totalRefunds,
        conversionRate: totalUsers > 0 ? (totalSales / totalUsers) * 100 : 0,
        refundRate: totalSales > 0 ? (totalRefunds / (totalSales + totalRefunds)) * 100 : 0,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load data'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [supabase])

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

  const filteredRevenue = filteredPurchases
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0)

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500">Total Users</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{kpis.totalUsers}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500">Total Sales</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{kpis.totalSales}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500">Total Revenue</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(kpis.totalRevenue)}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500">Conversion Rate</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{kpis.conversionRate.toFixed(1)}%</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500">Customers</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{kpis.totalCustomers}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500">Refunds</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{kpis.totalRefunds}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500">Refund Rate</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{kpis.refundRate.toFixed(1)}%</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500">Free Users</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {kpis.totalUsers - kpis.totalCustomers}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {(['overview', 'users', 'payments'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-black text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Signups</h2>
            <AdminTable
              columns={[
                { key: 'email', label: 'Email' },
                { key: 'role', label: 'Role', render: (item) => (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    item.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                    item.role === 'customer' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{item.role}</span>
                )},
                { key: 'created_at', label: 'Joined', render: (item) => formatDate(item.created_at) },
              ]}
              data={profiles.slice(0, 5)}
              emptyMessage="No users yet"
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Payments</h2>
            <AdminTable
              columns={[
                { key: 'email', label: 'Customer', render: (item) => item.profiles?.email || 'Unknown' },
                { key: 'amount', label: 'Amount', render: (item) => formatCurrency(item.amount) },
                { key: 'status', label: 'Status', render: (item) => (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    item.status === 'completed' ? 'bg-green-100 text-green-700' :
                    item.status === 'refunded' ? 'bg-red-100 text-red-700' :
                    item.status === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
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
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-wrap gap-4 mb-6">
            <input
              type="text"
              placeholder="Search by email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="customer">Customer</option>
              <option value="free">Free</option>
            </select>
          </div>

          <AdminTable
            columns={[
              { key: 'email', label: 'Email' },
              { key: 'role', label: 'Role', render: (item) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  item.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                  item.role === 'customer' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-700'
                }`}>{item.role}</span>
              )},
              { key: 'created_at', label: 'Joined', render: (item) => formatDate(item.created_at) },
              { key: 'actions', label: 'Actions', render: (item) => (
                <select
                  value={item.role}
                  onChange={(e) => handleRoleChange(item.id, e.target.value)}
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                >
                  <option value="free">Free</option>
                  <option value="customer">Customer</option>
                  <option value="admin">Admin</option>
                </select>
              )},
            ]}
            data={filteredProfiles}
            emptyMessage="No users found"
          />
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-wrap gap-4 mb-6">
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
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
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="From"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="To"
            />
            {(dateFrom || dateTo) && (
              <div className="text-sm text-gray-500 self-center">
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
                  item.status === 'completed' ? 'bg-green-100 text-green-700' :
                  item.status === 'refunded' ? 'bg-red-100 text-red-700' :
                  item.status === 'failed' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>{item.status}</span>
              )},
              { key: 'created_at', label: 'Date', render: (item) => formatDate(item.created_at) },
              { key: 'actions', label: 'Actions', render: (item) => (
                item.status === 'completed' ? (
                  <button
                    onClick={() => handleRefund(item.id, item.stripe_payment_intent)}
                    className="text-xs text-red-600 hover:text-red-800 font-medium"
                  >
                    Refund
                  </button>
                ) : null
              )},
            ]}
            data={filteredPurchases}
            emptyMessage="No payments found"
          />
        </div>
      )}
    </div>
  )
}
