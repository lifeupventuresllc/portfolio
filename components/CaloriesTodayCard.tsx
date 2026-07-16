'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

// Home-dashboard "calories left today" box — LIVE: reflects what they've actually
// logged. Calories are money 💵, so it shows "$X left" of today's budget.
// Budget flexes by workout/rest day (passed from the server).

export default function CaloriesTodayCard({ budget, dayType }: { budget: number; dayType?: 'workout' | 'rest' | null }) {
  const [spent, setSpent] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/plan/food-log')
      .then((r) => r.json())
      .then((d) => setSpent(Number(d?.totals?.calories) || 0))
      .catch(() => setSpent(0))
  }, [])

  const left = spent == null ? budget : Math.max(0, budget - spent)
  const over = spent != null && spent > budget
  const pct = budget > 0 && spent != null ? Math.min(100, Math.round((spent / budget) * 100)) : 0

  return (
    <Link href="/plan/today" className="group block bg-gradient-to-br from-charcoal to-obsidian border border-smoke rounded-[2rem] p-6 hover:border-gold/60 hover:-translate-y-0.5 transition-all">
      <div className="flex items-center justify-between mb-1">
        <p className="text-gold text-[10px] uppercase tracking-wider font-semibold">Calories left today 💵</p>
        {dayType && <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${dayType === 'workout' ? 'bg-gold/15 text-gold' : 'bg-white/8 text-ivory/60'}`}>{dayType === 'workout' ? '💪🏽 Workout' : '🌿 Rest'}</span>}
      </div>
      <p className={`font-bold text-4xl leading-none ${over ? 'text-amber-400' : 'text-gold'}`}>{over ? '-' : ''}${over ? (spent! - budget) : left}</p>
      <p className="text-ivory/40 text-[11px] mt-1">{over ? 'over your budget — fresh start tomorrow' : `of your $${budget} budget`}</p>
      {/* live spend bar */}
      <div className="h-1.5 rounded-full bg-white/8 overflow-hidden mt-3">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: over ? '#f59e0b' : '#c9a84c' }} />
      </div>
      <span className="text-ivory/40 text-[11px] mt-3 inline-block group-hover:text-gold transition-colors">Log / track →</span>
    </Link>
  )
}
