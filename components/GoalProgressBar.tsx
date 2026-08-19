import Link from 'next/link'

// A real ruler, not a rounded pill — small tick marks at regular intervals, a
// filled segment in the app's warm-rose accent, start/current/goal labels at
// each end. The headline number is the motivating one (lbs down / to go), the
// bar itself is the visual "how far along" read Asa asked to be prominent.
// The whole card links to /plan/checkin (the fuller progress/check-in page) —
// every dashboard card should have somewhere to go, not just be a static stat.
const TICKS = Array.from({ length: 11 }, (_, i) => i * 10) // 0,10,...,100

// Small, separate consistency chip — deliberately NOT part of the bar's fill
// math above (see app/plan/page.tsx for why). Lives inside this same card,
// smaller, so it's visible without becoming its own dashboard real estate.
function ConsistencyChip({ workoutPct, nutritionPct }: { workoutPct: number; nutritionPct: number }) {
  return (
    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-smoke/60 text-[11px] text-ivory/40">
      <span className="uppercase tracking-wider font-semibold text-ivory/30">Consistency · 14d</span>
      <span>Workout {workoutPct}%</span>
      <span>Nutrition {nutritionPct}%</span>
    </div>
  )
}

export default function GoalProgressBar({
  startWeight, currentWeight, goalWeight, goal, workoutConsistencyPct, nutritionConsistencyPct,
}: {
  startWeight: number
  currentWeight: number
  goalWeight: number
  goal: 'lose' | 'gain' | 'maintain'
  workoutConsistencyPct: number
  nutritionConsistencyPct: number
}) {
  if (goal === 'maintain') {
    return (
      <Link href="/plan/checkin" className="block rounded-[2rem] p-5" style={{ background: '#083023', border: '1px solid rgba(229,169,60,0.3)' }}>
        <p className="text-[#E5A93C] text-[10px] uppercase tracking-wider font-semibold mb-1">Your progress</p>
        <p className="text-white font-bold text-lg">Holding steady at {Math.round(currentWeight)} lbs</p>
        <p className="text-white/50 text-sm mt-0.5">Right around your goal of {Math.round(goalWeight)} lbs — consistency is the whole game now.</p>
        <ConsistencyChip workoutPct={workoutConsistencyPct} nutritionPct={nutritionConsistencyPct} />
      </Link>
    )
  }

  const span = goal === 'lose' ? startWeight - goalWeight : goalWeight - startWeight
  const progressed = goal === 'lose' ? startWeight - currentWeight : currentWeight - startWeight
  const pct = span > 0 ? Math.max(0, Math.min(100, Math.round((progressed / span) * 100))) : 0
  const moved = Math.max(0, Math.round(Math.abs(progressed)))
  const remaining = Math.max(0, Math.round(span - progressed))
  const verb = goal === 'lose' ? 'down' : 'up'

  return (
    <Link href="/plan/checkin" className="block rounded-[2rem] p-5" style={{ background: '#083023', border: '1px solid rgba(229,169,60,0.3)' }}>
      <p className="text-[#E5A93C] text-[10px] uppercase tracking-wider font-semibold mb-1">Your progress</p>
      <p className="text-white font-bold text-lg mb-4">
        {moved > 0 ? `${moved} lbs ${verb}` : "Let's get started"}{remaining > 0 ? ` · ${remaining} to go` : moved > 0 ? ' · goal reached' : ''}
      </p>

      <div className="relative h-3 rounded-full overflow-visible mb-2" style={{ background: '#021F16', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #044A34, #0f7a53)', boxShadow: '0 0 16px 1px rgba(229,169,60,0.4)' }} />
        {TICKS.map((t) => (
          <div key={t} className="absolute top-0 bottom-0 w-px" style={{ left: `${t}%`, background: 'rgba(2,31,22,0.6)' }} />
        ))}
      </div>

      <div className="flex items-center justify-between text-[11px] text-white/40">
        <span>{Math.round(startWeight)} lbs</span>
        <span className="text-[#E5A93C] font-semibold">{pct}%</span>
        <span>{Math.round(goalWeight)} lbs goal</span>
      </div>
      <ConsistencyChip workoutPct={workoutConsistencyPct} nutritionPct={nutritionConsistencyPct} />
    </Link>
  )
}
