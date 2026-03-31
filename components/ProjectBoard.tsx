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
  assets_folder: string | null
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

const PROGRESS_OPTIONS = [0, 25, 50, 75, 100]

function getProgress(project: Project): number {
  // Parse progress from assets_folder field (used as progress storage)
  if (project.assets_folder && project.assets_folder.startsWith('progress:')) {
    return parseInt(project.assets_folder.split(':')[1], 10) || 0
  }
  // Default progress based on status
  if (project.status === 'complete') return 100
  if (project.status === 'delivered') return 90
  if (project.status === 'review') return 75
  if (project.status === 'revision') return 60
  if (project.status === 'in-progress') return 25
  return 0
}

function getProgressColor(pct: number): string {
  if (pct >= 100) return 'bg-emerald-500'
  if (pct >= 75) return 'bg-blue-500'
  if (pct >= 50) return 'bg-gold'
  if (pct >= 25) return 'bg-yellow-500'
  return 'bg-smoke'
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

  async function setProgress(id: string, pct: number) {
    await fetch('/api/admin/projects', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, assets_folder: `progress:${pct}` }),
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
              <option value="fitness">Fitness Coaching</option>
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
                {statusProjects.map(project => {
                  const progress = getProgress(project)
                  return (
                    <div
                      key={project.id}
                      className={`rounded-xl border p-4 ${STATUS_COLORS[status]}`}
                    >
                      <div className="text-sm font-medium text-white mb-1">{project.client_name}</div>
                      <div className="text-xs text-ivory/40 mb-2">
                        {project.service_type === 'content' ? 'Content' : project.service_type === 'audio' ? 'Audio' : 'Fitness'}
                        {project.package && ` — ${project.package}`}
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-ivory/40">Progress</span>
                          <span className={`text-[10px] font-bold ${progress >= 100 ? 'text-emerald-400' : 'text-ivory/60'}`}>{progress}%</span>
                        </div>
                        <div className="w-full bg-obsidian rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${getProgressColor(progress)}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="flex gap-1 mt-1">
                          {PROGRESS_OPTIONS.map(pct => (
                            <button
                              key={pct}
                              onClick={() => setProgress(project.id, pct)}
                              className={`flex-1 text-[9px] py-0.5 rounded transition-colors ${
                                progress === pct
                                  ? 'bg-gold/30 text-gold font-bold'
                                  : 'bg-obsidian text-ivory/30 hover:text-ivory/60'
                              }`}
                            >
                              {pct}%
                            </button>
                          ))}
                        </div>
                      </div>

                      {project.deadline && (
                        <div className="text-xs text-ivory/30 mb-1">Due: {formatDate(project.deadline)}</div>
                      )}
                      {project.revenue > 0 && (
                        <div className="text-xs text-emerald-400 mb-1">${project.revenue}</div>
                      )}
                      {project.revisions_used > 0 && (
                        <div className="text-xs text-ivory/30 mb-1">
                          Rev: {project.revisions_used}/{project.revision_limit}
                        </div>
                      )}

                      {/* Status selector */}
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
                  )
                })}

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
