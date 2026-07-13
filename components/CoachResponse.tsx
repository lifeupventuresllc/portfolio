'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CoachResponse({ checkinId, existing, existingMedia }: { checkinId: string; existing?: string | null; existingMedia?: string | null }) {
  const router = useRouter()
  const [text, setText] = useState(existing || '')
  const [mediaUrl, setMediaUrl] = useState(existingMedia || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setError(''); setSaving(true)
    try {
      const res = await fetch('/api/admin/checkin-response', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkinId, response: text, mediaUrl }),
      })
      const d = await res.json()
      if (d.success) { setSaved(true); router.refresh() }
      else setError(d.error || 'Failed to save.')
    } catch { setError('Failed to save.') }
    setSaving(false)
  }

  return (
    <div className="mt-3">
      <textarea value={text} onChange={(e) => { setText(e.target.value); setSaved(false) }} rows={3}
        placeholder="Coach her back — what to adjust, what to keep doing, what you want next week..."
        className="w-full px-4 py-3 bg-obsidian border border-smoke rounded-xl text-white text-sm focus:outline-none focus:border-gold resize-none" />
      <input value={mediaUrl} onChange={(e) => { setMediaUrl(e.target.value); setSaved(false) }}
        placeholder="🎥 Paste a voice/video reply link (Loom, YouTube, audio URL) — optional but powerful"
        className="w-full mt-2 px-4 py-2.5 bg-obsidian border border-smoke rounded-xl text-white text-xs focus:outline-none focus:border-gold" />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      <button onClick={save} disabled={saving || (!text.trim() && !mediaUrl.trim())}
        className="mt-2 bg-gold text-obsidian px-5 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl disabled:opacity-40">
        {saving ? 'Sending...' : saved ? '✓ Sent to her' : existing || existingMedia ? 'Update response' : 'Send response'}
      </button>
    </div>
  )
}
