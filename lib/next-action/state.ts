import { createServiceClient } from '@/lib/supabase/server'
import { generateWorkout, type WorkoutProgram, type TrainingStyle, type FocusArea } from '@/lib/workout'
import type { Level, Injury } from '@/lib/workout-exercises'
import { getEffectiveTodayWorkout, getEffectiveCalorieBudget, isEatingOutToday } from '@/lib/fos/effective-plan'
import { getApprovedTodayAdjustment, getProfile } from '@/lib/fos/context'
import { assessLifePattern } from '@/lib/fos/pattern'
import { currentWeekNumber, getTimezone, localDateISO, localMondayIndex, localHourNumber } from '@/lib/localdate'
import type { WeekPlan } from '@/lib/meal-plan'
import { weightClassFor, budgetTierFromWeekly, pickForNow, type FastFoodMeal } from '@/lib/escape-plan'
import { generateRestaurantOrder, type RestaurantOrder } from './llm'
import type { UserStateSnapshot, EnergyLevel, StateOverrides } from './types'

// Deliberately a flat, documented estimate, not a per-person calculation —
// there's no heart-rate/effort data to compute a real one from. Mid-range
// for a typical 30-45min moderate session; good enough to nudge a daily
// calorie target in the right direction without pretending false precision.
const WORKOUT_CALORIE_BURN_ESTIMATE = 300
const WORKOUT_REDUCED_BURN_FACTOR = 0.5

