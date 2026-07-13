'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Option = { name: string; cue: string }

// Small "swap" affordance under an exercise. Opens her legal alternatives for
// this slot (computed server-side) and saves the pick as her new default.
export default function ExerciseSwap({
  dayNum, supersetIndex, side, options,
}: {
  dayNum: number
  supersetIndex: number
  side: 'push' | 'pull'
  options: Option[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')

  if (options.length === 0) return null

  async function choose(newName: string) {
    setSaving(newName); setError('')
    try {
      const res = await fetch('/api/plan/workout/swap', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayNum, supersetIndex, side, newName }),
      })
      const d = await res.json()
      if (d.success) { setOpen(false); router.refresh() }
      else { setError(d.error || 'Could not swap.'); setSaving('') }
    } catch { setError('Could not swap.'); setSaving('') }
  }

  return (
    <div className="mt-1">
      <button onClick={() => setOpen((o) => !o)}
        className="text-ivory/40 hover:text-gold text-[11px] font-semibold inline-flex items-center gap-1 transition-colors">
        ⇄ Swap this move
      </button>
      {open && (
        <div className="mt-2 bg-charcoal border border-smoke rounded-xl p-2 space-y-1">
          <p className="text-ivory/40 text-[10px] uppercase tracking-wider px-1.5 pt-1 pb-0.5">Same muscle · picked for you</p>
          {options.map((o) => (
            <button key={o.name} onClick={() => choose(o.name)} disabled={!!saving}
              className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-obsidian disabled:opacity-50 transition-colors group">
              <span className="text-white text-sm font-medium group-hover:text-gold">{saving === o.name ? 'Swapping…' : o.name}</span>
              <span className="block text-ivory/40 text-[11px] leading-snug mt-0.5">{o.cue}</span>
            </button>
          ))}
          {error && <p className="text-red-400 text-[11px] px-1.5 py-1">{error}</p>}
        </div>
      )}
    </div>
  )
}
