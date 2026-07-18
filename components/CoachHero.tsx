'use client'

import { useState } from 'react'
import Link from 'next/link'
import Celebration from '@/components/Celebration'
import { useLiveRefresh, localTodayISO } from '@/lib/useLiveRefresh'
import { winAffirmation } from '@/lib/affirmations'

// The conversational centerpiece of the home screen. Coach Asa greets her by name,
// says the one or two things that matter today IN HIS VOICE (this absorbs the old
// coach-strip's next-best-action), and invites her to talk — tapping opens the operator.
export default function CoachHero({ firstName }: { firstName: string }) {
  const [workoutDone, setWorkoutDone] = useState(false)
  const [nutri, setNutri] = useState<{ protein: number; target: number } | null>(null)
  const today = localTodayISO()

  useLiveRefresh(() => {
    fetch('/api/plan/daily').then((r) => r.json()).then((d) => setWorkoutDone(!!d?.today?.workout)).catch(() => {})
    fetch('/api/plan/food-log').then((r) => r.json()).then((d) => setNutri({ protein: Number(d?.totals?.protein_g) || 0, target: Number(d?.target?.protein_g) || 0 })).catch(() => {})
  })

  const nutritionDone = !!nutri && nutri.target > 0 && nutri.protein >= nutri.target
  const perfectDay = workoutDone && nutritionDone
  const proteinLeft = nutri && nutri.target > 0 ? Math.max(0, nutri.target - nutri.protein) : null

  let line: string
  if (perfectDay) line = `You've handled everything today, ${firstName}. I saw all of it — proud of you. 💛`
  else if (!workoutDone && !nutritionDone) line = proteinLeft != null
    ? `Two things today, ${firstName}: your workout, and ${proteinLeft}g more protein. Tell me how your day looks and I'll fit it all in.`
    : `Let's get after it today, ${firstName}. Tell me how your day looks and I'll build it around you.`
  else if (!workoutDone && nutritionDone) line = `Nutrition's handled 🙌 — just your workout left, ${firstName}. Short on time? Tell me and I'll adjust it.`
  else if (proteinLeft != null && proteinLeft > 0) line = `Workout's done 💪🏽 — ${proteinLeft}g of protein to go, ${firstName}. Want a quick idea? Just ask.`
  else line = `Looking good today, ${firstName}. Tell me what's going on and I'll keep you on track.`

  return (
    <Link href="/plan/coach" className="luf-glow group block relative overflow-hidden rounded-[2rem] border border-gold/45 bg-gradient-to-br from-gold/20 via-charcoal to-obsidian p-6 hover:border-gold/70 hover:-translate-y-0.5 transition-all">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">🧠</span>
        <p className="text-gold text-[10px] uppercase tracking-[0.2em] font-semibold">Coach Asa · your operator</p>
      </div>
      <p className="text-white text-lg sm:text-xl font-semibold leading-snug text-balance mb-5">{line}</p>
      {/* chat-input-styled invitation */}
      <div className="flex items-center gap-2 bg-obsidian/60 border border-smoke rounded-2xl px-4 py-3 group-hover:border-gold/50 transition-colors">
        <span className="flex-1 text-ivory/40 text-[15px]">Tell me about your day…</span>
        <span className="h-8 w-8 shrink-0 rounded-full bg-gold text-obsidian flex items-center justify-center font-bold group-hover:scale-105 transition-transform">➤</span>
      </div>
      <Celebration trigger={perfectDay} message={winAffirmation('allDone')} dedupeKey={`perfectday-${today}`} />
    </Link>
  )
}
