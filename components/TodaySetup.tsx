'use client'

// "Today I'm at: Gym | Home" + "Kettlebell day · Switch" (2026-11-10, Asa).
// No new intake question: she tells the workout where she is, today only.
// The first time she's at home on a weights day we ask once:
// "Do you have kettlebells at home?" — then never again.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { hapticTap } from '@/lib/haptics'
import type { ComboWeight } from '@/lib/combo-moves'

const INK = '#EDE7DA', GOLD = '#E5A93C', BG = '#021F16', MUTE = 'rgba(237,231,218,.6)', KB_BLUE = '#7FC8FF'
const MONO = "var(--font-jbmono), 'JetBrains Mono', monospace"
const pill = { fontFamily: MONO, fontWeight: 700, letterSpacing: '.1em' } as const

export default function TodaySetup({ where, homeKb, weightToday }: {
  where: 'gym' | 'home'
  homeKb: boolean | null          // her one-time answer; null = never asked
  weightToday: ComboWeight | null // null = today has no dumbbell/kettlebell moves
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const save = async (body: Record<string, unknown>) => {
    if (busy) return
    hapticTap(); setBusy(true)
    try {
      await fetch('/api/plan/today-setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      router.refresh()
    } finally { setTimeout(() => setBusy(false), 600) }
  }

  const askKb = where === 'home' && homeKb === null && !!weightToday
  const canSwitch = !!weightToday && (where === 'gym' || homeKb === true)
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

      {askKb ? (
        <div className="flex flex-col gap-2.5 rounded-2xl p-3.5" style={{ background: 'rgba(127,200,255,.08)', border: `2px solid ${KB_BLUE}` }}>
          <b className="text-[17px]">Do you have kettlebells at home?</b>
          <span className="text-[13px]" style={{ color: MUTE }}>We&apos;ll only ask this once.</span>
          <div className="grid grid-cols-2 gap-2">
            <button disabled={busy} onClick={() => save({ homeKettlebells: true })} className="nf-press h-12 rounded-full text-[15px] font-extrabold" style={{ background: GOLD, color: BG }}>Yes</button>
            <button disabled={busy} onClick={() => save({ homeKettlebells: false })} className="nf-press h-12 rounded-full text-[15px] font-extrabold" style={{ border: '1px solid rgba(237,231,218,.25)', color: INK }}>No</button>
          </div>
        </div>
      ) : weightToday ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2" style={{ background: 'rgba(237,231,218,.06)', border: '1px solid rgba(237,231,218,.14)' }}>
          <span className="rounded-full px-3 py-1.5" style={{ ...pill, fontSize: 12, color: weightToday === 'kettlebell' ? KB_BLUE : GOLD, background: weightToday === 'kettlebell' ? 'rgba(127,200,255,.14)' : 'rgba(229,169,60,.14)' }}>
            {weightToday === 'kettlebell' ? 'KETTLEBELL DAY' : 'DUMBBELL DAY'}
          </span>
          {canSwitch && (
            <button disabled={busy} onClick={() => save({ weight: other })} className="text-[14px] font-extrabold py-1.5" style={{ color: GOLD }}>
              Switch to {other === 'kettlebell' ? 'kettlebells' : 'dumbbells'}
            </button>
          )}
        </div>
      ) : null}
      <span className="text-[12px]" style={{ color: MUTE }}>Just for today. Tomorrow goes back to your normal plan.</span>
    </div>
  )
}
