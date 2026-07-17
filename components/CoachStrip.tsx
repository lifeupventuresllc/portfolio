'use client'

import { useState } from 'react'
import Celebration from '@/components/Celebration'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { winAffirmation } from '@/lib/affirmations'

// One compact "coach strip" that keeps the home simple while adding two high-retention
// levers: (1) a 7-day momentum row (don't-break-the-chain) and (2) a single dynamic
// next-best-action line so there's never a "what now?" moment. Fires the "Perfect Day"
// celebration when both the workout and the protein goal are done.
type WeekDay = { date: string; showed: boolean; isToday: boolean; isFuture: boolean }
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function CoachStrip() {
  const [week, setWeek] = useState<WeekDay[]>([])
  const [workoutDone, setWorkoutDone] = useState(false)
  const [nutri, setNutri] = useState<{ protein: number; target: number } | null>(null)
  const today = new Date().toISOString().slice(0, 10)

  useLiveRefresh(() => {
    fetch('/api/plan/daily').then((r) => r.json()).then((d) => {
      setWeek(Array.isArray(d?.week) ? d.week : [])
      setWorkoutDone(!!d?.today?.workout)
    }).catch(() => {})
    fetch('/api/plan/food-log').then((r) => r.json()).then((d) => {
      setNutri({ protein: Number(d?.totals?.protein_g) || 0, target: Number(d?.target?.protein_g) || 0 })
    }).catch(() => {})
  })

  const nutritionDone = !!nutri && nutri.target > 0 && nutri.protein >= nutri.target
  const perfectDay = workoutDone && nutritionDone
  const proteinLeft = nutri && nutri.target > 0 ? Math.max(0, nutri.target - nutri.protein) : null

  // The single next-best-action — one clear thing to do next.
  let nudge: string
  if (perfectDay) nudge = "Perfect day — every ring closed. I saw all of it. Rest up. 💛"
  else if (!workoutDone && !nutritionDone) nudge = proteinLeft != null ? `Two moves today: your workout, and ${proteinLeft}g more protein.` : 'Two moves today: your workout, and hit your protein.'
  else if (!workoutDone && nutritionDone) nudge = 'Nutrition’s handled — just your workout left. Tap ▶ to start.'
  else if (proteinLeft != null && proteinLeft > 0) nudge = `Workout’s done 💪🏽 — ${proteinLeft}g of protein to go. Grab a high-protein snack.`
  else nudge = 'Workout’s done 💪🏽 — keep your protein up and log it as you eat.'

  const showedThisWeek = week.filter((d) => d.showed).length

  return (
    <div className="bg-charcoal/50 border border-smoke rounded-[1.5rem] px-5 py-4">
      {/* Week momentum row */}
      <div className="flex items-center justify-between mb-3">
        {week.length === 7 ? week.map((d, i) => (
          <div key={d.date} className="flex flex-col items-center gap-1.5">
            <span className={`text-[9px] font-semibold uppercase ${d.isToday ? 'text-gold' : 'text-ivory/30'}`}>{DOW[i]}</span>
            <span
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                d.showed ? 'bg-gold' : d.isToday ? 'ring-2 ring-gold/60 bg-transparent' : d.isFuture ? 'bg-white/8' : 'bg-white/12'
              }`}
            />
          </div>
        )) : <span className="text-ivory/30 text-[11px]">Loading your week…</span>}
        {week.length === 7 && (
          <span className="text-ivory/40 text-[10px] font-semibold ml-1 whitespace-nowrap">{showedThisWeek}/7</span>
        )}
      </div>
      {/* Next-best-action */}
      <p className="text-ivory/80 text-[13px] leading-snug flex items-start gap-2">
        <span className="text-gold shrink-0">▸</span>
        <span>{nudge}</span>
      </p>
      <Celebration trigger={perfectDay} message={winAffirmation('allDone')} dedupeKey={`perfectday-${today}`} />
    </div>
  )
}
