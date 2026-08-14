'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Project = {
  id: string
  client_name: string
  service_type: string
  package: string | null
  status: string
  deadline: string | null
  revisions_used: number
  revision_limit: number
  notes: string | null
  assets_folder: string | null
  created_at: string
  updated_at: string | null
}

const STATUSES = ['inbox', 'in-progress', 'review', 'delivered', 'revision', 'complete'] as const

const STATUS_LABELS: Record<string, string> = {
  'inbox': 'Received',
  'in-progress': 'In Progress',
  'review': 'Under Review',
  'delivered': 'Delivered',
  'revision': 'Revision',
  'complete': 'Complete',
}

const STATUS_COLORS: Record<string, string> = {
  'inbox': 'bg-blue-500',
  'in-progress': 'bg-yellow-500',
  'review': 'bg-purple-500',
  'delivered': 'bg-emerald-500',
  'revision': 'bg-orange-500',
  'complete': 'bg-gold',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function ProgressBar({ status }: { status: string }) {
  const currentIndex = STATUSES.indexOf(status as typeof STATUSES[number])
  // Map revision back to after delivered for display
  const displayOrder = ['inbox', 'in-progress', 'review', 'delivered', 'complete']
  const isRevision = status === 'revision'

  return (
    <div className="flex items-center gap-1 w-full mt-4">
      {displayOrder.map((step, i) => {
        const stepIndex = STATUSES.indexOf(step as typeof STATUSES[number])
        const isCurrent = step === status || (isRevision && step === 'delivered')
        const isPast = !isRevision
          ? stepIndex < currentIndex
          : STATUSES.indexOf(step as typeof STATUSES[number]) <= STATUSES.indexOf('delivered')

        return (
          <div key={step} className="flex-1 flex flex-col items-center gap-1.5">
            <div
              className={`h-1.5 w-full rounded-full transition-colors ${
                isCurrent
                  ? (isRevision ? 'bg-orange-500' : STATUS_COLORS[step])
                  : isPast
                    ? 'bg-gold/60'
                    : 'bg-smoke'
              }`}
            />
            <span className={`text-[10px] tracking-wider uppercase ${
              isCurrent ? 'text-ivory/80 font-medium' : 'text-ivory/30'
            }`}>
              {i === 3 && isRevision ? 'Revision' : step.replace('-', ' ')}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function ClientPortalPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [requesting, setRequesting] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadProjectId, setUploadProjectId] = useState<string | null>(null)

  const supabase = createClient()

  const fetchProjects = useCallback(async () => {
    const res = await fetch('/api/client/projects')
    if (res.ok) {
      const data = await res.json()
      setProjects(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (!user) {
        window.location.href = '/login?redirect=/content'
        return
      }
      fetchProjects()
    }
    init()
  }, [supabase, fetchProjects])

  async function requestRevision(projectId: string) {
    setRequesting(projectId)
    try {
      const res = await fetch('/api/client/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: projectId }),
      })
      if (res.ok) {
        await fetchProjects()
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to request revision')
      }
    } finally {
      setRequesting(null)
    }
  }

  async function handleFileUpload(projectId: string, files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(projectId)

    try {
      for (const file of Array.from(files)) {
        const fileName = `${projectId}/${Date.now()}-${file.name}`
        const { error } = await supabase.storage
          .from('client-uploads')
          .upload(fileName, file, { upsert: true })

        if (error) {
          // If bucket doesn't exist yet, show helpful message
          if (error.message?.includes('not found') || error.message?.includes('Bucket')) {
            alert('File upload storage is being set up. Please contact Asa directly for now.')
            return
          }
          throw error
        }
      }
      setUploadSuccess(projectId)
      setTimeout(() => setUploadSuccess(null), 3000)
    } catch (err) {
      console.error('Upload error:', err)
      alert('Upload failed. Please try again or contact support.')
    } finally {
      setUploading(null)
      setUploadProjectId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-obsidian pt-24 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-obsidian pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-ivory tracking-tight">Client Portal</h1>
          <p className="text-ivory/40 text-sm mt-1">
            Welcome back{user?.email ? `, ${user.email}` : ''}. Track your projects and request revisions below.
          </p>
        </div>

        {projects.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20 border border-smoke/40 rounded-2xl bg-charcoal/30">
            <div className="w-14 h-14 bg-smoke/40 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-ivory/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-ivory mb-2">No projects yet</h2>
            <p className="text-ivory/40 text-sm max-w-sm mx-auto mb-6">
              Once you book a content editing or audio engineering package, your projects will appear here.
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/services/content-editing"
                className="inline-block bg-gold text-obsidian px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase hover:bg-gold/90 transition-colors"
              >
                Content Editing
              </Link>
              <Link
                href="/services/audio-engineering"
                className="inline-block border border-smoke/60 text-ivory/60 px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase hover:border-gold/40 hover:text-ivory transition-colors"
              >
                Audio Engineering
              </Link>
            </div>
          </div>
        ) : (
          /* Project Cards */
          <div className="space-y-5">
            {projects.map((project) => (
              <div
                key={project.id}
                className="border border-smoke/40 rounded-2xl bg-charcoal/30 p-6 hover:border-smoke/60 transition-colors"
              >
                {/* Top Row: Service badge + Status badge */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[project.status] || 'bg-ivory/30'}`} />
                      <span className="text-xs font-medium text-ivory/50 tracking-wider uppercase">
                        {project.service_type === 'audio' ? 'Audio Engineering' : project.service_type === 'fitness' ? 'Fitness Coaching' : 'Content Editing'}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-ivory truncate">
                      {project.package || 'Custom Project'}
                    </h3>
                  </div>
                  <span className={`flex-shrink-0 text-[10px] font-semibold tracking-wider uppercase px-3 py-1 rounded-full border ${
                    project.status === 'complete'
                      ? 'bg-gold/10 text-gold border-gold/30'
                      : project.status === 'delivered'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : project.status === 'revision'
                          ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                          : project.status === 'in-progress'
                            ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                            : project.status === 'review'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                  }`}>
                    {STATUS_LABELS[project.status] || project.status}
                  </span>
                </div>

                {/* Progress Bar */}
                <ProgressBar status={project.status} />

                {/* Completion Percentage */}
                {(() => {
                  let pct = 0
                  if (project.assets_folder?.startsWith('progress:')) {
                    pct = parseInt(project.assets_folder.split(':')[1], 10) || 0
                  } else if (project.status === 'complete') pct = 100
                  else if (project.status === 'delivered') pct = 90
                  else if (project.status === 'review') pct = 75
                  else if (project.status === 'in-progress') pct = 25

                  return (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] text-ivory/40 uppercase tracking-wider">Completion</span>
                        <span className={`text-sm font-bold ${pct >= 100 ? 'text-emerald-400' : pct >= 50 ? 'text-gold' : 'text-ivory/60'}`}>{pct}%</span>
                      </div>
                      <div className="w-full bg-smoke/40 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            pct >= 100 ? 'bg-emerald-500' : pct >= 75 ? 'bg-blue-500' : pct >= 50 ? 'bg-gold' : pct >= 25 ? 'bg-yellow-500' : 'bg-smoke'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })()}

                {/* Details Row */}
                <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-ivory/40">
                  {project.deadline && (
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Due {formatDate(project.deadline)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Revisions: {project.revisions_used} / {project.revision_limit}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Started {formatDate(project.created_at)}</span>
                  </div>
                </div>

                {/* Notes */}
                {project.notes && (
                  <div className="mt-4 bg-smoke/30 rounded-lg px-4 py-3">
                    <p className="text-xs text-ivory/50 leading-relaxed">{project.notes}</p>
                  </div>
                )}

                {/* Revision Button */}
                {project.status === 'delivered' && project.revisions_used < project.revision_limit && (
                  <div className="mt-5 flex items-center gap-3">
                    <button
                      onClick={() => requestRevision(project.id)}
                      disabled={requesting === project.id}
                      className="bg-gold text-obsidian px-5 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {requesting === project.id ? 'Requesting...' : 'Request Revision'}
                    </button>
                    <span className="text-[11px] text-ivory/30">
                      {project.revision_limit - project.revisions_used} revision{project.revision_limit - project.revisions_used !== 1 ? 's' : ''} remaining
                    </span>
                  </div>
                )}

                {/* Revision limit reached */}
                {project.status === 'delivered' && project.revisions_used >= project.revision_limit && (
                  <div className="mt-5">
                    <span className="text-[11px] text-ivory/30">
                      All revisions used. Contact support for additional changes.
                    </span>
                  </div>
                )}

                {/* File Upload */}
                {project.status !== 'complete' && (
                  <div className="mt-5 pt-4 border-t border-smoke/30">
                    <div className="flex items-center gap-3">
                      <input
                        ref={uploadProjectId === project.id ? fileInputRef : null}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFileUpload(project.id, e.target.files)}
                        accept="video/*,audio/*,image/*,.zip,.rar,.psd,.ai,.pdf"
                      />
                      <button
                        onClick={() => {
                          setUploadProjectId(project.id)
                          setTimeout(() => fileInputRef.current?.click(), 50)
                        }}
                        disabled={uploading === project.id}
                        className="flex items-center gap-2 border border-smoke/60 text-ivory/60 px-4 py-2 rounded-lg text-xs font-medium hover:border-gold/40 hover:text-ivory transition-colors disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        {uploading === project.id ? 'Uploading...' : 'Upload Files'}
                      </button>
                      <span className="text-[10px] text-ivory/30">
                        Videos, audio, images, or archives
                      </span>
                      {uploadSuccess === project.id && (
                        <span className="text-xs text-emerald-400">Uploaded!</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
