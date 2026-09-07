import { pickFocusDayIndex, type WorkoutProgram, type FocusArea } from '@/lib/workout'
import type { WorkoutChange, NutritionChange } from './types'
import type { DayType } from '@/lib/meal-plan'

// The one shared place that knows how to combine a stored plan with an
// approved today-only adjustment. Previously this merge (today's workout by
// rotation, cardio-swap title override, calorie delta, eating-out override)
// was duplicated separately across /plan, /plan/today, and /plan/eating-out
// — and one of them (/plan/today, the page the bottom-tab nav actually
// lands on) once fell out of sync after a real chat approval, still showing
// her the unadjusted plan. Every surface that displays "today" must call
// these instead of recomputing the merge itself, so there's exactly one
// place to get it right rather than N copies that can silently drift.
export type TodayAdjustment = { workoutChange: WorkoutChange | null; nutritionChange: NutritionChange | null; message: string | null } | null

export type EffectiveWorkout = { title: string; muscles?: string[] } | null

const FOCUS_AREA_LABEL: Record<Exclude<FocusArea, 'overall'>, string> = {
  core: 'Core', legs: 'Legs', arms: 'Arms', chest: 'Chest', back: 'Back', shoulders: 'Shoulders',
}

// A real, specific title for whichever area(s) she asked for — "Back Focus,"
// not the generic day label underneath it. Needed because home-track day
// TITLES don't carry per-muscle detail the way gym's do: buildHomeDay (lib/
// workout-assembly.ts) titles a full-body day literally "Full Body," and
// otherwise only alternates "Leg Focus" / "Upper Body & Core" — arms, chest,
// back, and shoulders all collapse into that same "Upper Body & Core" label.
// So pickFocusDayIndex was already
// correctly selecting a day whose EXERCISES matched her ask (confirmed live
// via Coach Asa's own reply text), but the title shown back to her never
// reflected it — a beginner asking for "back" always saw "Full Body" on the
// circle no matter what she approved, indistinguishable from the override
// having silently failed.
function focusLabel(areas: FocusArea[]): string {
  return areas.filter((a): a is Exclude<FocusArea, 'overall'> => a !== 'overall').map((a) => FOCUS_AREA_LABEL[a]).join(' & ')
}

// Today's workout by rotation (same # workouts finished % day count logic
// every consumer already used), with the cardio-swap override already
// applied — the title she'll actually get, not her originally-scheduled day.
// Real gap found live: this was a THIRD independent copy of day-selection
// logic (alongside app/plan/workout/page.tsx and the chat reply's own
// summarizeTodaysWorkout), with zero focus-area awareness — a chat-approved
// or cold-start-built "focus on my core" request would show correctly in
// chat and on /plan/workout, but the dashboard's own "Today's Workout" card
// (and /plan/today, which shares this same function) would still silently
// show her plain rotation day, unrelated to what she'd just asked for.
// `focusArea` mirrors the same resolved value the other two surfaces use —
// an approved one-off override, or (only before she's completed anything,
// same reasoning as /plan/workout) her freshly-stored focus preference.
export function getEffectiveTodayWorkout(program: WorkoutProgram | null, completedCount: number, todayAdjustment: TodayAdjustment, focusArea?: FocusArea | FocusArea[]): EffectiveWorkout {
  if (!program) return null
  const numDays = program.track === 'home' ? (program.home?.days.length || 1) : (program.gymDays?.length || 1)
  const areas = Array.isArray(focusArea) ? focusArea : focusArea ? [focusArea] : []
  const hasFocus = areas.some((a) => a !== 'overall')
  const startDay = hasFocus ? pickFocusDayIndex(program, focusArea) : (numDays > 0 ? completedCount % numDays : 0)
  let workout: EffectiveWorkout = null
  if (program.track === 'home') {
    const d = program.home?.days[startDay]
    if (d) workout = { title: hasFocus ? `${focusLabel(areas)} Focus` : d.title }
  } else {
    const d = program.gymDays?.[startDay]
    if (d) workout = { title: d.title, muscles: d.muscles }
  }
  if (workout && todayAdjustment?.workoutChange?.contentSwap === 'cardio') {
    return { title: 'Cardio & Conditioning' }
  }
  return workout
}

// Real per-person rest-day vs workout-day split (Asa's ask, 2026-09-07: "no
// logic that shows their rest day calories versus their workout calories" —
// the Calorie Blueprint at /blueprint already computes this via
// lib/nutrition.ts's buildBlueprint, but the structured intake form — the
// path nearly every real signup goes through — only ever saved ONE flat
// weekly-average number, with `schedule` (which weekdays are workout days,
// Sun always rest) never persisted at all. Only Coach Asa's chat build and
// the Blueprint's own guest build got a real split, via a full auto-filled
// week of meals. Persisted on challenge_nutrition_plans.day_targets by
// lib/plan-builder.ts for every plan now, not just those two.
export type DayTargets = {
  schedule: DayType[] // Mon..Sat; Sunday is never in this array, always 'rest'
  rest: { calories: number; protein_g: number; carbs_g: number; fats_g: number }
  workout: { calories: number; protein_g: number; carbs_g: number; fats_g: number }
} | null

