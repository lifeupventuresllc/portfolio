'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { hapticTap } from '@/lib/haptics'

// "Start fresh" (2026-11-05, Asa's Nutrition fix #7): one link at the bottom
// of her Progress, then a plain yes/no on the page itself (no browser pop-up).
// Clears her food, meals picked, workouts done and streak; keeps her plan.
const MONO = "var(--font-jbmono), 'JetBrains Mono', monospace"

export default function StartFresh() {
  const router = useRouter()
  const [ask, setAsk] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const box = useRef<HTMLDivElement>(null)
  // The box opens near the bottom of Home's scroll area: bring it into view.
  useEffect(() => { if (ask) box.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, [ask])
  async function go() {
    hapticTap()
    setBusy(true)
    setError('')
    const res = await fetch('/api/plan/start-fresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: 'start-fresh' }) }).catch(() => null)
    if (!res?.ok) { setBusy(false); setError("That didn't work. Check your internet and try again."); return }
    // Her phone's own memory of the old days (which meals, which tips she saw).
    try { for (const k of Object.keys(localStorage)) if (k.startsWith('luf_')) localStorage.removeItem(k) } catch { /* fine */ }
    setAsk(false)
    setBusy(false)
    router.refresh()
  }
  if (!ask) return (
    <button type="button" onClick={() => { hapticTap(); setAsk(true) }} className="self-center mt-6 mb-2 underline underline-offset-2" style={{ fontSize: 14, color: 'rgba(237,231,218,.5)' }}>
      Start fresh
    </button>
  )
  return (
    <div ref={box} role="alertdialog" aria-label="Start fresh?" className="mt-6 mb-2 rounded-3xl p-4 flex flex-col gap-3" style={{ background: 'rgba(255,90,78,.08)', border: '2px solid rgba(255,138,122,.5)', color: '#EDE7DA' }}>
      <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 13, letterSpacing: '.1em', color: '#FF8A7A' }}>START FRESH?</span>
      <p style={{ margin: 0, fontSize: 16, lineHeight: 1.4 }}>
        This clears your food, your meals for today, your workouts done, your weigh-ins and your streak. You can&apos;t undo it.
      </p>
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.4, color: 'rgba(237,231,218,.72)' }}>Your account, your answers and your plan stay.</p>
      {error && <p role="alert" style={{ margin: 0, fontSize: 15, color: '#FF8A7A' }}>{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setAsk(false)} disabled={busy} className="nf-press rounded-full" style={{ height: 52, border: '2px solid rgba(237,231,218,.3)', background: 'transparent', color: '#EDE7DA', fontFamily: MONO, fontWeight: 700, fontSize: 13, letterSpacing: '.1em' }}>KEEP MY DATA</button>
        <button type="button" onClick={go} disabled={busy} className="nf-press rounded-full disabled:opacity-60" style={{ height: 52, background: '#FF8A7A', color: '#021F16', fontFamily: MONO, fontWeight: 700, fontSize: 13, letterSpacing: '.1em' }}>{busy ? 'CLEARING…' : 'YES, CLEAR IT'}</button>
      </div>
    </div>
  )
}
