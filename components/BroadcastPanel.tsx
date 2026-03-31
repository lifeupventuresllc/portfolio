'use client'

import { useState, useEffect, useCallback } from 'react'

type BroadcastRecord = {
  id: string
  subject: string
  body: string
  audience: string
  sent_count: number
  sent_at: string
  sent_by: string
}

export default function BroadcastPanel() {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<'leads' | 'all'>('leads')
  const [counts, setCounts] = useState<{ leads: number; all: number }>({ leads: 0, all: 0 })
  const [history, setHistory] = useState<BroadcastRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [showPreview, setShowPreview] = useState(false)
  const [result, setResult] = useState<{ sent: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setFetching(true)
    try {
      const res = await fetch('/api/admin/broadcast')
      if (!res.ok) throw new Error('Failed to load broadcast data')
      const data = await res.json()
      setCounts(data.counts)
      setHistory(data.history)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load'
      setError(msg)
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleSend() {
    const recipientCount = audience === 'leads' ? counts.leads : counts.all
    if (!confirm(`Are you sure? Sending to ${recipientCount} recipients.`)) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body, audience }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Broadcast failed')
      }

      const data = await res.json()
      setResult(data)
      setSubject('')
      setBody('')
      await fetchData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Broadcast failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const recipientCount = audience === 'leads' ? counts.leads : counts.all

  return (
    <div className="space-y-6">
      {/* Compose */}
      <div className="bg-charcoal rounded-xl border border-smoke p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Compose Broadcast</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-sm">
            Broadcast sent successfully! {result.sent} of {result.total} emails delivered.
          </div>
        )}

        <div className="space-y-4">
          {/* Audience */}
          <div>
            <label className="block text-sm text-ivory/50 mb-1">Audience</label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as 'leads' | 'all')}
              className="w-full px-3 py-2 bg-obsidian border border-smoke rounded-lg text-sm text-white focus:outline-none focus:border-gold"
            >
              <option value="leads">All Funnel Leads ({counts.leads})</option>
              <option value="all">All Customers ({counts.all})</option>
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm text-ivory/50 mb-1">Subject Line</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Your subject line..."
              className="w-full px-3 py-2 bg-obsidian border border-smoke rounded-lg text-sm text-white focus:outline-none focus:border-gold"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm text-ivory/50 mb-1">Body (HTML)</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder="<h1>Hello!</h1><p>Your message here...</p>"
              className="w-full px-3 py-2 bg-obsidian border border-smoke rounded-lg text-sm text-white font-mono focus:outline-none focus:border-gold resize-y"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-4 py-2 border border-smoke rounded-lg text-sm text-ivory/70 hover:text-white hover:border-gold transition-colors"
            >
              {showPreview ? 'Hide Preview' : 'Preview'}
            </button>
            <button
              onClick={handleSend}
              disabled={loading || !subject || !body || recipientCount === 0}
              className="px-6 py-2 bg-gold text-obsidian rounded-lg text-sm font-semibold hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : `Send to ${recipientCount} recipients`}
            </button>
          </div>
        </div>
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="bg-charcoal rounded-xl border border-smoke p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Preview</h2>
          <div className="bg-white rounded-lg p-6 text-black">
            <div className="border-b border-gray-200 pb-3 mb-4">
              <div className="text-xs text-gray-500">From: Asa Luke &lt;noreply@asaluke.io&gt;</div>
              <div className="text-xs text-gray-500">To: {audience === 'leads' ? 'All Funnel Leads' : 'All Customers'} ({recipientCount})</div>
              <div className="text-sm font-semibold mt-1">{subject || '(No subject)'}</div>
            </div>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: body || '<p style="color:#999">Email body preview will appear here...</p>' }}
            />
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-charcoal rounded-xl border border-smoke p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Broadcasts</h2>
        {fetching ? (
          <div className="text-sm text-ivory/40">Loading...</div>
        ) : history.length === 0 ? (
          <div className="text-sm text-ivory/40">No broadcasts sent yet.</div>
        ) : (
          <div className="space-y-3">
            {history.map((record) => (
              <div key={record.id} className="bg-obsidian rounded-lg border border-smoke p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{record.subject}</div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gold/20 text-gold capitalize">
                        {record.audience === 'leads' ? 'Funnel Leads' : 'All Customers'}
                      </span>
                      <span className="text-xs text-ivory/40">
                        {record.sent_count} sent
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-ivory/40 whitespace-nowrap">
                    {new Date(record.sent_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
