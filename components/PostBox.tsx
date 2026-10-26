'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { hapticTap } from '@/lib/haptics'

export default function PostBox() {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  async function post() {
    if (!body.trim()) return
    hapticTap()
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
    <div className="rounded-[22px] p-4 mb-5" style={{ background: 'rgba(237,231,218,.06)', border: '1px solid rgba(237,231,218,.14)' }}>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={800}
        placeholder="Share a win, a struggle, or cheer someone on…"
        className="w-full px-3.5 py-3 rounded-2xl text-base focus:outline-none resize-none placeholder:text-[rgba(237,231,218,.4)]"
        style={{ background: '#021F16', border: '1px solid rgba(237,231,218,.14)', color: '#EDE7DA' }} />
      {error && <p className="text-sm mt-1" style={{ color: '#F2A08C' }}>{error}</p>}
      <div className="flex justify-end mt-2.5">
        <button onClick={post} disabled={posting || !body.trim()} className="nf-press h-12 px-6 rounded-full disabled:opacity-40"
          style={{ background: '#E5A93C', color: '#021F16', fontFamily: "var(--font-jbmono), 'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, letterSpacing: '.1em' }}>
          {posting ? 'POSTING…' : 'SHARE'}
        </button>
      </div>
    </div>
  )
}
