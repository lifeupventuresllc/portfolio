'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PostBox() {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  async function post() {
    if (!body.trim()) return
    setPosting(true); setError('')
    try {
      const res = await fetch('/api/plan/community/post', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }) })
      const d = await res.json()
      if (d.success) { setBody(''); router.refresh() }
      else setError(d.error || 'Could not post.')
    } catch { setError('Could not post.') }
    setPosting(false)
  }

  return (
    <div className="bg-charcoal border border-smoke rounded-2xl p-4 mb-5">
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={800}
        placeholder="Share a win, a struggle, or cheer someone on…"
        className="w-full px-3 py-2 bg-obsidian border border-smoke rounded-xl text-white text-sm focus:outline-none focus:border-gold resize-none" />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      <div className="flex justify-end mt-2">
        <button onClick={post} disabled={posting || !body.trim()} className="bg-gold text-obsidian px-5 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl disabled:opacity-40">
          {posting ? 'Posting…' : 'Share'}
        </button>
      </div>
    </div>
  )
}
