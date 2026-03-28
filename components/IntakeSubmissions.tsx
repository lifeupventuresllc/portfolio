'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminTable from '@/components/AdminTable'
import { formatDate } from '@/lib/utils'

type IntakeSubmission = {
  id: string
  service_type: string
  status: string
  form_data: Record<string, unknown>
  lead_id: string | null
  funnel_leads?: { name: string; email: string } | null
  created_at: string
}

export default function IntakeSubmissions() {
  const [submissions, setSubmissions] = useState<IntakeSubmission[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const fetchSubmissions = useCallback(async () => {
    const res = await fetch('/api/admin/intake')
    if (res.ok) setSubmissions(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchSubmissions() }, [fetchSubmissions])

  async function handleStatusChange(id: string, status: string) {
    await fetch('/api/admin/intake', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    await fetchSubmissions()
  }

  async function createProject(sub: IntakeSubmission) {
    const formData = sub.form_data || {}
    const name = (formData.name || formData.artist_name || sub.funnel_leads?.name || 'Unknown') as string
    const email = (formData.email || sub.funnel_leads?.email || '') as string

    await fetch('/api/admin/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: name,
        client_email: email,
        service_type: sub.service_type,
        intake_id: sub.id,
        status: 'inbox',
      }),
    })

    await handleStatusChange(sub.id, 'approved')
  }

  const filtered = submissions.filter(s =>
    statusFilter === 'all' || s.status === statusFilter
  )

  if (loading) return <div className="text-center py-8 text-ivory/50">Loading submissions...</div>

  return (
    <div className="space-y-6">
      <div className="bg-charcoal rounded-xl border border-smoke p-6">
        <div className="flex flex-wrap gap-4 mb-6">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-smoke rounded-lg text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="received">Received</option>
            <option value="verified">Verified</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <span className="text-sm text-ivory/50 self-center">
            {filtered.length} submission{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        <AdminTable
          columns={[
            {
              key: 'client', label: 'Client', render: (item: IntakeSubmission) => {
                const fd = item.form_data || {}
                const name = (fd.name || fd.artist_name || item.funnel_leads?.name || '—') as string
                const email = (fd.email || item.funnel_leads?.email || '') as string
                return (
                  <div>
                    <div className="text-sm text-white">{name}</div>
                    {email && <div className="text-xs text-ivory/40">{email}</div>}
                  </div>
                )
              }
            },
            {
              key: 'service_type', label: 'Service', render: (item: IntakeSubmission) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  item.service_type === 'content' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                }`}>{item.service_type}</span>
              )
            },
            {
              key: 'status', label: 'Status', render: (item: IntakeSubmission) => (
                <select
                  value={item.status}
                  onChange={e => handleStatusChange(item.id, e.target.value)}
                  className="text-xs border border-smoke rounded px-2 py-1"
                >
                  <option value="pending">Pending</option>
                  <option value="received">Received</option>
                  <option value="verified">Verified</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              )
            },
            { key: 'created_at', label: 'Date', render: (item: IntakeSubmission) => formatDate(item.created_at) },
            {
              key: 'actions', label: '', render: (item: IntakeSubmission) => (
                item.status !== 'approved' ? (
                  <button
                    onClick={() => createProject(item)}
                    className="text-xs bg-gold/10 text-gold px-3 py-1 rounded-lg hover:bg-gold/20"
                  >
                    Create Project
                  </button>
                ) : (
                  <span className="text-xs text-emerald-400">Project Created</span>
                )
              )
            },
          ]}
          data={filtered}
          emptyMessage="No intake submissions yet"
        />
      </div>
    </div>
  )
}
