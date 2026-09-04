'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type WeekDay = { dayNum: number; title: string }

// Layer 1 Phase 5: unlike LifePatternCard (an acute, today-only smaller ask),
// approving this actually rewrites her standing plan. HUD redesign
// (2026-09-04, Asa's vision, mocked up and approved before any of this was
// built): a decision this size takes over the whole screen instead of
// competing for scroll space with everything else — fixed overlay, the rest
// of /plan/today visibly dimmed and grayed out behind it, never forced,
// always a real "not now" out. Approving shows a real preview of the
// upcoming week (real day/title pairs from the API's own `week` field, the
// same generated program the mutation already wrote) instead of just a
// list of settings that moved.
export default function PlanEvolutionCard({ title, body }: { title: string; body: string }) {
  const router = useRouter()
  const [reply, setReply] = useState<string | null>(null)
  const [week, setWeek] = useState<WeekDay[]>([])
  const [dismissed, setDismissed] = useState(false)
  const [busy, setBusy] = useState(false)

  async function decide(status: 'approved' | 'rejected') {
    setBusy(true)
    try {
      const r = await fetch('/api/plan/evolve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      const d = await r.json().catch(() => ({}))
      if (status === 'rejected') {
        setDismissed(true)
      } else {
        // Real bug found live, 2026-09-04: router.refresh() here used to
        // re-fetch this page's server data immediately, which recomputes
        // structuralMessage — approving clears the signal, so the parent's
        // {structuralMessage && <PlanEvolutionCard/>} unmounted this card
        // the instant the refresh landed, wiping the reply and week preview
        // before she could read either. The mutation itself already ran
        // (see /api/plan/evolve) — refreshing is deferred to "Got it" below
        // so this stays mounted and showing its own result until she's
        // actually done with it.
        setReply(d?.reply || null)
        setWeek(Array.isArray(d?.week) ? d.week : [])
      }
    } catch { /* ignore */ }
    setBusy(false)
  }

  function closeAfterApproval() {
    setDismissed(true)
    router.refresh()
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-5 transition-opacity duration-300"
      style={{
        zIndex: 60,
        background: 'rgba(3,7,5,0.74)',
        backdropFilter: 'grayscale(0.9) blur(1px)',
        WebkitBackdropFilter: 'grayscale(0.9) blur(1px)',
        opacity: dismissed ? 0 : 1,
        pointerEvents: dismissed ? 'none' : 'auto',
      }}
    >
      <div
        className="w-full max-w-sm p-6"
        style={{ background: '#0b1712', border: '1px solid rgba(127,230,179,0.4)', clipPath: 'polygon(14px 0, 100% 0, 100% 100%, 0 100%, 0 14px)', boxShadow: '0 0 40px rgba(76,175,125,0.25)' }}
      >
        {reply ? (
          <>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: '#7fe6b3' }}>Plan update</p>
            <p className="text-white text-sm leading-relaxed mb-4">{reply}</p>
            {week.length > 0 && (
              <>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] mb-2" style={{ color: '#6fae8e', fontFamily: 'var(--font-orbitron)' }}>Your week, starting today</p>
                <div className="mb-2">
                  {week.map((d) => (
                    <div key={d.dayNum} className="flex items-center gap-2.5 text-sm py-1.5" style={{ color: '#eafff2', borderTop: '1px solid rgba(127,230,179,0.15)' }}>
                      <span className="text-[10px] font-bold uppercase tracking-wide shrink-0 w-16" style={{ color: '#7fe6b3' }}>Day {d.dayNum}</span>
                      {d.title}
                    </div>
                  ))}
                </div>
              </>
            )}
            <button
              onClick={closeAfterApproval}
              className="w-full mt-3 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#eafff2' }}
            >
              Got it
            </button>
          </>
        ) : (
          <>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: '#7fe6b3' }}>Plan update</p>
            <p className="text-white text-lg mb-2.5" style={{ fontFamily: 'var(--font-fraunces)', fontStyle: 'italic', fontWeight: 600 }}>{title}</p>
            <p className="text-ivory/70 text-sm leading-relaxed mb-5">{body}</p>
            <div className="flex gap-2.5">
              <button onClick={() => decide('rejected')} disabled={busy} className="flex-1 py-3 font-bold text-xs uppercase tracking-wider rounded-lg disabled:opacity-50" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(232,223,200,0.7)' }}>
                Not now
              </button>
              <button onClick={() => decide('approved')} disabled={busy} className="flex-1 py-3 font-black text-xs uppercase tracking-wider rounded-lg disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #7fe6b3, #4CAF7D 60%, #2f8a5c)', color: '#021F16' }}>
                {busy ? '…' : 'Update my plan'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