// mealIdx: Mon=0 … Sat=5 (lib/localdate's localMondayIndex), Sun=6+.
export function scheduleDayType(dayTargets: DayTargets, mealIdx: number): DayType {
  if (!dayTargets || mealIdx < 0 || mealIdx > 5) return 'rest'
  return dayTargets.schedule[mealIdx] === 'workout' ? 'workout' : 'rest'
}

// Real gap found+fixed (Asa's ask, 2026-09-07 — the follow-up to the
// rest/workout split above: "does it actually know if she's on a workout day
// or a rest day," not just guess from a Mon-Sat calendar). The workout
// engine is rotation-based by design (lib/workout.ts picks the next day by
// # workouts completed, not by day-of-week) — she can genuinely train on any
// day. `schedule` above is only ever a planning-ahead GUESS for "how many
// workout days this week." The real signal from the workout brain — did she
// actually do (or explicitly skip) a workout today — has to win when it
// disagrees with that guess, the same way lib/next-action/state.ts's
// workoutSkippedToday/workoutDoneToday already override its own calorie math.
export type WorkoutTodayStatus = 'done' | 'skipped' | 'pending'
export function workoutTodayStatus(doneToday: boolean, skippedToday: boolean): WorkoutTodayStatus {
  return doneToday ? 'done' : skippedToday ? 'skipped' : 'pending'
}
export function resolvedDayType(scheduled: DayType, workoutStatus: WorkoutTodayStatus): DayType {
  if (workoutStatus === 'done') return 'workout' // trained today even on a scheduled rest day — real burn, real credit
  if (workoutStatus === 'skipped') return 'rest' // scheduled workout, explicitly skipped/simplified — no burn to credit
  return scheduled // undecided yet — the honest planning-ahead default
}

// Resolves TODAY's real calorie target. A full auto-filled week (Coach Asa /
// Blueprint builds) carries a per-day target AND day type on `todayMeals` —
// still wins when the real workout status agrees with it (its own baked-in
// number), but a real status that disagrees (e.g. `todayMeals.dayType` was
// 'rest' and she trained anyway) is re-priced off `dayTargets` directly
// rather than trusting the stale baked-in number. Falls back to the flat
// weekly-average column for plans built before day_targets existed. Never
// returns a made-up number.
export function resolveTodayCalorieTarget(
  todayMealsTarget: number | undefined | null,
  scheduledType: DayType | null,
  dayTargets: DayTargets,
  flatTarget: number | null,
  workoutStatus: WorkoutTodayStatus = 'pending'
): number | undefined {
  const effectiveType = scheduledType ? resolvedDayType(scheduledType, workoutStatus) : null
  if (effectiveType && effectiveType !== scheduledType && dayTargets) return dayTargets[effectiveType].calories
  if (todayMealsTarget != null) return todayMealsTarget
  if (dayTargets && effectiveType) return dayTargets[effectiveType].calories
  return flatTarget ?? undefined
}

// The real, personalized Exercise Burn (today's workout-day target minus its
// rest-day target — straight from the same Mifflin-St Jeor + NEAT + Exercise
// Burn formula the Calorie Blueprint uses) when the plan has it. Only plans
// built before day_targets existed fall back to one flat generic guess.
const FALLBACK_WORKOUT_BURN_ESTIMATE = 300
export function workoutBurnEstimate(dayTargets: DayTargets): number {
  if (!dayTargets) return FALLBACK_WORKOUT_BURN_ESTIMATE
  return Math.max(0, dayTargets.workout.calories - dayTargets.rest.calories)
}

// Base calorie target + any approved today-only delta, floored at 0.
export function getEffectiveCalorieBudget(baseTarget: number, todayAdjustment: TodayAdjustment): number {
  const delta = Number(todayAdjustment?.nutritionChange?.calorieDelta) || 0
  return delta ? Math.max(0, baseTarget + delta) : baseTarget
}

// A pre-scheduled eat-out day OR an ad-hoc "I'm eating out today" chat
// approval — either one means the fixed meal list is irrelevant today.
export function isEatingOutToday(scheduledEatOut: boolean | undefined, todayAdjustment: TodayAdjustment): boolean {
  return !!scheduledEatOut || !!todayAdjustment?.nutritionChange?.eatingOut
}
