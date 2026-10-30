import { createServiceClient } from '@/lib/supabase/server'
import type { PlannedItem } from '@/components/FoodLog'
import { getTimezone, localMondayIndex, localDateISO, addDaysISO } from '@/lib/localdate'
import { getApprovedTodayAdjustment } from '@/lib/fos/context'
import { getEffectiveCalorieBudget, isEatingOutToday, resolveTodayCalorieTarget, resolvedDayType, scheduleDayType, workoutTodayStatus, type DayTargets } from '@/lib/fos/effective-plan'
import type { WeekPlan } from '@/lib/meal-plan'
import { mealTimesFrom, habitTimes, cleanOverrides, HABIT_LOOKBACK_DAYS, type HabitEntry, type HabitMeal, type UsualTime } from '@/lib/meal-pick'
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
    // lunch, dinner and her snack, which outranks the clock on the Nutrition tab.
    habitRows(svc, enrollment.id as string, todayIso),
  ])
  // Money she spent today on accepted picks (migration 049). Its own query so
  // a database without the price column yet just reads $0 spent — never an
  // empty food log.
  const { data: priceRows, error: priceErr } = await pricesQ
  const moneySpent = priceErr ? 0 : spentToday(priceRows || [])
  // Times she set herself in Today's food settings win over learned ones.
  const mealTimes = mealTimesFrom(habitHistory(pastMeals, tz), { todayIso, overrides: cleanOverrides((intake?.form_data as Record<string, unknown> | null)?.meal_times_set) })

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

// ---- habit memory (Prompt 2, 2026-10-30) --------------------------------
// Her food log is the memory: every pick she takes or orders is a
// challenge_food_log row with its meal + created_at. Only the 28 days before
// today count, so each new week pushes the oldest one out.
function habitRows(svc: ReturnType<typeof createServiceClient>, enrollmentId: string, todayIso: string) {
  return svc.from('challenge_food_log').select('meal, created_at, logged_on').eq('enrollment_id', enrollmentId)
    .gte('logged_on', addDaysISO(todayIso, -HABIT_LOOKBACK_DAYS)).lt('logged_on', todayIso).limit(600)
}

function habitHistory(rows: { meal: unknown; created_at: unknown; logged_on: unknown }[] | null, tz: string): HabitEntry[] {
  return (rows || []).map((r) => ({ meal: (r.meal as string) || '', minute: localMinute(tz, new Date(r.created_at as string)), day: r.logged_on as string }))
}

/** When she usually eats each meal: minute of her local day, the 1-hour
 * window around it, and where it came from — 'learned' (3+ days of her own
 * log in the last 28), 'set' (she picked it in Today's food settings) or
 * 'default' (8am / 12pm / 6pm, afternoon snack 3pm). Same numbers the
 * Nutrition tab runs on — use it to time anything meal-related (e.g.
 * meal-time notifications). Pass `tz` outside a request (a cron), where
 * there's no timezone cookie to read. */
export async function usualMealTimes(enrollmentId: string, tz: string = getTimezone()): Promise<Record<HabitMeal, UsualTime>> {
  const svc = createServiceClient()
  const todayIso = localDateISO(tz)
  const [{ data: rows }, { data: intake }] = await Promise.all([
    habitRows(svc, enrollmentId, todayIso),
    svc.from('challenge_intake').select('form_data').eq('enrollment_id', enrollmentId).maybeSingle(),
  ])
  const overrides = cleanOverrides((intake?.form_data as Record<string, unknown> | null)?.meal_times_set)
  return habitTimes(habitHistory(rows, tz), { todayIso, overrides })
}

/** Local minute of the day (0–1439) a moment falls on, in her timezone. */
export function localMinute(tz: string, at: Date): number {
  const [h, m] = at.toLocaleTimeString('en-US', { timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit' }).split(':').map(Number)
  return (h % 24) * 60 + m
}
