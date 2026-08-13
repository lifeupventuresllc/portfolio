import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import ClientMenu from '@/components/ClientMenu'
import CaloriesTodayCard from '@/components/CaloriesTodayCard'
import WorkoutStatusCard from '@/components/WorkoutStatusCard'
import StreakChip from '@/components/StreakChip'
import CoachHero from '@/components/CoachHero'
import FeedbackCard from '@/components/FeedbackCard'
import GoalProgressBar from '@/components/GoalProgressBar'
import WeeklyCheckinPrompt from '@/components/WeeklyCheckinPrompt'
import TimezoneSync from '@/components/TimezoneSync'
import { LIVE_CALL } from '@/lib/live-call'
import { affirmationForDay } from '@/lib/affirmations'
import { localDateISO, localMondayIndex, localDayNumber, addDaysISO } from '@/lib/localdate'
import { getApprovedTodayAdjustment } from '@/lib/fos/context'
import type { WorkoutProgram } from '@/lib/workout'
import type { WeekPlan } from '@/lib/meal-plan'

export const dynamic = 'force-dynamic'

export default async function PlanDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/plan')

  const svc = createServiceClient()

  // Find this member's enrollment (by account, then by email for guest purchases)
  let { data: enrollment } = await svc
    .from('challenge_enrollments')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .maybeSingle()

  if (!enrollment && user.email) {
    const { data: byEmail } = await svc
      .from('challenge_enrollments')
      .select('*')
      .eq('email', user.email)
      .order('created_at', { ascending: false })
      .maybeSingle()
    if (byEmail) {
      if (!byEmail.user_id) await svc.from('challenge_enrollments').update({ user_id: user.id }).eq('id', byEmail.id)
      enrollment = byEmail
    }
  }

  const firstName = (enrollment?.name || user.email?.split('@')[0] || 'there').split(' ')[0]

  const shell = (children: React.ReactNode, menu: React.ReactNode = null) => (
    <div className="min-h-screen bg-obsidian px-4 py-12">
      <TimezoneSync />
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6 bg-obsidian border border-white/10 rounded-2xl px-5 py-4">
          <div>
            <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-1">Life-Up Fitness</p>
            <h1 className="text-2xl font-bold text-white">Hey {firstName} 👋</h1>
            <StreakChip />
          </div>
          {menu}
        </div>
        {children}
      </div>
    </div>
  )

  // Not enrolled
  if (!enrollment) {
    return shell(
      <div className="bg-charcoal border border-smoke rounded-3xl p-8 text-center">
        <p className="text-white font-semibold mb-2">You&apos;re not enrolled yet</p>
        <p className="text-ivory/50 text-sm mb-6">Join the Snatched Without Starving challenge to unlock your custom plan.</p>
        <Link href="/challenge" className="inline-block bg-gold text-obsidian px-8 py-3.5 font-bold text-sm uppercase tracking-wider rounded-2xl">See the challenge</Link>
      </div>
    )
  }

  // Enrolled but hasn't done intake
  if (!enrollment.intake_completed) {
    return shell(
      <div className="bg-charcoal border border-gold/30 rounded-3xl p-8 text-center">
        <p className="text-white font-semibold mb-2">One step to unlock your plan</p>
        <p className="text-ivory/50 text-sm mb-6">Tell us your stats and goals — we&apos;ll generate your custom workout and calorie-matched meal plan in seconds.</p>
        <Link href="/plan/intake" className="inline-block bg-gold text-obsidian px-8 py-3.5 font-bold text-sm uppercase tracking-wider rounded-2xl">Build my plan</Link>
      </div>
    )
  }

  const todayIso = localDateISO()
  const consistencyWindowStart = addDaysISO(todayIso, -13) // 14 days incl. today, ~2 weeks
  const [{ data: workoutPlan }, { data: nutritionPlan }, { data: doneRows }, todayAdjustment, { data: intakeRow }, { data: latestCheckin }, { data: foodLogRows }] = await Promise.all([
    svc.from('challenge_workout_plans').select('plan').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_nutrition_plans').select('calories, meals').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_progress').select('logged_on, measurements').eq('enrollment_id', enrollment.id).eq('note', '__daily__'),
    getApprovedTodayAdjustment(enrollment.id as string, todayIso),
    svc.from('challenge_intake').select('weight_lbs, target_lbs, goal, days_per_week').eq('enrollment_id', enrollment.id).maybeSingle(),
    svc.from('challenge_checkins').select('weight_lbs, submitted_at').eq('enrollment_id', enrollment.id).not('weight_lbs', 'is', null).order('submitted_at', { ascending: false }).limit(1).maybeSingle(),
    svc.from('challenge_food_log').select('logged_on').eq('enrollment_id', enrollment.id).gte('logged_on', consistencyWindowStart),
  ])

  const weekPlan = (nutritionPlan?.meals && typeof nutritionPlan.meals === 'object' && 'days' in nutritionPlan.meals)
    ? (nutritionPlan.meals as WeekPlan) : null

  // ── TODAY at a glance — powers the simple home dashboard (workout · calories · meals) ──
  // All day-boundaries use the user's LOCAL day (their timezone), not UTC.
  const mealIdx = localMondayIndex() // Mon=0 … Sat=5, Sun=6
  const todayMeals = weekPlan && mealIdx <= 5 ? weekPlan.days[mealIdx] : null
  let calBudget = (todayMeals?.target && todayMeals.target > 0) ? todayMeals.target : (Number(nutritionPlan?.calories) || 0)
  // Coach Asa adjusted today's calories? Reflect it in the budget.
  const calDelta = Number(todayAdjustment?.nutritionChange?.calorieDelta) || 0
  if (calDelta) calBudget = Math.max(0, calBudget + calDelta)
  const todayDayType = todayMeals?.dayType ?? null

  const program = (workoutPlan?.plan as WorkoutProgram) || null
  let todayWorkout: { title: string; muscles?: string[] } | null = null
  if (program) {
    const numDays = program.track === 'home' ? (program.home?.days.length || 1) : (program.gymDays?.length || 1)
    const completed = (doneRows || []).filter((r) => (r.measurements as { workout?: boolean } | null)?.workout).length
    const startDay = numDays > 0 ? completed % numDays : 0
    if (program.track === 'home') {
      const d = program.home?.days[startDay]
      if (d) todayWorkout = { title: d.title }
    } else {
      const d = program.gymDays?.[startDay]
      if (d) todayWorkout = { title: d.title, muscles: d.muscles }
    }
  }
  // Approved cardio swap — show the title she'll actually get when she taps Start.
  if (todayWorkout && todayAdjustment?.workoutChange?.contentSwap === 'cardio') {
    todayWorkout = { title: 'Cardio & Conditioning' }
  }
  const affirmation = affirmationForDay(localDayNumber())

  // challenge_intake has no goal_weight_lbs column — it's always derived from
  // weight_lbs +/- target_lbs (a delta, defaults to 10), same as
  // app/api/challenge/intake/route.ts computes it at intake time.
  const startWeight = Number(intakeRow?.weight_lbs) || 0
  const targetDelta = Number(intakeRow?.target_lbs) || 10
  const goalWeight = intakeRow?.goal === 'gain' ? startWeight + targetDelta : startWeight - targetDelta
  const currentWeight = Number(latestCheckin?.weight_lbs) || startWeight
  const goalDirection = (intakeRow?.goal === 'gain' || intakeRow?.goal === 'maintain' ? intakeRow.goal : 'lose') as 'lose' | 'gain' | 'maintain'

  // Consistency stat — deliberately separate from the weight math above, never
  // blended into it (a good-effort stretch with a stubborn scale shouldn't make the
  // goal bar lie in the "good" direction). Shown alongside it, smaller, clearly
  // labeled as consistency, not progress. 14-day window: workouts = completed vs.
  // her own planned days/week (capped 100%, no plan yet = 0 rather than divide-by-
  // zero); nutrition = days she logged anything, a real-but-honest proxy for
  // engagement — not strict calorie-budget adherence, which would need reconstructing
  // each historical day's day-type-specific target and isn't worth that complexity
  // for a small dashboard stat.
  const workoutDaysInWindow = new Set(
    (doneRows || [])
      .filter((r) => (r as { logged_on?: string }).logged_on! >= consistencyWindowStart && (r.measurements as { workout?: boolean } | null)?.workout)
      .map((r) => (r as { logged_on?: string }).logged_on)
  ).size
  const plannedPerWeek = Number(intakeRow?.days_per_week) || 0
  const workoutConsistencyPct = plannedPerWeek > 0 ? Math.min(100, Math.round((workoutDaysInWindow / (plannedPerWeek * 2)) * 100)) : 0
  const nutritionDaysLogged = new Set((foodLogRows || []).map((r) => r.logged_on as string)).size
  const nutritionConsistencyPct = Math.min(100, Math.round((nutritionDaysLogged / 14) * 100))

  // Did she already finish today's workout? (server truth for the workout ring's ✅ state)
  const workoutDoneToday = (doneRows || []).some(
    (r) => (r as { logged_on?: string }).logged_on === todayIso && (r.measurements as { workout?: boolean } | null)?.workout
  )

  // Weekly check-in nudge — the goal bar above and Coach Asa's pace-aware replies
  // both depend on real weigh-ins, and nothing was ever prompting her for one (the
  // checkin page is fully opt-in). Due every 7 days from her last real weigh-in, or
  // from enrollment start if she's never checked in — matches the checkin page's
  // own "check in with me every week" copy, not a new cadence invented here.
  const lastCheckinAt = (latestCheckin?.submitted_at as string | undefined) || (enrollment.started_at as string | undefined)
  const daysSinceCheckin = lastCheckinAt ? Math.floor((Date.parse(todayIso) - Date.parse(lastCheckinAt)) / 86400000) : 0
  const checkinDue = daysSinceCheckin >= 7

  return shell(
    <div className="space-y-5">
      {/* Tight above-the-fold hierarchy: self-talk → goal progress → today's
          numbers → Coach Asa as the dominant centerpiece. Everything else that
          used to live here (Monday memo, eating-out, level-up nudge, the
          optional-intake invite) moved to /plan/today — this page stays a
          quick glance, not a scroll. */}

      {checkinDue && <WeeklyCheckinPrompt firstName={firstName} todayIso={todayIso} />}

      {/* Self-talk — compact banner */}
      <div className="luf-breathe rounded-2xl border border-emerald-400/25 bg-charcoal/90 backdrop-blur-md bg-gradient-to-br from-emerald-500/10 via-charcoal to-obsidian px-5 py-3.5 text-center shadow-[0_0_28px_-10px_rgba(52,211,153,0.45)]">
        <p className="text-emerald-300/70 text-[9px] uppercase tracking-[0.25em] font-semibold mb-1">Today’s self-talk</p>
        <p className="text-white text-[15px] sm:text-base leading-snug font-medium text-balance">“{affirmation}”</p>
      </div>

      <GoalProgressBar startWeight={startWeight} currentWeight={currentWeight} goalWeight={goalWeight} goal={goalDirection} workoutConsistencyPct={workoutConsistencyPct} nutritionConsistencyPct={nutritionConsistencyPct} />

      {/* Supporting, side by side — calories (left) · workout (right) */}
      <div className="grid grid-cols-2 gap-3.5">
        <CaloriesTodayCard budget={calBudget} dayType={todayDayType} compact />
        <WorkoutStatusCard title={todayWorkout?.title ?? null} muscles={todayWorkout?.muscles} doneTodayServer={workoutDoneToday} adjusted={todayAdjustment?.workoutChange ?? null} compact />
      </div>

      {/* Coach Asa — the dominant centerpiece, circular frame around the
          unchanged chat interface (a hard circular clip would cut off real
          text/buttons, so the "circle" reads through a glow ring + aspect-
          square shape rather than clipping the rectangular content inside). */}
      <div className="relative aspect-square rounded-full bg-white shadow-[0_0_60px_-6px_rgba(255,255,255,0.6),0_0_160px_24px_rgba(201,168,76,0.45)] ring-4 ring-gold/40 p-7 overflow-y-auto">
        <CoachHero firstName={firstName} />
      </div>

      {/* Persistent feedback surface — always here, not just a popup */}
      <FeedbackCard />
    </div>,
    <ClientMenu key="menu" firstName={firstName} liveUrl={LIVE_CALL.zoomUrl || undefined} callAccess={enrollment.tier === 'inner_circle' ? 'weekly' : enrollment.tier === 'challenge' ? 'monthly' : 'none'} />
  )
}
