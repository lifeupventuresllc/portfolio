'use client'

import { useState } from 'react'

// Private coach notes on a client (only you see these). Saves to the enrollment.
export default function CoachNotes({ enrollmentId, initial }: { enrollmentId: string; initial: string }) {
  const [notes, setNotes] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  async function save() {
    setSaving(true); setMsg('')
    try {
      const res = await fetch('/api/admin/client-notes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId, notes }),
      })
      const d = await res.json()
      setMsg(d.success ? 'Saved ✓' : (d.error || 'Could not save.'))
    } catch { setMsg('Could not save.') }
    setSaving(false)
  }

  return (
    <div>
      <textarea value={notes} onChange={(e) => { setNotes(e.target.value); setMsg('') }} rows={4}
        placeholder="Private notes on this client — goals, life context, what to push, what to watch…"
        className="w-full px-3 py-2 bg-obsidian border border-smoke rounded-xl text-white text-sm focus:outline-none focus:border-gold resize-none" />
      <div className="flex items-center gap-3 mt-2">
        <button onClick={save} disabled={saving}
          className="bg-gold text-obsidian px-5 py-2 font-bold text-xs uppercase tracking-wider rounded-xl disabled:opacity-50">
          {saving ? 'Saving…' : 'Save notes'}
        </button>
        {msg && <span className="text-ivory/50 text-xs">{msg}</span>}
      </div>
    </div>
  )
}
