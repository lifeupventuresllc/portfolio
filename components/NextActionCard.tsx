'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { hapticTap } from '@/lib/haptics'

// Prompt 1's "Next Action" — the single-instruction circle. No categories
// are ever shown (never a "workout" vs "meal" label), just the one thing to
// do right now. Prompt 3's expansion routing lives here too: tapping the
// instruction (not the buttons) opens the supporting screen the engine
// already decided on — never a menu of destinations.
type ActionKind = 'workout' | 'meal' | 'fallback' | 'location'
type NextAction = { logId: string; kind: ActionKind; actionKey: string; instruction: string; score: number }

// The ONE destination per kind — fully determined by what the engine
// decided, never a choice presented to her (prompt 3's core rule). Fallback
// actions have nothing to expand into; tapping does nothing.
const EXPANSION_ROUTE: Partial<Record<ActionKind, string>> = {
  workout: '/plan/workout',
  meal: '/plan/nutrition',
  location: '/plan/eating-out',
}

export default function NextActionCard({ compact = false }: { compact?: boolean }) {
  const router = useRouter()
  const [action, setAction] = useState<NextAction | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [showMessage, setShowMessage] = useState(false)
  const [message, setMessage] = useState('')
  const [note, setNote] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/plan/next-action')
      if (res.ok) setAction(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const markDone = async () => {
    if (!action || busy) return
    hapticTap()
    setBusy(true)
    setDone(true)
    try {
      await fetch('/api/plan/next-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ logId: action.logId, action: 'done' }) })
      await load()
    } finally {
      setDone(false)
      setBusy(false)
    }
  }

  const dayChanged = async () => {
    if (!action || busy) return
    hapticTap()
    setBusy(true)
    try {
      const res = await fetch('/api/plan/next-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ logId: action.logId, action: 'day_changed' }) })
      if (res.ok) setAction(await res.json())
    } finally {
      setBusy(false)
    }
  }

  const sendMessage = async () => {
    if (!action || busy || !message.trim()) return
    setBusy(true)
    try {
      const res = await fetch('/api/plan/next-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ logId: action.logId, action: 'message', message }) })
      const json = await res.json()
      if (json.changed && json.logId) {
        setAction(json)
        setNote(null)
      } else {
        setNote("Got it — didn't need to change anything.")
      }
      setMessage('')
      setShowMessage(false)
    } finally {
      setBusy(false)
    }
  }

  // On the dashboard teaser (compact), tapping opens the full circle at
  // /plan/next — a second decision point ("which sub-screen?") has no place
  // on a card that's meant to be glanced at, and /plan/next itself decides
  // where the real expansion (workout/nutrition/eating-out) goes. On the
  // full /plan/next page, tapping goes straight to that supporting screen.
  const expand = () => {
    if (!action) return
    if (compact) { router.push('/plan/next'); return }
    const dest = EXPANSION_ROUTE[action.kind]
    if (dest) router.push(dest)
  }

  if (loading) {
    return (
      <div className="rounded-3xl p-6 animate-pulse" style={{ background: 'linear-gradient(135deg, #0d3a2a, #044A34 60%, #08281d)', border: '1.5px solid rgba(229,169,60,0.3)', minHeight: compact ? 120 : 220 }} />
    )
  }

  if (!action) {
    return (
      <div className="rounded-3xl p-6 text-center" style={{ background: '#0d3a2a', border: '1.5px solid rgba(229,169,60,0.3)' }}>
        <p className="text-ivory/50 text-sm">Your next action will show up here once your plan is set up.</p>
      </div>
    )
  }

  return (
    <div
      className="rounded-3xl p-6"
      style={{ background: 'linear-gradient(135deg, #0d3a2a, #044A34 60%, #08281d)', border: '1.5px solid #E5A93C', boxShadow: '0 0 24px -6px rgba(229,169,60,0.35)' }}
    >
      <p className="text-[#E5A93C] text-[10px] uppercase tracking-[0.25em] font-bold mb-2">Your next action</p>
      <button
        onClick={expand}
        disabled={!compact && !EXPANSION_ROUTE[action.kind]}
        className="text-left w-full text-white font-semibold leading-snug mb-4"
        style={{ fontSize: compact ? '1rem' : '1.25rem' }}
      >
        {action.instruction}
      </button>

      {note && <p className="text-ivory/50 text-xs mb-3">{note}</p>}

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={markDone}
          disabled={busy}
          className="bg-gold text-obsidian px-6 py-3 font-bold text-sm uppercase tracking-wider rounded-2xl active:scale-95 transition-transform disabled:opacity-60"
        >
          {done ? 'Nice!' : 'Done'}
        </button>
        <button onClick={dayChanged} disabled={busy} className="text-ivory/60 text-xs font-semibold px-3 py-3 disabled:opacity-60">
          My day changed
        </button>
        {!compact && (
          <button onClick={() => setShowMessage((s) => !s)} disabled={busy} className="text-ivory/60 text-xs font-semibold px-3 py-3 disabled:opacity-60">
            Something else?
          </button>
        )}
      </div>

      {!compact && showMessage && (
        <div className="mt-3 flex items-center gap-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') sendMessage() }}
            placeholder="Tell it what's going on…"
            className="flex-1 bg-black/20 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-ivory/30 focus:outline-none focus:border-gold/60"
          />
          <button onClick={sendMessage} disabled={busy || !message.trim()} className="bg-white/10 border border-white/20 text-white text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-40">
            Send
          </button>
        </div>
      )}
    </div>
  )
}
