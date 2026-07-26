'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LifeResetClient() {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle')

  async function reset() {
    setStatus('working')
    try {
      const r = await fetch('/api/plan/life-reset', { method: 'POST' })
      const d = await r.json().catch(() => ({}))
      if (!r.ok || !d?.success) { setStatus('error'); return }
      setStatus('done')
      setTimeout(() => router.push('/plan'), 1800)
    } catch { setStatus('error') }
  }

  if (status === 'done') {
    return (
      <div className="bg-charcoal border border-gold/40 rounded-3xl p-8 text-center">
        <p className="text-white font-semibold text-lg mb-2">🔄 Fresh plan, ready to go.</p>
        <p className="text-ivory/60 text-sm">Heading back to your plan…</p>
      </div>
    )
  }

  return (
    <div>
      {status === 'error' && <p className="text-red-400 text-sm mb-3">Something went wrong — try again in a sec.</p>}
      <button
        onClick={reset}
        disabled={status === 'working'}
        className="w-full bg-gold text-obsidian px-6 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-40"
      >
        {status === 'working' ? 'Resetting your plan…' : '🔄 Yes — reset my plan'}
      </button>
    </div>
  )
}
