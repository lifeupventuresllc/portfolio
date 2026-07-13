'use client'

import { useEffect, useState } from 'react'

// Animated grocery-budget bar. Sweeps its fill from 0 → actual on every build,
// green when she's under budget, red when over. Reduced-motion safe.
export default function BudgetBar({ cost, budget }: { cost: number; budget: number }) {
  const target = budget > 0 ? Math.min((cost / budget) * 100, 100) : 0
  const under = cost <= budget
  const [width, setWidth] = useState(0)

  // Re-sweep whenever the numbers change (a rebuild).
  useEffect(() => {
    setWidth(0)
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setWidth(target)))
    return () => cancelAnimationFrame(id)
  }, [target])

  return (
    <div className="mt-3">
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-ivory/50 text-[11px] uppercase tracking-wider">Your week</span>
        <span className={`text-xs font-bold ${under ? 'text-green-400' : 'text-red-400'}`}>
          ~${cost}<span className="text-ivory/40 font-normal"> / ${budget}</span>
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-obsidian border border-smoke overflow-hidden">
        <div
          role="progressbar"
          aria-valuenow={cost}
          aria-valuemin={0}
          aria-valuemax={budget}
          className={`h-full rounded-full transition-[width] duration-[900ms] ease-out motion-reduce:transition-none ${under ? 'bg-gradient-to-r from-green-500/70 to-green-400' : 'bg-gradient-to-r from-red-500/70 to-red-400'}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}
