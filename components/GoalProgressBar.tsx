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
    <div className="flex items-center gap-2.5 mt-1.5 pt-1.5 border-t border-smoke/60 text-[9.5px] text-ivory/40">
      <span className="uppercase tracking-wider font-semibold text-ivory/30">14d</span>
      <span>Workout {workoutPct}%</span>
      <span>Nutrition {nutritionPct}%</span>
    </div>
  )
}

// Today's calories — same adjustment-aware budget/logged numbers as
// /plan/today (getEffectiveCalorieBudget + today's real challenge_food_log
// rows), just surfaced here too so this card never disagrees with it.
// Renders nothing when there's no real budget yet, same "don't show a
// fabricated number" rule as the weight math above.
function CalorieLine({ loggedToday, budgetToday }: { loggedToday: number; budgetToday: number | null }) {
  if (budgetToday == null) return null
  const remaining = Math.max(0, budgetToday - loggedToday)
  return (
    <p className="text-[10.5px] text-ivory/50 mt-1">
      <span className="text-[#E5A93C] font-semibold">{Math.round(loggedToday)}</span> of {Math.round(budgetToday)} cal today &middot; {Math.round(remaining)} left
    </p>
  )
}

// Just the headline + track + calorie line, no card chrome and no Link
// wrapper — for embedding inline inside the feed dock (Asa's approved
// mockup, 2026-08-29: progress and calories merged into the one caption
// row instead of a separate card below the feed). Same real math as the
// full card below; this is a render split, not a second source of truth.
export function GoalProgressCompact({
  startWeight, currentWeight, goalWeight, goal, calorieLoggedToday = 0, calorieBudgetToday = null,
}: {
  startWeight: number
  currentWeight: number
  goalWeight: number
  goal: 'lose' | 'gain' | 'maintain'
  calorieLoggedToday?: number
  calorieBudgetToday?: number | null
}) {
  if (goal === 'maintain') {
    return (
      <div className="rounded-xl px-2.5 py-2" style={{ fontFamily: 'var(--font-poppins)', background: 'linear-gradient(135deg, rgba(20,20,20,0.7), rgba(0,0,0,0.5))', border: '1.5px solid rgba(233,160,160,0.85)', boxShadow: '0 0 28px 2px rgba(233,160,160,0.75)' }}>
        <p className="text-white text-xs font-semibold">Holding steady at {Math.round(currentWeight)} lbs</p>
        <CalorieLine loggedToday={calorieLoggedToday} budgetToday={calorieBudgetToday} />
      </div>
    )
  }

  const span = goal === 'lose' ? startWeight - goalWeight : goalWeight - startWeight
  const progressed = goal === 'lose' ? startWeight - currentWeight : currentWeight - startWeight
  const pct = span > 0 ? Math.max(0, Math.min(100, Math.round((progressed / span) * 100))) : 0
  const moved = Math.max(0, Math.round(Math.abs(progressed)))
  const remaining = Math.max(0, Math.round(span - progressed))
  const verb = goal === 'lose' ? 'down' : 'up'
  // $ before both numbers, Asa's ask 2026-08-30 — a deliberate stylistic
  // choice for this readout, not a currency claim.
  const budgetLabel = calorieBudgetToday != null
    ? `$${Math.round(calorieLoggedToday).toLocaleString()}/$${Math.round(calorieBudgetToday).toLocaleString()} cal`
    : null

  return (
    /* Second fix (translucent white track alone) still washed out on a
       real phone, Asa's catch 2026-08-29 (twice) — both the TEXT and the
       track were losing contrast against bright/busy video, and at 0%
       progress (a fresh account, exactly what he was looking at) there's
       no gold fill yet to fall back on. A real solid card behind the
       whole block — text included, not just the track — guarantees
       contrast regardless of what's playing behind it, same principle as
       the self-talk card above it. Pink glow (Asa's ask) makes the whole
       card stand out from the feed instead of blending into it. Gradient
       background (not flat) matches the chat box's own treatment. */
    <div className="rounded-xl px-2.5 py-2" style={{ fontFamily: 'var(--font-poppins)', background: 'linear-gradient(135deg, rgba(20,20,20,0.7), rgba(0,0,0,0.5))', border: '1.5px solid rgba(233,160,160,0.85)', boxShadow: '0 0 28px 2px rgba(233,160,160,0.75)' }}>
      {/* Calorie readout pushed to the far right of the row instead of
          inline after the weight text — Asa's ask, 2026-08-30. */}
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[12px] font-semibold text-white m-0">
          {moved > 0 ? `${moved} lbs ${verb}` : "Let's get started"}{remaining > 0 ? ` · ${remaining} to go` : moved > 0 ? ' · goal reached' : ''}
        </p>
        {budgetLabel && <span className="text-[12px] font-bold text-[#E5A93C] whitespace-nowrap">{budgetLabel}</span>}
      </div>
      <div className="relative h-2 rounded-full mt-2.5" style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.4)' }}>
        <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 4)}%`, background: 'linear-gradient(90deg, #E5A93C, #f2c879, #E9A0A0)', boxShadow: '0 0 6px rgba(229,169,60,0.6)' }} />
        <span
          aria-hidden
          className="absolute flex items-center justify-center rounded-full"
          style={{ left: `${Math.max(pct, 4)}%`, top: '50%', transform: 'translate(-50%, -50%) scaleX(-1)', width: 20, height: 20, fontSize: 13, background: 'radial-gradient(circle, rgba(233,160,160,0.55), transparent 70%)' }}
        >
          🏃🏿‍♀️
        </span>
      </div>
    </div>
  )
}

export default function GoalProgressBar({
  startWeight, currentWeight, goalWeight, goal, workoutConsistencyPct, nutritionConsistencyPct,
  calorieLoggedToday = 0, calorieBudgetToday = null,
}: {
  startWeight: number
  currentWeight: number
  goalWeight: number
  goal: 'lose' | 'gain' | 'maintain'
  workoutConsistencyPct: number
  nutritionConsistencyPct: number
  calorieLoggedToday?: number
  calorieBudgetToday?: number | null
}) {
  if (goal === 'maintain') {
    return (
      <Link href="/plan/checkin" className="block rounded-2xl p-3" style={{ background: '#083023', border: '1px solid rgba(229,169,60,0.3)', fontFamily: 'var(--font-poppins)' }}>
        <p className="text-[#E5A93C] text-[9px] uppercase tracking-wider font-semibold mb-0.5">Your progress</p>
        <p className="text-white font-bold text-sm">Holding steady at {Math.round(currentWeight)} lbs</p>
        <p className="text-white/50 text-[11px] mt-0.5">Right around your goal of {Math.round(goalWeight)} lbs — consistency is the whole game now.</p>
        <CalorieLine loggedToday={calorieLoggedToday} budgetToday={calorieBudgetToday} />
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
    <Link href="/plan/checkin" className="block rounded-2xl p-3" style={{ background: '#083023', border: '1px solid rgba(229,169,60,0.3)', fontFamily: 'var(--font-poppins)' }}>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[#E5A93C] text-[9px] uppercase tracking-wider font-semibold">Your progress</p>
        <p className="text-white font-bold text-xs">
          {moved > 0 ? `${moved} lbs ${verb}` : "Let's get started"}{remaining > 0 ? ` · ${remaining} to go` : moved > 0 ? ' · goal reached' : ''}
        </p>
      </div>

      <div className="relative h-2 rounded-full overflow-visible mb-1.5" style={{ background: '#021F16', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #044A34, #0f7a53, #E9A0A0)', boxShadow: '0 0 16px 1px rgba(229,169,60,0.4)' }} />
        {TICKS.map((t) => (
          <div key={t} className="absolute top-0 bottom-0 w-px" style={{ left: `${t}%`, background: 'rgba(2,31,22,0.6)' }} />
        ))}
        {/* Position marker — a real person on the track, not just an
            abstract fill edge. Faces forward into the direction of
            progress (mirrored, since the emoji glyph itself faces left).
            Asa's call, 2026-08-25. */}
        <span
          aria-hidden
          className="absolute flex items-center justify-center rounded-full transition-all duration-700"
          style={{
            left: `${pct}%`, top: '50%', transform: 'translate(-50%, -50%) scaleX(-1)',
            width: 22, height: 22, fontSize: 14,
            background: 'radial-gradient(circle, rgba(233,160,160,0.35), transparent 70%)',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
          }}
        >
          🏃🏿‍♀️
        </span>
      </div>

      <div className="flex items-center justify-between text-[9.5px] text-white/40">
        <span>{Math.round(startWeight)} lbs</span>
        <span className="text-[#E5A93C] font-semibold">{pct}%</span>
        <span>{Math.round(goalWeight)} lbs goal</span>
      </div>
      <CalorieLine loggedToday={calorieLoggedToday} budgetToday={calorieBudgetToday} />
      <ConsistencyChip workoutPct={workoutConsistencyPct} nutritionPct={nutritionConsistencyPct} />
    </Link>
  )
}
