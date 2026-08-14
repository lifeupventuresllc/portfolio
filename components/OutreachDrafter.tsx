'use client'

import { useState } from 'react'

type Prospect = {
  id: string
  name: string
  platform: string
  status: string
  touch_count: number
  notes: string | null
}

type Props = {
  prospects: Prospect[]
  onUpdated: () => void
}

// The only two manual steps in the outreach engine live here: tapping "Mark Sent"
// after actually sending a DM, and pasting in a reply if one comes back.
// Everything else — drafting, tracking touches, status — is automatic.
export default function OutreachDrafter({ prospects, onUpdated }: Props) {
  const [selectedId, setSelectedId] = useState('')
  const [draft, setDraft] = useState('')
  const [draftType, setDraftType] = useState<'opener' | 'fu2' | 'matcher' | null>(null)
  const [drafting, setDrafting] = useState(false)
  const [marking, setMarking] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [loggingReply, setLoggingReply] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const selected = prospects.find(p => p.id === selectedId) || null

  function availableTypes(p: Prospect): Array<'opener' | 'fu2' | 'matcher'> {
    if (p.status === 'replied') return ['matcher']
    if (p.touch_count > 0) return ['fu2']
    return ['opener']
  }

  async function draft_(type: 'opener' | 'fu2' | 'matcher') {
    if (!selected) return
    setDrafting(true)
    setError('')
    setDraft('')
    setDraftType(type)
    try {
      const res = await fetch('/api/admin/outreach/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectId: selected.id, messageType: type }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Draft failed.'); return }
      setDraft(data.message)
    } finally {
      setDrafting(false)
    }
  }

  async function copyDraft() {
    await navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function markSent() {
    if (!selected || !draft || !draftType) return
    setMarking(true)
    try {
      const res = await fetch('/api/admin/outreach/mark-sent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectId: selected.id, messageType: draftType, content: draft }),
      })
      if (res.ok) {
        setDraft('')
        setDraftType(null)
        onUpdated()
      }
    } finally {
      setMarking(false)
    }
  }

  async function logReply() {
    if (!selected || !replyText.trim()) return
    setLoggingReply(true)
    try {
      const res = await fetch('/api/admin/outreach/log-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectId: selected.id, replyText: replyText.trim() }),
      })
      if (res.ok) {
        setReplyText('')
        onUpdated()
      }
    } finally {
      setLoggingReply(false)
    }
  }

  return (
    <div className="bg-charcoal rounded-xl border border-smoke p-6">
      <h3 className="text-sm font-semibold text-white mb-4">AI Outreach Drafting</h3>

      <select
        value={selectedId}
        onChange={e => { setSelectedId(e.target.value); setDraft(''); setDraftType(null); setError('') }}
        className="w-full px-3 py-2 border border-smoke rounded-lg text-sm mb-4"
      >
        <option value="">Select a prospect...</option>
        {prospects.map(p => (
          <option key={p.id} value={p.id}>{p.name} — {p.platform} — {p.status}</option>
        ))}
      </select>

      {selected && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {availableTypes(selected).map(type => (
              <button
                key={type}
                onClick={() => draft_(type)}
                disabled={drafting}
                className="px-4 py-2 rounded-lg bg-gold text-black text-xs font-semibold disabled:opacity-50"
              >
                {drafting && draftType === type ? 'Drafting...' : `Draft ${type === 'opener' ? 'Opener' : type === 'fu2' ? 'Follow-Up' : 'Response'}`}
              </button>
            ))}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          {draft && (
            <div className="bg-black/30 rounded-lg p-4 border border-smoke">
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={3}
                className="w-full bg-transparent text-sm text-white resize-vertical"
              />
              <div className="flex gap-2 mt-3">
                <button onClick={copyDraft} className="px-3 py-1.5 rounded-lg border border-smoke text-xs text-ivory/70">
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button onClick={markSent} disabled={marking} className="px-3 py-1.5 rounded-lg bg-gold text-black text-xs font-semibold disabled:opacity-50">
                  {marking ? 'Marking...' : 'Mark Sent'}
                </button>
              </div>
            </div>
          )}

          {selected.status !== 'replied' && selected.touch_count > 0 && (
            <div>
              <label className="text-xs text-ivory/50 block mb-1">Paste their reply (if they responded)</label>
              <div className="flex gap-2">
                <input
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Paste what they said..."
                  className="flex-1 px-3 py-2 border border-smoke rounded-lg text-sm"
                />
                <button onClick={logReply} disabled={loggingReply || !replyText.trim()} className="px-4 py-2 rounded-lg border border-smoke text-xs disabled:opacity-50">
                  {loggingReply ? 'Logging...' : 'Log Reply'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
