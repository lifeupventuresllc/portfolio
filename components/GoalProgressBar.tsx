// A real ruler, not a rounded pill — small tick marks at regular intervals, a
// filled segment in the app's warm-rose accent, start/current/goal labels at
// each end. The headline number is the motivating one (lbs down / to go), the
// bar itself is the visual "how far along" read Asa asked to be prominent.
const TICKS = Array.from({ length: 11 }, (_, i) => i * 10) // 0,10,...,100

// Small, separate consistency chip — deliberately NOT part of the bar's fill
// math above (see app/plan/page.tsx for why). Lives inside this same card,
// smaller, so it's visible without becoming its own dashboard real estate.
function ConsistencyChip({ workoutPct, nutritionPct }: { workoutPct: number; nutritionPct: number }) {
  return (
    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-smoke/60 text-[11px] text-ivory/40">
      <span className="uppercase tracking-wider font-semibold text-ivory/30">Consistency · 14d</span>
      <span>🏋🏽 {workoutPct}%</span>
      <span>🍽️ {nutritionPct}%</span>
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
      <div className="bg-charcoal border border-rose/30 rounded-[2rem] p-5">
        <p className="text-rose text-[10px] uppercase tracking-wider font-semibold mb-1">Your progress</p>
        <p className="text-white font-bold text-lg">Holding steady at {Math.round(currentWeight)} lbs 💪🏽</p>
        <p className="text-ivory/50 text-sm mt-0.5">Right around your goal of {Math.round(goalWeight)} lbs — consistency is the whole game now.</p>
        <ConsistencyChip workoutPct={workoutConsistencyPct} nutritionPct={nutritionConsistencyPct} />
      </div>
    )
  }

  const span = goal === 'lose' ? startWeight - goalWeight : goalWeight - startWeight
  const progressed = goal === 'lose' ? startWeight - currentWeight : currentWeight - startWeight
  const pct = span > 0 ? Math.max(0, Math.min(100, Math.round((progressed / span) * 100))) : 0
  const moved = Math.max(0, Math.round(Math.abs(progressed)))
  const remaining = Math.max(0, Math.round(span - progressed))
  const verb = goal === 'lose' ? 'down' : 'up'

  return (
    <div className="bg-charcoal border border-rose/30 rounded-[2rem] p-5">
      <p className="text-rose text-[10px] uppercase tracking-wider font-semibold mb-1">Your progress</p>
      <p className="text-white font-bold text-lg mb-4">
        {moved > 0 ? `${moved} lbs ${verb}` : "Let's get started"}{remaining > 0 ? ` · ${remaining} to go` : moved > 0 ? ' · goal reached 🎉' : ''}
      </p>

      <div className="relative h-3 rounded-full bg-obsidian border border-smoke overflow-visible mb-2">
        <div className="h-full rounded-full bg-rose transition-all duration-700" style={{ width: `${pct}%`, boxShadow: '0 0 16px 1px rgba(234,92,135,0.55)' }} />
        {TICKS.map((t) => (
          <div key={t} className="absolute top-0 bottom-0 w-px bg-obsidian/60" style={{ left: `${t}%` }} />
        ))}
      </div>

      <div className="flex items-center justify-between text-[11px] text-ivory/40">
        <span>{Math.round(startWeight)} lbs</span>
        <span className="text-rose font-semibold">{pct}%</span>
        <span>{Math.round(goalWeight)} lbs goal</span>
      </div>
      <ConsistencyChip workoutPct={workoutConsistencyPct} nutritionPct={nutritionConsistencyPct} />
    </div>
  )
}
