import { createServiceClient } from '@/lib/supabase/server'
import { buildBlueprint, type Activity } from '@/lib/nutrition'
import { generateWorkout, type TrainingStyle, type FocusArea } from '@/lib/workout'
import { buildWeekFromSelections, autoSelectMeals, type DayType } from '@/lib/meal-plan'
import type { Level, Injury } from '@/lib/workout-exercises'

// Shared by the structured intake form (app/api/challenge/intake/route.ts) and
// Coach Asa's conversational cold-start build (app/api/plan/operator/route.ts) —
// one engine, two front doors, so a plan built either way behaves identically
// everywhere downstream (dashboard, checkins, meal swaps).

// Spreads N workout days evenly across the 6-day Mon-Sat week the meal-plan engine
// already assumes (Sun is always the cook/rest day). Only used by the auto-fill-meals
// path — the structured form has never needed this since it leaves meals as a draft.
function dayTypesForFrequency(daysPerWeek: number): DayType[] {
  const n = Math.min(6, Math.max(0, Math.round(daysPerWeek)))
  const days: DayType[] = Array(6).fill('rest')
  if (n <= 0) return days
  const step = 6 / n
  for (let i = 0; i < n; i++) days[Math.min(5, Math.round(i * step))] = 'workout'
  return days
}

export interface PlanBuildInput {
  enrollmentId: string
  userId: string
  name: string
  age: number
  sex: 'female' | 'male' | 'other'
  height_in: number
  weight_lbs: number
  goal: 'lose' | 'gain' | 'maintain'
  target_lbs: number
  activity_level: Activity
  experience_level: 'beginner' | 'intermediate' | 'advanced'
  training_location: 'home' | 'gym'
  days_per_week: number
  weekly_food_budget?: number
  food_preferences?: string
  dislikes_allergies?: string
  injuries_limitations?: string
  cook_days_per_week?: number
  injuries?: Injury[]
  postpartum?: boolean
  training_style?: TrainingStyle
  other_info?: string
  focus_area?: FocusArea
  // A live chat ask for multiple areas at once ("arms, legs, and core") —
  // separate from focus_area (the single permanent preference) since a
  // single value can never represent a compound one-off request.
  override_areas?: FocusArea[]
  optional_completed?: boolean
  // True only when she was actually asked the injuries question (the structured
  // /plan/intake form's required 'injuries' step, with its explicit "None —
  // continue" option) — NOT true just because a challenge_intake row exists.
  // The Quickstart fast lane (app/api/plan/quickstart-workout/route.ts) creates
  // a real intake row too, defaulting injuries to [] without ever asking, which
  // used to make Coach Asa's chat treat "no injuries on file" as "confirmed
  // injury-free" for those members — so a later chat workout request (e.g. "I'm
  // in a hotel, build me a workout") silently never checked for injuries at all.
  // Sticky once true (see buildInitialPlans below), same pattern as optional_completed.
  injuriesAddressed?: boolean
  // True only when the structured /plan/intake form's REQUIRED tier (goal,
  // focus area, body stats, training location — not just injuries) was
  // actually submitted, as opposed to Quickstart or Coach Asa's cold-start
  // chat build defaulting/guessing them. Distinct from injuriesAddressed:
  // this covers goal specifically, which the workout engine now genuinely
  // acts on (see lib/workout.ts's repScheme) — a silently-defaulted goal
  // matters more now than it used to. Sticky once true, same pattern.
  requiredTierCompleted?: boolean
  // Only the original structured-intake caller omits this (preserves its exact
  // existing "always defaults to a 4-day split" behavior). Coach Asa's chat build
  // passes her real answer for a more accurate workout/rest calorie split.
  workout_days_per_week?: number
  // Coach-chat builds fill real meals immediately, since there's no later UI moment
  // for her to pick them herself. The structured intake form keeps its existing
  // macros-only draft behavior unchanged — not touched by this addition.
  autoFillMeals?: boolean
}

