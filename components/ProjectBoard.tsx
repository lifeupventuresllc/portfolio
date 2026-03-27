'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDate } from '@/lib/utils'

type Project = {
  id: string
  client_name: string
  client_email: string | null
  service_type: string
  package: string | null
  status: string
  deadline: string | null
  revenue: number
  revisions_used: number
  revision_limit: number
  notes: string | null
  created_at: string
}

const STATUSES = ['inbox', 'in-progress', 'review', 'delivered', 'revision', 'complete'] as const

const STATUS_COLORS: Record<string, string> = {
  'inbox': 'border-blue-500/50 bg-blue-500/5',
  'in-progress': 'border-yellow-500/50 bg-yellow-500/5',
  'review': 'border-purple-500/50 bg-purple-500/5',
  'delivered': 'border-emerald-500/50 bg-emerald-500/5',
  'revision': 'border-orange-500/50 bg-orange-500/5',
  'complete': 'border-ivory/20 bg-ivory/5',
}

const STATUS_BADGES: Record<string, string> = {
  'inbox': 'bg-blue-500/20 text-blue-400',
  'in-progress': 'bg-yellow-500/20 text-yellow-400',
  'review': 'bg-purple-500/20 text-purple-400',
  'delivered': 'bg-emerald-500/20 text-emerald-400',
  'revision': 'bg-orange-500/20 text-orange-400',
  'complete': 'bg-ivory/20 text-ivory/60',
}

export default function ProjectBoard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    client_name: '', client_email: '', service_type: 'content', package: '', deadline: '', revenue: '', notes: '',
  })

  const fetchProjects = useCallback(async () => {
    const res = await fetch('/api/admin/projects')
    if (res.ok) setProjects(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  async function moveProject(id: string, newStatus: string) {
    await fetch('/api/admin/projects', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus }),
    })
    await fetchProjects()
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/admin/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        revenue: form.revenue ? parseInt(form.revenue) : 0,
        deadline: form.deadline || null,
      }),
    })
    setForm({ client_name: '', client_email: '', service_type: 'content', package: '', deadline: '', revenue: '', notes: '' })
    setShowForm(false)
    await fetchProjects()
  }

  if (loading) {
    return <div className="text-center py-8 text-ivory/50">Loading projects...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-ivory/50">
          {projects.length} project{projects.length !== 1 ? 's' : ''} total
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-gold text-obsidian px-4 py-2 rounded-lg text-sm font-medium hover:bg-gold/90"
        >
          {showForm ? 'Cancel' : '+ New Project'}
        </button>
      </div>

      {/* New Project Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-charcoal rounded-xl border border-smoke p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Create Project</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              placeholder="Client Name *"
              value={form.client_name}
              onChange={e => setForm({ ...form, client_name: e.target.value })}
              required
              className="px-3 py-2 bg-obsidian border border-smoke rounded-lg text-sm text-white placeholder-ivory/30 focus:outline-none focus:border-gold"
            />
            <input
              placeholder="Client Email"
              type="email"
              value={form.client_email}
              onChange={e => setForm({ ...form, client_email: e.target.value })}
              className="px-3 py-2 bg-obsidian border border-smoke rounded-lg text-sm text-white placeholder-ivory/30 focus:outline-none focus:border-gold"
            />
            <select
              value={form.service_type}
              onChange={e => setForm({ ...form, service_type: e.target.value })}
              className="px-3 py-2 bg-obsidian border border-smoke rounded-lg text-sm text-white focus:outline-none focus:border-gold"
            >
              <option value="content">Content Editing</option>
              <option value="audio">Audio Engineering</option>
            </select>
            <input
              placeholder="Package (e.g. Growth $597/mo)"
              value={form.package}
              onChange={e => setForm({ ...form, package: e.target.value })}
              className="px-3 py-2 bg-obsidian border border-smoke rounded-lg text-sm text-white placeholder-ivory/30 focus:outline-none focus:border-gold"
            />
            <input
              type="date"
              value={form.deadline}
              onChange={e => setForm({ ...form, deadline: e.target.value })}
              className="px-3 py-2 bg-obsidian border border-smoke rounded-lg text-sm text-white focus:outline-none focus:border-gold"
            />
            <input
              placeholder="Revenue ($)"
              type="number"
              value={form.revenue}
              onChange={e => setForm({ ...form, revenue: e.target.value })}
              className="px-3 py-2 bg-obsidian border border-smoke rounded-lg text-sm text-white placeholder-ivory/30 focus:outline-none focus:border-gold"
            />
            <textarea
              placeholder="Notes"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="px-3 py-2 bg-obsidian border border-smoke rounded-lg text-sm text-white placeholder-ivory/30 focus:outline-none focus:border-gold md:col-span-2"
              rows={2}
            />
          </div>
          <button
            type="submit"
            className="mt-4 bg-gold text-obsidian px-6 py-2 rounded-lg text-sm font-medium hover:bg-gold/90"
          >
            Create Project
          </button>
        </form>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {STATUSES.map(status => {
          const statusProjects = projects.filter(p => p.status === status)
          return (
            <div key={status} className="min-h-[200px]">
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGES[status]}`}>
                  {status.replace('-', ' ')}
                </span>
                <span className="text-xs text-ivory/30">{statusProjects.length}</span>
              </div>

              <div className="space-y-3">
                {statusProjects.map(project => (
                  <div
                    key={project.id}
                    className={`rounded-xl border p-4 ${STATUS_COLORS[status]}`}
                  >
                    <div className="text-sm font-medium text-white mb-1">{project.client_name}</div>
                    <div className="text-xs text-ivory/40 mb-2">
                      {project.service_type === 'content' ? 'Content' : 'Audio'}
                      {project.package && ` — ${project.package}`}
                    </div>
                    {project.deadline && (
                      <div className="text-xs text-ivory/30 mb-2">Due: {formatDate(project.deadline)}</div>
                    )}
                    {project.revenue > 0 && (
                      <div className="text-xs text-emerald-400 mb-2">${project.revenue}</div>
                    )}
                    {project.revisions_used > 0 && (
                      <div className="text-xs text-ivory/30 mb-2">
                        Rev: {project.revisions_used}/{project.revision_limit}
                      </div>
                    )}

                    {/* Move buttons */}
                    <select
                      value={status}
                      onChange={e => moveProject(project.id, e.target.value)}
                      className="w-full text-xs bg-obsidian border border-smoke rounded px-2 py-1 text-ivory/70 mt-1"
                    >
                      {STATUSES.map(s => (
                        <option key={s} value={s}>{s.replace('-', ' ')}</option>
                      ))}
                    </select>
                  </div>
                ))}

                {statusProjects.length === 0 && (
                  <div className="text-xs text-ivory/20 text-center py-8 border border-dashed border-smoke/50 rounded-xl">
                    Empty
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
