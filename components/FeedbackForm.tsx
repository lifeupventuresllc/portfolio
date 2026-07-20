'use client'

import { useState } from 'react'

export default function FeedbackForm() {
  const [rating, setRating] = useState<'up' | 'down' | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!rating) return
    setSending(true); setError('')
    try {
      const res = await fetch('/api/plan/feedback', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, text }),
      })
      const data = await res.json()
      if (data.success) setDone(true)
      else setError(data.error || 'Something went wrong.')
    } catch { setError('Something went wrong. Try again.') }
    setSending(false)
  }

  if (done) {
    return (
      <div className="bg-charcoal border border-green-500/40 rounded-3xl p-8 text-center">
        <p className="text-3xl mb-3">🙏🏽</p>
        <p className="text-white font-semibold text-lg mb-2">Got it — thank you.</p>
        <p className="text-ivory/60 text-sm">This helps me make the app better for you and everyone testing it with you.</p>
      </div>
    )
  }

  return (
    <div className="bg-charcoal border border-smoke rounded-3xl p-6 sm:p-8 space-y-5">
      <div className="flex gap-3">
        <button onClick={() => setRating('up')}
          className={`flex-1 py-5 rounded-2xl border text-2xl transition-all ${rating === 'up' ? 'bg-green-500/15 border-green-500/50' : 'bg-obsidian border-smoke hover:border-green-500/40'}`}>
          👍<p className="text-xs text-ivory/60 mt-1 font-semibold">Working well</p>
        </button>
        <button onClick={() => setRating('down')}
          className={`flex-1 py-5 rounded-2xl border text-2xl transition-all ${rating === 'down' ? 'bg-red-500/15 border-red-500/50' : 'bg-obsidian border-smoke hover:border-red-500/40'}`}>
          👎<p className="text-xs text-ivory/60 mt-1 font-semibold">Something&apos;s off</p>
        </button>
      </div>
      <div>
        <label className="text-ivory/50 text-xs uppercase tracking-wider mb-2 block">Want to say more? (optional)</label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4}
          placeholder="What happened, what felt confusing, what you'd want instead…"
          className="w-full px-4 py-3 bg-obsidian border border-smoke rounded-xl text-white text-sm focus:outline-none focus:border-gold transition-colors resize-none" />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button onClick={submit} disabled={sending || !rating}
        className="w-full bg-gold text-obsidian px-8 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all hover:scale-[1.02] disabled:opacity-40">
        {sending ? 'Sending…' : 'Send feedback'}
      </button>
    </div>
  )
}
