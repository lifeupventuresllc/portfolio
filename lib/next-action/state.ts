import { createServiceClient } from '@/lib/supabase/server'
import { generateWorkout, type WorkoutProgram, type TrainingStyle, type FocusArea, type WorkoutInputs } from '@/lib/workout'
import { getProgressionOverrides } from '@/lib/progression'
import type { Level, Injury } from '@/lib/workout-exercises'
import { getEffectiveTodayWorkout, getEffectiveCalorieBudget, isEatingOutToday } from '@/lib/fos/effective-plan'
import { getApprovedTodayAdjustment, getProfile } from '@/lib/fos/context'
import { assessLifePattern } from '@/lib/fos/pattern'
import { currentWeekNumber, getTimezone, localDateISO, localMondayIndex, localHourNumber } from '@/lib/localdate'
import type { WeekPlan } from '@/lib/meal-plan'
import { weightClassFor, budgetTierFromWeekly, pickForNow, pickForRestaurant, parseDietaryRestrictions, type FastFoodMeal } from '@/lib/escape-plan'
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
    svc.from('challenge_nutrition_plans').select('calories, protein_g, meals').eq('enrollment_id', enrollmentId).maybeSingle(),
    svc.from('challenge_progress').select('measurements').eq('enrollment_id', enrollmentId).eq('note', '__daily__').eq('logged_on', todayISO).maybeSingle(),
    svc.from('challenge_food_log').select('calories, protein_g').eq('enrollment_id', enrollmentId).eq('logged_on', todayISO),
    // Goal-alignment layer (prompt 6): was a workout action from THIS engine
    // shown and explicitly skipped today? That's a real signal to adjust
    // today's calorie assumption on — never guessed from the clock. Widened
    // to the last 2 days server-side, then narrowed by real local-date
    // comparison below (same timezone-safe pattern as the API route's open-
    // row check — a literal UTC-boundary compare was a real bug there).
    // Also reads `superseded_at` now — real bug caught live, 2026-08-28:
    // `skip` has no UI control anywhere (no button calls it), so this
    // adjustment could never actually fire from real usage. The only real
    // ways a workout action ever closes without being done are "Keep it
    // simple" and a free-text redirect ("I'm not doing my workout today") —
    // both supersede, never skip. Treating a same-day superseded workout the
    // same as an explicit skip is what makes this reachable at all.
    svc.from('next_action_log').select('shown_at, skipped_at, superseded_at').eq('enrollment_id', enrollmentId).eq('kind', 'workout').gte('shown_at', new Date(Date.now() - 2 * 86400000).toISOString()).order('shown_at', { ascending: false }),
    getProfile(enrollmentId),
    assessLifePattern(enrollmentId, todayISO),
    getApprovedTodayAdjustment(enrollmentId, todayISO),
  ])

  // Simulate a not-yet-approved change INSTEAD of whatever's actually
  // approved for today — see StateOverrides' comment. Replaces outright
  // rather than merging: this call exists purely to answer "what would
  // today's effective workout/calorie state become if THIS were approved,"
  // not to combine it with an unrelated real adjustment.
  const effectiveTodayAdjustment = (overrides.workoutChangeOverride || overrides.nutritionChangeOverride)
    ? { workoutChange: overrides.workoutChangeOverride ?? null, nutritionChange: overrides.nutritionChangeOverride ?? null, message: null }
    : todayAdjustment

  const userId = (enrollment?.user_id as string | null) ?? null
  const injuries = (Array.isArray((intake?.form_data as { injuries?: Injury[] } | null)?.injuries) ? (intake!.form_data as { injuries: Injury[] }).injuries : []) as Injury[]
  const goal = (intake?.goal === 'gain' || intake?.goal === 'maintain' ? intake.goal : 'lose') as 'lose' | 'gain' | 'maintain'

  // Same real regeneration every other surface uses (see effective-plan.ts),
  // now genuinely matching /plan/workout/page.tsx's own regeneration block —
  // real gap found 2026-08-30 (Asa's ask: "the decision tool and the
  // workout engine must speak to each other"): this used to omit
  // trackOverride and overrideAreas entirely, so an approved "home today,
  // not gym" swap or a chat-approved focus request could make the circle
  // promise one workout while /plan/workout opened a different one. Any
  // future change to /plan/workout's own regeneration block needs the same
  // change made here.
  const focusOverride = effectiveTodayAdjustment?.workoutChange?.focusOverride
  let program: WorkoutProgram | null = (workoutPlan?.plan as WorkoutProgram) ?? null
  if (program && intake) {
    const level = (intake.experience_level === 'advanced' ? 3 : intake.experience_level === 'intermediate' ? 2 : 1) as Level
    const sex = (intake.sex === 'male' ? 'male' : intake.sex === 'other' ? 'other' : 'female') as 'male' | 'female' | 'other'
    const postpartum = !!(intake.form_data as { postpartum?: boolean } | null)?.postpartum
    const trainingStyle = ((intake.form_data as { training_style?: TrainingStyle } | null)?.training_style || 'none') as TrainingStyle
    const focusArea = ((intake.form_data as { focus_area?: FocusArea } | null)?.focus_area || 'overall') as FocusArea
    const weekNumber = currentWeekNumber((enrollment!.created_at as string) || new Date().toISOString())
    const trackOverride = effectiveTodayAdjustment?.workoutChange?.trackOverride
    // Real gap found live: this is the ONE generateWorkout call site that
    // never read her real logged set-effort history — the chat's own
    // "here's your updated workout" preview (below) and the dashboard
    // circle both silently used her flat intake-level skill/intensity
    // instead of what months of actual logged performance say it should
    // be, even though /plan/workout's own regeneration always has.
    const progressionOverrides = await getProgressionOverrides(enrollmentId)
    program = generateWorkout({
      name: (enrollment!.name as string) || 'Your', sex, track: trackOverride || (intake.training_location === 'home' ? 'home' : 'gym'),
      level, goal, daysPerWeek: Number(intake.days_per_week) || 3, weekNumber, injuries, postpartum, trainingStyle, focusArea,
      overrideAreas: focusOverride?.length ? focusOverride : undefined,
      progressionOverrides,
      activityLevel: intake.activity_level as WorkoutInputs['activityLevel'],
    })
  }

  const doneRows = await svc.from('challenge_progress').select('measurements').eq('enrollment_id', enrollmentId).eq('note', '__daily__')
  const completed = (doneRows.data || []).filter((r) => (r.measurements as { workout?: boolean } | null)?.workout).length
  const workoutDoneToday = !!(todayProgress?.measurements as { workout?: boolean } | null)?.workout
  // Same first-visit fallback /plan/workout applies (completed === 0: her
  // freshly-stored focus preference should be reflected immediately, not
  // "eventually, whenever rotation gets there") — real gap found 2026-08-30,
  // same root cause as the beta-feedback Priority 1 fix already applied to
  // /plan/workout/page.tsx, just never carried over to this engine.
  const storedFocusArea = (intake?.form_data as { focus_area?: FocusArea } | null)?.focus_area
  const effectiveFocusArea = focusOverride?.length
    ? focusOverride
    : completed === 0 && storedFocusArea && storedFocusArea !== 'overall' ? storedFocusArea : undefined
  const workoutCandidate = getEffectiveTodayWorkout(program, completed, effectiveTodayAdjustment, effectiveFocusArea)

  const todaysWorkoutAction = (recentWorkoutActions || []).find((r) => localDateISO(tz, new Date(r.shown_at as string)) === todayISO)
  const workoutSkippedToday = !workoutDoneToday && !!(todaysWorkoutAction?.skipped_at || todaysWorkoutAction?.superseded_at)
  const workoutReducedToday = !workoutDoneToday && !workoutSkippedToday && !!effectiveTodayAdjustment?.workoutChange
  const workoutBurnAdjustment = workoutSkippedToday ? WORKOUT_CALORIE_BURN_ESTIMATE : workoutReducedToday ? Math.round(WORKOUT_CALORIE_BURN_ESTIMATE * WORKOUT_REDUCED_BURN_FACTOR) : 0
  // See types.ts — independent of workoutReducedToday on purpose: a live
  // approved override should keep outranking stale-history candidates all
  // day, even after an earlier same-day approval already flipped
  // workoutSkippedToday true by superseding a prior row.
  const workoutOverrideActive = !workoutDoneToday && !!effectiveTodayAdjustment?.workoutChange

  const baseCalorieBudget = nutritionPlan?.calories != null ? getEffectiveCalorieBudget(Number(nutritionPlan.calories), effectiveTodayAdjustment) : null
  // Cross-domain adjustment (prompt 6): an unburned workout tightens today's
  // remaining calorie allowance immediately, before the next meal/eating-out
  // recommendation is made — never surfaced as its own line item, just baked
  // into the one number the meal candidate reasons about.
  const calorieBudget = baseCalorieBudget != null ? Math.max(0, baseCalorieBudget - workoutBurnAdjustment) : null
  const caloriesLoggedToday = (foodToday || []).reduce((sum, r) => sum + (Number(r.calories) || 0), 0)
  // Same real protein target/logged-today pair the cal/protein glance row
  // on /plan/today already reads — one source, two places it's used.
  const proteinBudget = nutritionPlan?.protein_g != null ? Number(nutritionPlan.protein_g) : null
  const proteinLoggedToday = (foodToday || []).reduce((sum, r) => sum + (Number(r.protein_g) || 0), 0)

  // Same real source every other surface reads (see app/plan/today/page.tsx)
  // — a scheduled eat-out day in the stored weekly meal plan, OR an
  // approved/ad-hoc today-only override, OR (new here) an explicit signal
  // from the engine's own natural-language path (index.ts's overrides).
  const weekPlan = (nutritionPlan?.meals && typeof nutritionPlan.meals === 'object' && 'days' in nutritionPlan.meals) ? (nutritionPlan.meals as WeekPlan) : null
  const mealIdx = localMondayIndex(tz)
  const todayMeals = weekPlan && mealIdx <= 5 ? weekPlan.days[mealIdx] : null
  const eatingOutToday = overrides.eatingOut ?? isEatingOutToday(todayMeals?.eatOut, effectiveTodayAdjustment)
  // Distinct from eatingOutToday itself — see types.ts. Only true when THIS
  // call actually passed an explicit override, never inferred from the
  // schedule fallback above.
  const eatingOutExplicit = overrides.eatingOut === true

  // Her real next planned meal, by the current local hour — same clock-
  // based slot inference already used below for the eating-out pick (never
  // asked, never guessed beyond what time it actually is). Real name from
  // her real stored plan, never invented (Asa's ask, 2026-08-27: show what
  // to actually eat, not just a calorie count).
  const mealHour = localHourNumber(tz)
  const nextMealSlot: 'BF' | 'LN' | 'DN' | 'SN' = mealHour < 11 ? 'BF' : mealHour < 15 ? 'LN' : mealHour < 20 ? 'DN' : 'SN'
  const nextMealName = todayMeals?.meals.find((m) => m.slot === nextMealSlot)?.name ?? null

  // Prompt 6's "return only ONE selection." Real curated data ONLY — Asa's
  // explicit call, 2026-08-26: "we don't want estimates, we won't [base a]
  // decision off that." An earlier version asked the AI to invent a
  // plausible order/macros for whatever restaurant she named; checked
  // directly against USDA's database live (it has zero real restaurant-
  // chain menu data — that's not what it's for) confirmed there's no real
  // per-restaurant nutrition source available here, so real curated data
  // (lib/escape-plan.ts) is the only honest source — and it's already
  // sized per meal-slot, which also fixes a second real gap Asa caught:
  // an ungrounded target could try to spend her ENTIRE day's remaining
  // calories on a single breakfast. Two sources, tried in order:
  // 1. A real curated entry actually matching the restaurant she named,
  //    narrowed to the current meal slot for realistic sizing.
  // 2. The existing generic Escape Plan pick (still real curated data,
  //    just not guaranteed to be her exact restaurant) when either she
  //    didn't name one, or that one isn't in the curated set for this slot.
  const remainingCalories = calorieBudget != null ? Math.max(0, calorieBudget - caloriesLoggedToday) : 500
  let eatingOutPick: FastFoodMeal | null = null
  let eatingOutSlot: FastFoodMeal['slot'] | null = null
  if (eatingOutToday) {
    const wc = weightClassFor(Number(intake?.weight_lbs) || 170)
    const epochDays = Math.floor(new Date(`${todayISO}T00:00:00Z`).getTime() / 86400000)
    const hour = localHourNumber(tz)
    // What SHE said takes priority over the clock (2026-08-26 fix) — a 1pm
    // "give me a snack idea" must size like a snack, never get treated as
    // Lunch just because that's what the hour alone would infer.
    const nowSlot: FastFoodMeal['slot'] = overrides.eatingOutMealSlot ?? (hour < 11 ? 'Breakfast' : hour < 15 ? 'Lunch' : hour < 20 ? 'Dinner' : 'Snack')
    eatingOutSlot = nowSlot
    const budgetTier = budgetTierFromWeekly(Number(intake?.weekly_food_budget) || null)
    const targetCal = calorieBudget != null ? remainingCalories : undefined
    // Real dietary-restriction filter (2026-08-28, Asa's ask) — her own
    // stored intake data, never a generic pass-through. See escape-plan.ts.
    const restrictions = parseDietaryRestrictions(intake?.dislikes_allergies as string | null)

    if (overrides.eatingOutRestaurant) {
      eatingOutPick = pickForRestaurant(wc, overrides.eatingOutRestaurant, nowSlot, targetCal, restrictions)[0] || null
    }
    if (!eatingOutPick) {
      const picks = pickForNow(wc, nowSlot, budgetTier, epochDays, targetCal, restrictions)
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
    workoutOverrideActive,
    workoutBurnAdjustment,
    eatingOutToday,
    eatingOutExplicit,
    eatingOutPick,
    eatingOutSlot,
    proteinBudget,
    proteinLoggedToday,
    nextMealName,
  }
}
