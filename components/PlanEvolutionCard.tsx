'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Layer 1 Phase 5: unlike LifePatternCard (an acute, today-only smaller ask),
// approving this actually rewrites her standing plan. Shown separately,
// below the acute card, since it's a bigger decision — never forced, always
// a real choice with a real "not now" out.
export default function PlanEvolutionCard({ title, body }: { title: string; body: string }) {
  const router = useRouter()
  const [reply, setReply] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [busy, setBusy] = useState(false)

  if (dismissed) return null

  async function decide(status: 'approved' | 'rejected') {
    setBusy(true)
    try {
      const r = await fetch('/api/plan/evolve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      const d = await r.json().catch(() => ({}))
      setReply(d?.reply || null)
      if (status === 'approved') router.refresh()
    } catch { /* ignore */ }
    setBusy(false)
  }

  if (reply) {
    return (
      <div className="bg-charcoal border border-gold/40 rounded-2xl p-5 text-center">
        <p className="text-white font-semibold text-sm">{reply}</p>
      </div>
    )
  }

  return (
    <div className="bg-charcoal bg-gradient-to-br from-gold/10 to-charcoal border border-gold/40 rounded-2xl p-5">
      <p className="text-white font-semibold text-sm mb-1">{title}</p>
      <p className="text-ivory/60 text-xs mb-4">{body}</p>
      <div className="flex gap-2">
        <button onClick={() => decide('approved')} disabled={busy} className="flex-1 bg-gold text-obsidian py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl disabled:opacity-50">
          {busy ? '…' : 'Update my plan'}
        </button>
        <button onClick={() => { setDismissed(true); decide('rejected') }} disabled={busy} className="bg-charcoal border border-smoke text-ivory/60 px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl disabled:opacity-50">
          Not now
        </button>
      </div>
    </div>
  )
}
