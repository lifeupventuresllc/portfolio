import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import FoodLog, { type PlannedItem } from '@/components/FoodLog'
import { getTimezone, localMondayIndex, localDateISO } from '@/lib/localdate'
import { getApprovedTodayAdjustment } from '@/lib/fos/context'
import { getEffectiveCalorieBudget, isEatingOutToday, resolveTodayCalorieTarget, resolvedDayType, scheduleDayType, workoutTodayStatus, type DayTargets } from '@/lib/fos/effective-plan'
import type { WeekPlan } from '@/lib/meal-plan'
import { SHOW_CALORIE_COUNTER } from '@/lib/feature-flags'

export const dynamic = 'force-dynamic'

// "Meal Prep" — the one seamless nutrition destination (Asa's call): viewing
// today's real meal plan and logging food used to be two different things
// competing for space on the For You page (a full FoodLog card plus a
// separate "Log food" pill pointing at the same card). Folded into one real
// screen instead — this page IS FoodLog, exactly as it always worked
// (search/voice/AI-estimate/manual entry, planned-meal quick-log, the full
// logged list), just moved off the main page so that one stays a glance,
// not a second card to scroll past.
export default async function NutritionPage() {
  // Hidden from testers for now (Asa's ask, 2026-08-30) — a direct URL visit
  // or an old link shouldn't reach an incomplete page any more than tapping
  // through from the dashboard can (NextActionCard's meal expansion route is
  // gated the same way). Flip SHOW_CALORIE_COUNTER back on when it's ready.
  if (!SHOW_CALORIE_COUNTER) redirect('/plan')
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/plan/nutrition')

  const svc = createServiceClient()
  let { data: enrollment } = await svc.from('challenge_enrollments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc.from('challenge_enrollments').select('*').eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
    enrollment = byEmail || null
  }
  if (!enrollment) redirect('/plan')

  const tz = getTimezone()
  const todayIso = localDateISO(tz)
  const mealIdx = localMondayIndex(tz)
  const [{ data: nutritionPlan }, todayAdjustment, { data: todayProgress }, { data: recentWorkoutActions }] = await Promise.all([
    svc.from('challenge_nutrition_plans').select('meals, calories, day_targets').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle(),
    getApprovedTodayAdjustment(enrollment.id as string, todayIso),
    // Same real workout-brain signal /plan/today reads, so this page's
    // number never disagrees with the dashboard's (Asa's ask, 2026-09-07 —
    // the rest/workout split has to actually know whether she trained today,
    // not just guess from a Mon-Sat calendar).
    svc.from('challenge_progress').select('measurements').eq('enrollment_id', enrollment.id).eq('note', '__daily__').eq('logged_on', todayIso).maybeSingle(),
    svc.from('next_action_log').select('shown_at, skipped_at, superseded_at').eq('enrollment_id', enrollment.id).eq('kind', 'workout').gte('shown_at', new Date(Date.now() - 2 * 86400000).toISOString()).order('shown_at', { ascending: false }),
  ])

  const weekPlan = (nutritionPlan?.meals && typeof nutritionPlan.meals === 'object' && 'days' in nutritionPlan.meals)
    ? (nutritionPlan.meals as WeekPlan) : null
  const todayMeals = weekPlan && mealIdx <= 5 ? weekPlan.days[mealIdx] : null
  const planned: PlannedItem[] = (todayMeals?.meals || []).map((m) => ({ slot: m.slot, name: m.name, cal: m.cal, protein: m.protein, carbs: m.carbs, fat: m.fat }))
  const workoutDoneToday = !!(todayProgress?.measurements as { workout?: boolean } | null)?.workout
  const todaysWorkoutAction = (recentWorkoutActions || []).find((r) => localDateISO(tz, new Date(r.shown_at as string)) === todayIso)
  const workoutSkippedToday = !workoutDoneToday && !!(todaysWorkoutAction?.skipped_at || todaysWorkoutAction?.superseded_at)
  const workoutStatus = workoutTodayStatus(workoutDoneToday, workoutSkippedToday)
  // Same fallback as /plan/today and /api/plan/food-log's own loadTarget() —
  // a real calorie goal can exist as a flat column here with no weekly meals
  // JSON at all (e.g. set without ever building a full week of meals).
  const dayTargets = (nutritionPlan?.day_targets as DayTargets) || null
  const scheduledDayType = todayMeals?.dayType ?? scheduleDayType(dayTargets, mealIdx)
  const baseCalTarget = resolveTodayCalorieTarget(todayMeals?.target, scheduledDayType, dayTargets, Number(nutritionPlan?.calories) || null, workoutStatus)
  const calBudget = baseCalTarget != null ? getEffectiveCalorieBudget(baseCalTarget, todayAdjustment) : null
  const todaysDayType = resolvedDayType(scheduledDayType, workoutStatus)
  const eatingOutToday = isEatingOutToday(todayMeals?.eatOut, todayAdjustment)

  return (
    <div className="min-h-[100dvh] px-4 py-6" style={{ background: '#0b1712' }}>
      <div className="max-w-2xl mx-auto">
        <Link href="/plan" className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-full active:scale-95 transition-all mb-6" style={{ background: '#12241a', border: '1px solid #24402f', color: '#c9a84c' }}>← Home</Link>
        <FoodLog
          planned={planned} budget={calBudget} dayType={todaysDayType}
          mealStatus={
            eatingOutToday ? { kind: 'eatingOut' }
              : todayMeals ? { kind: 'planned', totalProtein: todayMeals.totalProtein }
              : { kind: 'empty', isSunday: mealIdx > 5 }
          }
        />
      </div>
    </div>
  )
}
