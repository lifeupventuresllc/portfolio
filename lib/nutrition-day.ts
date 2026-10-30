import { createServiceClient } from '@/lib/supabase/server'
import type { PlannedItem } from '@/components/FoodLog'
import { getTimezone, localMondayIndex, localDateISO } from '@/lib/localdate'
import { getApprovedTodayAdjustment } from '@/lib/fos/context'
import { getEffectiveCalorieBudget, isEatingOutToday, resolveTodayCalorieTarget, resolvedDayType, scheduleDayType, workoutTodayStatus, type DayTargets } from '@/lib/fos/effective-plan'
import type { WeekPlan } from '@/lib/meal-plan'
import { mealTimesFrom } from '@/lib/meal-pick'
import { spentToday } from '@/lib/food-budget'

// Everything the Nutrition tab (the two picks) and its food-log page
// (/plan/nutrition/log) both need for today — one loader so the two
// screens can never disagree on her calorie number.
export async function loadNutritionDay(user: { id: string; email?: string | null }) {
  const svc = createServiceClient()
  let { data: enrollment } = await svc.from('challenge_enrollments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc.from('challenge_enrollments').select('*').eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
    enrollment = byEmail || null
  }
  if (!enrollment) return null

  const tz = getTimezone()
  const todayIso = localDateISO(tz)
  const mealIdx = localMondayIndex(tz)
  const since = localDateISO(tz, new Date(Date.now() - 28 * 86400000))
  const pricesQ = Promise.resolve(svc.from('challenge_food_log').select('price').eq('enrollment_id', enrollment.id).eq('logged_on', todayIso))
  const [{ data: nutritionPlan }, { data: intake }, { data: foodRows }, todayAdjustment, { data: todayProgress }, { data: recentWorkoutActions }, { data: pastMeals }] = await Promise.all([
    svc.from('challenge_nutrition_plans').select('meals, calories, day_targets').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_intake').select('weight_lbs, weekly_food_budget, food_preferences, dislikes_allergies, form_data').eq('enrollment_id', enrollment.id).maybeSingle(),
    svc.from('challenge_food_log').select('calories, meal, created_at').eq('enrollment_id', enrollment.id).eq('logged_on', todayIso),
    getApprovedTodayAdjustment(enrollment.id as string, todayIso),
    // Same real workout-brain signal /plan/today reads, so this number never
    // disagrees with the dashboard's.
    svc.from('challenge_progress').select('measurements').eq('enrollment_id', enrollment.id).eq('note', '__daily__').eq('logged_on', todayIso).maybeSingle(),
    svc.from('next_action_log').select('shown_at, skipped_at, superseded_at').eq('enrollment_id', enrollment.id).eq('kind', 'workout').gte('shown_at', new Date(Date.now() - 2 * 86400000).toISOString()).order('shown_at', { ascending: false }),
    // Her last 4 weeks of meals (not today) — when she REALLY eats breakfast,
    // lunch and dinner, which outranks the clock on the Nutrition tab.
    svc.from('challenge_food_log').select('meal, created_at, logged_on').eq('enrollment_id', enrollment.id).gte('logged_on', since).lt('logged_on', todayIso).limit(600),
  ])
  // Money she spent today on accepted picks (migration 049). Its own query so
  // a database without the price column yet just reads $0 spent — never an
  // empty food log.
  const { data: priceRows, error: priceErr } = await pricesQ
  const moneySpent = priceErr ? 0 : spentToday(priceRows || [])
  const mealTimes = mealTimesFrom((pastMeals || []).map((r) => ({ meal: (r.meal as string) || '', minute: localMinute(tz, new Date(r.created_at as string)), day: r.logged_on as string })))

  const weekPlan = (nutritionPlan?.meals && typeof nutritionPlan.meals === 'object' && 'days' in nutritionPlan.meals)
    ? (nutritionPlan.meals as WeekPlan) : null
  const todayMeals = weekPlan && mealIdx <= 5 ? weekPlan.days[mealIdx] : null
  const planned: PlannedItem[] = (todayMeals?.meals || []).map((m) => ({ slot: m.slot, name: m.name, cal: m.cal, protein: m.protein, carbs: m.carbs, fat: m.fat }))
  const workoutDoneToday = !!(todayProgress?.measurements as { workout?: boolean } | null)?.workout
  const todaysWorkoutAction = (recentWorkoutActions || []).find((r) => localDateISO(tz, new Date(r.shown_at as string)) === todayIso)
  const workoutSkippedToday = !workoutDoneToday && !!(todaysWorkoutAction?.skipped_at || todaysWorkoutAction?.superseded_at)
  const workoutStatus = workoutTodayStatus(workoutDoneToday, workoutSkippedToday)
  const dayTargets = (nutritionPlan?.day_targets as DayTargets) || null
  const scheduledDayType = todayMeals?.dayType ?? scheduleDayType(dayTargets, mealIdx)
  const baseCalTarget = resolveTodayCalorieTarget(todayMeals?.target, scheduledDayType, dayTargets, Number(nutritionPlan?.calories) || null, workoutStatus)
  const calBudget = baseCalTarget != null ? getEffectiveCalorieBudget(baseCalTarget, todayAdjustment) : null

  return {
    enrollment, intake, foodRows: foodRows || [], moneySpent, mealTimes, weekPlan, todayMeals, planned, mealIdx, todayIso, tz, calBudget,
    todaysDayType: resolvedDayType(scheduledDayType, workoutStatus),
    eatingOutToday: isEatingOutToday(todayMeals?.eatOut, todayAdjustment),
  }
}

/** Local minute of the day (0–1439) a moment falls on, in her timezone. */
export function localMinute(tz: string, at: Date): number {
  const [h, m] = at.toLocaleTimeString('en-US', { timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit' }).split(':').map(Number)
  return (h % 24) * 60 + m
}