export async function buildInitialPlans(inp: PlanBuildInput) {
  const svc = createServiceClient()

  const { data: existingIntake } = await svc
    .from('challenge_intake')
    .select('id, experience_level, form_data')
    .eq('enrollment_id', inp.enrollmentId)
    .maybeSingle()

  const priorFormData = (existingIntake?.form_data || {}) as Record<string, unknown>
  const optionalCompleted = !!inp.optional_completed || !!priorFormData.optional_completed
  const injuriesAddressed = !!inp.injuriesAddressed || !!priorFormData.injuries_addressed
  const requiredTierCompleted = !!inp.requiredTierCompleted || !!priorFormData.required_tier_completed

  const intakePayload = {
    enrollment_id: inp.enrollmentId,
    user_id: inp.userId,
    age: inp.age,
    sex: inp.sex,
    height_in: inp.height_in,
    weight_lbs: inp.weight_lbs,
    goal: inp.goal,
    target_lbs: inp.target_lbs,
    activity_level: inp.activity_level,
    experience_level: inp.experience_level,
    training_location: inp.training_location,
    days_per_week: inp.days_per_week,
    weekly_food_budget: inp.weekly_food_budget,
    food_preferences: inp.food_preferences,
    dislikes_allergies: inp.dislikes_allergies,
    injuries_limitations: inp.injuries_limitations,
    form_data: {
      cook_days_per_week: inp.cook_days_per_week ?? 2,
      injuries: inp.injuries ?? [],
      postpartum: !!inp.postpartum,
      training_style: inp.training_style || 'none',
      other_info: inp.other_info || '',
      focus_area: inp.focus_area || 'overall',
      optional_completed: optionalCompleted,
      injuries_addressed: injuriesAddressed,
      required_tier_completed: requiredTierCompleted,
    },
  }

  if (existingIntake) {
    const levelChanged = existingIntake.experience_level !== inp.experience_level
    await svc
      .from('challenge_intake')
      .update({ ...intakePayload, updated_at: new Date().toISOString(), ...(levelChanged ? { level_started_at: new Date().toISOString() } : {}) })
      .eq('id', existingIntake.id)
  } else {
    await svc.from('challenge_intake').insert(intakePayload)
  }

  // Protein anchors to current weight on a cut, goal weight otherwise — same rule
  // calcNutritionTargets used to apply; replicated here via buildBlueprint directly
  // so we can also read the workout/rest day-type split for auto-filled meals.
  //
  // Real bug found+fixed: this used to run unconditionally for EVERY caller,
  // including the Quickstart fast lane (app/api/plan/quickstart-workout/route.ts),
  // which passes entirely hardcoded stats (age 30, female, 165lb, 'lose',
  // 'moderate' — nothing she ever actually told us). Every Quickstart user got
  // the identical calorie/macro number, computed from a fake profile, displayed
  // on the dashboard as if it were personalized the moment intake_completed
  // flipped true a few lines below. Gated on requiredTierCompleted (the same
  // "was this genuinely asked, not defaulted" signal already used for goal —
  // see the field comment above) so a real target only ever gets computed and
  // saved once she's actually been through the real body-stats/goal questions,
  // either via the structured form or Coach Asa's chat build (both already pass
  // this flag correctly) — never via Quickstart, which never passes it.
  const bp = requiredTierCompleted ? buildBlueprint({
    age: inp.age,
    sex: inp.sex === 'male' ? 'male' : 'female',
    height_in: inp.height_in,
    weight_lbs: inp.weight_lbs,
    goal: inp.goal,
    activity: inp.activity_level,
    // Preserves the structured intake route's original (undocumented) behavior of
    // always computing off a 4-day split when this isn't explicitly passed.
    workout_days_per_week: inp.workout_days_per_week ?? 4,
    workout_length: '45_60_both',
    goal_weight_lbs: inp.goal === 'gain' ? inp.weight_lbs + inp.target_lbs : inp.weight_lbs - inp.target_lbs,
  }) : null
  // Mutable — when autoFillMeals recomputes real numbers off the actual portioned
  // meals below, this gets updated to match exactly what gets saved to the DB, so
  // whatever a caller reports back to her (e.g. Coach Asa's chat reply) is never
  // out of sync with what the dashboard actually shows. Zeroed out (not a fake
  // number) when bp is null — callers report these back to her, so a Quickstart
  // return value must read as "nothing calculated yet," not a fabricated target.
  let targets = bp ? {
    calories: Math.round(bp.current.weeklyEat / 7),
    protein_g: bp.current.workout.macros.protein_g,
    carbs_g: bp.current.workout.macros.carbs_g,
    fats_g: bp.current.workout.macros.fats_g,
  } : { calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0 }

  const level = (inp.experience_level === 'advanced' ? 3 : inp.experience_level === 'intermediate' ? 2 : 1) as Level
  const track: 'gym' | 'home' = inp.training_location === 'home' ? 'home' : 'gym'
  const workoutGoal = (inp.goal === 'gain' || inp.goal === 'maintain' ? inp.goal : 'lose') as 'lose' | 'gain' | 'maintain'
  const program = generateWorkout({
    name: inp.name,
    sex: inp.sex,
    track,
    level,
    goal: workoutGoal,
    daysPerWeek: inp.days_per_week,
    weekNumber: 1,
    injuries: inp.injuries ?? [],
    postpartum: !!inp.postpartum,
    trainingStyle: inp.training_style || 'none',
    focusArea: inp.focus_area || 'overall',
    overrideAreas: inp.override_areas,
  })

  let weekPlan: ReturnType<typeof buildWeekFromSelections> | null = null
  let nutritionPayload: Record<string, unknown> = {
    enrollment_id: inp.enrollmentId,
    user_id: inp.userId,
    week_number: 1,
    calories: targets.calories,
    protein_g: targets.protein_g,
    carbs_g: targets.carbs_g,
    fats_g: targets.fats_g,
    status: 'draft',
  }
  if (inp.autoFillMeals && bp) {
    const cookDays = ([1, 2, 3].includes(inp.cook_days_per_week || 0) ? inp.cook_days_per_week : 2) as 1 | 2 | 3
    weekPlan = buildWeekFromSelections({
      name: inp.name,
      workoutDayCal: bp.current.workout.eat,
      restDayCal: bp.current.rest.eat,
      proteinTarget: targets.protein_g,
      cookDays,
      dayTypes: dayTypesForFrequency(inp.days_per_week),
      selections: autoSelectMeals(1, false),
      weightLbs: inp.weight_lbs,
    })
    nutritionPayload = {
      ...nutritionPayload,
      calories: weekPlan.avgCal,
      protein_g: weekPlan.avgProtein,
      meals: weekPlan,
      status: 'published',
    }
    // Real portioned meals rarely land exactly on the raw blueprint target — keep
    // targets in lockstep with what's actually saved, not the pre-portioning number.
    targets = { ...targets, calories: weekPlan.avgCal, protein_g: weekPlan.avgProtein }
  }

  // No row at all when bp is null — a missing nutrition plan reads as a
  // genuine "nothing calculated yet" everywhere downstream (CaloriesTodayCard,
  // FoodLog, /plan/today's "No meal plan yet" card all already handle this
  // correctly), which is more honest than writing one full of zeros pretending
  // a calculation happened.
  if (bp) {
    const { data: existingPlan } = await svc
      .from('challenge_nutrition_plans')
      .select('id')
      .eq('enrollment_id', inp.enrollmentId)
      .eq('week_number', 1)
      .maybeSingle()
    if (existingPlan) {
      await svc.from('challenge_nutrition_plans').update({ ...nutritionPayload, updated_at: new Date().toISOString() }).eq('id', existingPlan.id)
    } else {
      await svc.from('challenge_nutrition_plans').insert(nutritionPayload)
    }
  }

  const workoutPayload = {
    enrollment_id: inp.enrollmentId,
    user_id: inp.userId,
    week_number: 1,
    location: inp.training_location,
    difficulty: inp.experience_level,
    plan: program,
    status: 'published',
  }
  const { data: existingWorkout } = await svc
    .from('challenge_workout_plans')
    .select('id')
    .eq('enrollment_id', inp.enrollmentId)
    .eq('week_number', 1)
    .maybeSingle()
  if (existingWorkout) {
    await svc.from('challenge_workout_plans').update({ ...workoutPayload, updated_at: new Date().toISOString() }).eq('id', existingWorkout.id)
  } else {
    await svc.from('challenge_workout_plans').insert(workoutPayload)
  }

  // Real gap found live: she typed her real name on the intake form's first
  // screen, it flowed all the way through this function (used for reply/PDF
  // text), and was never actually saved to challenge_enrollments.name — the
  // one column the dashboard's greeting (`firstName`) actually reads. Every
  // caller falls back to the literal placeholder 'Your' when it has no real
  // name (cold-start chat, Quickstart), so only write it when it's a genuine
  // one, never overwriting a real saved name with that placeholder.
  await svc
    .from('challenge_enrollments')
    .update({
      intake_completed: true, goal: inp.goal, updated_at: new Date().toISOString(),
      ...(inp.name && inp.name !== 'Your' ? { name: inp.name } : {}),
    })
    .eq('id', inp.enrollmentId)

  return { targets, program, weekPlan }
}
