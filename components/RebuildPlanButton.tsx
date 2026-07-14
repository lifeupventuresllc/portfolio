'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Regenerate the member's workout with the latest engine (new push-pull splits).
export default function RebuildPlanButton() {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'working' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function rebuild() {
    setState('working'); setMsg('')
    try {
      const res = await fetch('/api/plan/rebuild-workout', { method: 'POST' })
      const d = await res.json()
      if (d.success) { router.refresh() }
      else { setState('error'); setMsg(d.error || 'Could not rebuild.') }
    } catch { setState('error'); setMsg('Could not rebuild.') }
    if (state !== 'error') setState('idle')
  }

  return (
    <span>
      <button onClick={rebuild} disabled={state === 'working'}
        className="text-ivory/40 text-xs hover:text-gold transition-colors disabled:opacity-50">
        {state === 'working' ? 'Rebuilding…' : '↻ Rebuild my plan'}
      </button>
      {msg && <span className="text-red-400 text-xs ml-2">{msg}</span>}
    </span>
  )
}