// The User State Model — the "one thing" this whole engine gets built on
// first (see memory: the Recommendation Layer and personalized fallback
// ranking are both just consumers of this). Pulls together everything
// already known about her RIGHT NOW from wherever it actually lives today —
// it does not ask her anything new, and it does not own any of this data;
// it's a read-time aggregation, not a new source of truth.
export async function getUserState(enrollmentId: string, todayISO: string, overrides: StateOverrides = {}): Promise<UserStateSnapshot> {
  const svc = createServiceClient()
  const tz = getTimezone()

  const [{ data: enrollment }, { data: intake }, { data: workoutPlan }, { data: nutritionPlan }, { data: todayProgress }, { data: foodToday }, { data: recentWorkoutActions }, profile, pattern, todayAdjustment] = await Promise.all([
    svc.from('challenge_enrollments').select('*').eq('id', enrollmentId).maybeSingle(),
    svc.from('challenge_intake').select('*').eq('enrollment_id', enrollmentId).maybeSingle(),
    svc.from('challenge_workout_plans').select('*').eq('enrollment_id', enrollmentId).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_nutrition_plans').select('calories, meals').eq('enrollment_id', enrollmentId).maybeSingle(),
    svc.from('challenge_progress').select('measurements').eq('enrollment_id', enrollmentId).eq('note', '__daily__').eq('logged_on', todayISO).maybeSingle(),
    svc.from('challenge_food_log').select('calories').eq('enrollment_id', enrollmentId).eq('logged_on', todayISO),
    // Goal-alignment layer (prompt 6): was a workout action from THIS engine
    // shown and explicitly skipped today? That's a real signal to adjust
    // today's calorie assumption on — never guessed from the clock. Widened
    // to the last 2 days server-side, then narrowed by real local-date
    // comparison below (same timezone-safe pattern as the API route's open-
    // row check — a literal UTC-boundary compare was a real bug there).
    svc.from('next_action_log').select('shown_at, skipped_at').eq('enrollment_id', enrollmentId).eq('kind', 'workout').gte('shown_at', new Date(Date.now() - 2 * 86400000).toISOString()).order('shown_at', { ascending: false }),
    getProfile(enrollmentId),
    assessLifePattern(enrollmentId, todayISO),
    getApprovedTodayAdjustment(enrollmentId, todayISO),
  ])

  const userId = (enrollment?.user_id as string | null) ?? null
  const injuries = (Array.isArray((intake?.form_data as { injuries?: Injury[] } | null)?.injuries) ? (intake!.form_data as { injuries: Injury[] }).injuries : []) as Injury[]
  const goal = (intake?.goal === 'gain' || intake?.goal === 'maintain' ? intake.goal : 'lose') as 'lose' | 'gain' | 'maintain'

  // Same real regeneration every other surface uses (see effective-plan.ts) —
  // never a second, possibly-different generation.
  let program: WorkoutProgram | null = (workoutPlan?.plan as WorkoutProgram) ?? null
  if (program && intake) {
    const level = (intake.experience_level === 'advanced' ? 3 : intake.experience_level === 'intermediate' ? 2 : 1) as Level
    const sex = (intake.sex === 'male' ? 'male' : intake.sex === 'other' ? 'other' : 'female') as 'male' | 'female' | 'other'
    const postpartum = !!(intake.form_data as { postpartum?: boolean } | null)?.postpartum
    const trainingStyle = ((intake.form_data as { training_style?: TrainingStyle } | null)?.training_style || 'none') as TrainingStyle
    const focusArea = ((intake.form_data as { focus_area?: FocusArea } | null)?.focus_area || 'overall') as FocusArea
    const weekNumber = currentWeekNumber((enrollment!.created_at as string) || new Date().toISOString())
    program = generateWorkout({
      name: (enrollment!.name as string) || 'Your', sex, track: intake.training_location === 'home' ? 'home' : 'gym',
      level, goal, daysPerWeek: Number(intake.days_per_week) || 3, weekNumber, injuries, postpartum, trainingStyle, focusArea,
    })
  }

  const doneRows = await svc.from('challenge_progress').select('measurements').eq('enrollment_id', enrollmentId).eq('note', '__daily__')
  const completed = (doneRows.data || []).filter((r) => (r.measurements as { workout?: boolean } | null)?.workout).length
  const workoutDoneToday = !!(todayProgress?.measurements as { workout?: boolean } | null)?.workout
  const focusOverride = todayAdjustment?.workoutChange?.focusOverride
  const workoutCandidate = getEffectiveTodayWorkout(program, completed, todayAdjustment, focusOverride)

  const todaysWorkoutAction = (recentWorkoutActions || []).find((r) => localDateISO(tz, new Date(r.shown_at as string)) === todayISO)
  const workoutSkippedToday = !workoutDoneToday && !!todaysWorkoutAction?.skipped_at
  const workoutReducedToday = !workoutDoneToday && !workoutSkippedToday && !!todayAdjustment?.workoutChange
  const workoutBurnAdjustment = workoutSkippedToday ? WORKOUT_CALORIE_BURN_ESTIMATE : workoutReducedToday ? Math.round(WORKOUT_CALORIE_BURN_ESTIMATE * WORKOUT_REDUCED_BURN_FACTOR) : 0

  const baseCalorieBudget = nutritionPlan?.calories != null ? getEffectiveCalorieBudget(Number(nutritionPlan.calories), todayAdjustment) : null
  // Cross-domain adjustment (prompt 6): an unburned workout tightens today's
  // remaining calorie allowance immediately, before the next meal/eating-out
  // recommendation is made — never surfaced as its own line item, just baked
  // into the one number the meal candidate reasons about.
  const calorieBudget = baseCalorieBudget != null ? Math.max(0, baseCalorieBudget - workoutBurnAdjustment) : null
  const caloriesLoggedToday = (foodToday || []).reduce((sum, r) => sum + (Number(r.calories) || 0), 0)

  // Same real source every other surface reads (see app/plan/today/page.tsx)
  // — a scheduled eat-out day in the stored weekly meal plan, OR an
  // approved/ad-hoc today-only override, OR (new here) an explicit signal
  // from the engine's own natural-language path (index.ts's overrides).
  const weekPlan = (nutritionPlan?.meals && typeof nutritionPlan.meals === 'object' && 'days' in nutritionPlan.meals) ? (nutritionPlan.meals as WeekPlan) : null
  const mealIdx = localMondayIndex(tz)
  const todayMeals = weekPlan && mealIdx <= 5 ? weekPlan.days[mealIdx] : null
  const eatingOutToday = overrides.eatingOut ?? isEatingOutToday(todayMeals?.eatOut, todayAdjustment)

  // Prompt 6's "return only ONE selection." Two sources, tried in order:
  // 1. A real restaurant she actually named (2026-08-26 fix) — generated
  //    live for THAT exact chain (lib/next-action/llm.ts) rather than
  //    served from a small fixed list with no idea where she really is.
  //    Real gap Asa caught live: saying "I'm at Taco Bell" could still
  //    surface an unrelated restaurant, because the old path only ever
  //    knew a bare yes/no "eating out" flag, never the place itself.
  // 2. The app's existing Escape Plan picker (lib/escape-plan.ts,
  //    /plan/eating-out) as a general fallback when no specific
  //    restaurant was named, or the live generation failed.
  const remainingCalories = calorieBudget != null ? Math.max(0, calorieBudget - caloriesLoggedToday) : 500
  let eatingOutPick: FastFoodMeal | RestaurantOrder | null = null
  if (eatingOutToday) {
    if (overrides.eatingOutRestaurant) {
      eatingOutPick = await generateRestaurantOrder(overrides.eatingOutRestaurant, remainingCalories)
    }
    if (!eatingOutPick) {
      const wc = weightClassFor(Number(intake?.weight_lbs) || 170)
      const epochDays = Math.floor(new Date(`${todayISO}T00:00:00Z`).getTime() / 86400000)
      const hour = localHourNumber(tz)
      const nowSlot: FastFoodMeal['slot'] = hour < 11 ? 'Breakfast' : hour < 15 ? 'Lunch' : hour < 20 ? 'Dinner' : 'Snack'
      const budgetTier = budgetTierFromWeekly(Number(intake?.weekly_food_budget) || null)
      const picks = pickForNow(wc, nowSlot, budgetTier, epochDays, calorieBudget != null ? remainingCalories : undefined)
      eatingOutPick = picks[0] || null
    }
  }

  // energyPatterns is a free-form bag (see fos/types.ts) — the only shape
  // anything writes to it today is a same-day 'today' key from the daily
  // check-in. Read it defensively; 'unknown' is a real, expected value for
  // most sessions until the check-in or an explicit chat signal sets it,
  // and the scorer is built to treat unknown as neutral, not as low.
  const energyRaw = (profile?.energyPatterns as { today?: string } | null)?.today
  const baseEnergy: EnergyLevel = energyRaw === 'low' || energyRaw === 'high' || energyRaw === 'normal' ? energyRaw : 'unknown'
  const energy: EnergyLevel = overrides.energy ?? baseEnergy

  return {
    enrollmentId,
    userId,
    todayISO,
    energy,
    minutesAvailable: overrides.minutesAvailable ?? null,
    workoutDoneToday,
    workoutCandidate,
    calorieBudget,
    caloriesLoggedToday,
    injuries,
    isDip: pattern.isDip,
    dipRiskBand: pattern.riskBand,
    goal,
    workoutSkippedToday,
    workoutReducedToday,
    workoutBurnAdjustment,
    eatingOutToday,
    eatingOutPick,
  }
}
