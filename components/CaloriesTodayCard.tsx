'use client'

import Link from 'next/link'
import { useState } from 'react'
import Ring from '@/components/Ring'
import Celebration from '@/components/Celebration'
import { useLiveRefresh, localTodayISO } from '@/lib/useLiveRefresh'
import { winAffirmation } from '@/lib/affirmations'

// Home-dashboard "calories left today" box. Calories are money 💵 — a ring FILLS as
// she logs food, so at a glance she sees how much budget is left. Auto-refreshes when
// she returns to the tab or logs food, and celebrates when she nails her protein goal.
export default function CaloriesTodayCard({ budget, dayType }: { budget: number; dayType?: 'workout' | 'rest' | null }) {
  const [data, setData] = useState<{ calories: number; protein: number; proteinTarget: number } | null>(null)

  useLiveRefresh(() => {
    fetch('/api/plan/food-log')
      .then((r) => r.json())
      .then((d) => setData({
        calories: Number(d?.totals?.calories) || 0,
        protein: Number(d?.totals?.protein_g) || 0,
        proteinTarget: Number(d?.target?.protein_g) || 0,
      }))
      .catch(() => setData({ calories: 0, protein: 0, proteinTarget: 0 }))
  })

  const spent = data?.calories ?? null
  const left = spent == null ? budget : Math.max(0, budget - spent)
  const over = spent != null && spent > budget
  const pct = budget > 0 && spent != null ? Math.min(100, Math.round((spent / budget) * 100)) : 0
  const ringColor = over ? '#f59e0b' : '#c9a84c'
  const today = localTodayISO()

  // Win = fueled enough to hit the protein target while staying at/under budget.
  const proteinHit = !!data && data.proteinTarget > 0 && data.protein >= data.proteinTarget
  const win = !!spent && spent > 0 && proteinHit && !over

  return (
    <Link href="/plan/today" className="group block bg-gradient-to-br from-charcoal to-obsidian border border-smoke rounded-[2rem] p-6 hover:border-gold/60 hover:-translate-y-0.5 transition-all">
      <div className="flex items-center gap-5">
        <Ring pct={over ? 100 : pct} size={94} stroke={9} color={ringColor}>
          <div className="text-center leading-none">
            <p className={`font-bold text-lg ${over ? 'text-amber-400' : 'text-gold'}`}>{over ? '-' : ''}${over ? (spent! - budget) : left}</p>
            <p className="text-ivory/40 text-[8px] uppercase tracking-[0.15em] mt-1">{over ? 'over' : 'left'}</p>
          </div>
        </Ring>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-gold text-[10px] uppercase tracking-wider font-semibold">Calories left today 💵</p>
            {dayType && <span className={`shrink-0 text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${dayType === 'workout' ? 'bg-gold/15 text-gold' : 'bg-white/8 text-ivory/60'}`}>{dayType === 'workout' ? '💪🏽 Workout' : '🌿 Rest'}</span>}
          </div>
          <p className="text-white text-sm font-medium">
            {spent == null ? `$${budget} to spend today` : over ? 'Over budget — fresh start tomorrow' : `$${spent} spent · $${left} left`}
          </p>
          {data && data.proteinTarget > 0 && (
            <p className="text-ivory/45 text-[11px] mt-1">Protein {data.protein}/{data.proteinTarget}g {proteinHit ? '✓' : ''}</p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-smoke/40">
        <span className="text-ivory/45 text-[11px] group-hover:text-gold transition-colors">＋ Log food</span>
        <span className="text-gold/80 text-[11px] font-semibold group-hover:text-gold transition-colors">View today’s meal plan →</span>
      </div>
      <Celebration trigger={win} message={winAffirmation('calories')} dedupeKey={`calories-${today}`} />
    </Link>
  )
}
