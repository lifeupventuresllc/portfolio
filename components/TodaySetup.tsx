'use client'

// "Today I'm at: Gym | Home" + "Kettlebell day · Switch" (2026-11-10, Asa).
// No new intake question: she tells the workout where she is, today only.
// The first time she's at home on a weights day we ask once:
// "Do you have kettlebells at home?" — then never again.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { hapticTap } from '@/lib/haptics'
import type { ComboWeight } from '@/lib/combo-moves'
import type { HomeWeights } from '@/lib/weight-tags'

const INK = '#EDE7DA', GOLD = '#E5A93C', BG = '#021F16', MUTE = 'rgba(237,231,218,.6)', KB_BLUE = '#7FC8FF'
const MONO = "var(--font-jbmono), 'JetBrains Mono', monospace"
const pill = { fontFamily: MONO, fontWeight: 700, letterSpacing: '.1em' } as const

// 2026-11-17: the one home question is now "What do you have at home?"
// Dumbbells / Dumbbells + kettlebells / No weights — "No weights" gives a
// bodyweight-only workout. Asked once; "Change" brings it back anytime.
const HOME_OPTS: { v: HomeWeights; l: string }[] = [
  { v: 'dumbbell', l: 'Dumbbells' }, { v: 'both', l: 'Dumbbells + kettlebells' }, { v: 'none', l: 'No weights' },
]

export default function TodaySetup({ where, homeWeights, weightToday }: {
  where: 'gym' | 'home'
  homeWeights: HomeWeights | null // her answer; null = never asked
  weightToday: ComboWeight | null // null = today has no dumbbell/kettlebell moves
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [changing, setChanging] = useState(false)

  const save = async (body: Record<string, unknown>) => {
    if (busy) return
    hapticTap(); setBusy(true)
    try {
      await fetch('/api/plan/today-setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      router.refresh()
    } finally { setTimeout(() => setBusy(false), 600) }
  }

  const askHome = where === 'home' && (homeWeights === null || changing)
  const canSwitch = !!weightToday && (where === 'gym' || homeWeights === 'both')
  const other: ComboWeight = weightToday === 'kettlebell' ? 'dumbbell' : 'kettlebell'

  return (
    <div className="flex flex-col gap-2.5" style={{ opacity: busy ? 0.6 : 1, transition: 'opacity .2s' }} aria-busy={busy}>
      <span style={{ ...pill, fontSize: 11, letterSpacing: '.14em', color: MUTE }}>TODAY I&apos;M AT</span>
      <div className="flex gap-1 p-1 rounded-full" role="group" aria-label="Where are you today?" style={{ background: 'rgba(237,231,218,.06)', border: '1px solid rgba(237,231,218,.14)' }}>
        {(['gym', 'home'] as const).map((w) => (
          <button key={w} aria-pressed={where === w} disabled={busy} onClick={() => where !== w && save({ where: w })}
            className="nf-press flex-1 h-11 rounded-full text-[16px] font-extrabold"
            style={{ background: where === w ? INK : 'transparent', color: where === w ? BG : INK }}>{w === 'gym' ? 'Gym' : 'Home'}</button>
        ))}
      </div>

      {askHome ? (
        <div className="flex flex-col gap-2.5 rounded-2xl p-3.5" style={{ background: 'rgba(127,200,255,.08)', border: `2px solid ${KB_BLUE}` }}>
          <b className="text-[17px]">What do you have at home?</b>
          <span className="text-[13px]" style={{ color: MUTE }}>Your workout only uses what you have.</span>
          <div className="flex flex-col gap-2">
            {HOME_OPTS.map((o) => (
              <button key={o.v} disabled={busy} aria-pressed={homeWeights === o.v} onClick={() => { setChanging(false); save({ homeWeights: o.v }) }}
                className="nf-press h-12 rounded-full text-[15px] font-extrabold"
                style={homeWeights === o.v ? { background: GOLD, color: BG } : { border: '1px solid rgba(237,231,218,.25)', color: INK }}>{o.l}</button>
            ))}
          </div>
        </div>
      ) : where === 'home' && homeWeights === 'none' ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2" style={{ background: 'rgba(237,231,218,.06)', border: '1px solid rgba(237,231,218,.14)' }}>
          <span className="rounded-full px-3 py-1.5" style={{ ...pill, fontSize: 12, color: GOLD, background: 'rgba(229,169,60,.14)' }}>NO WEIGHTS</span>
          <button disabled={busy} onClick={() => { hapticTap(); setChanging(true) }} className="text-[14px] font-extrabold py-1.5" style={{ color: GOLD }}>Change</button>
        </div>
      ) : weightToday ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2" style={{ background: 'rgba(237,231,218,.06)', border: '1px solid rgba(237,231,218,.14)' }}>
          <span className="rounded-full px-3 py-1.5" style={{ ...pill, fontSize: 12, color: weightToday === 'kettlebell' ? KB_BLUE : GOLD, background: weightToday === 'kettlebell' ? 'rgba(127,200,255,.14)' : 'rgba(229,169,60,.14)' }}>
            {weightToday === 'kettlebell' ? 'KETTLEBELL DAY' : 'DUMBBELL DAY'}
          </span>
          {where === 'home' && !canSwitch && (
            <button disabled={busy} onClick={() => { hapticTap(); setChanging(true) }} className="text-[14px] font-extrabold py-1.5" style={{ color: GOLD }}>Change</button>
          )}
          {canSwitch && (
            <button disabled={busy} onClick={() => save({ weight: other })} className="text-[14px] font-extrabold py-1.5" style={{ color: GOLD }}>
              Switch to {other === 'kettlebell' ? 'kettlebells' : 'dumbbells'}
            </button>
          )}
        </div>
      ) : null}
      {!askHome && <span className="text-[12px]" style={{ color: MUTE }}>Just for today. Tomorrow goes back to your normal plan.</span>}
    </div>
  )
}
