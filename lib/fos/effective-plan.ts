import { pickFocusDayIndex, type WorkoutProgram, type FocusArea } from '@/lib/workout'
import type { WorkoutChange, NutritionChange } from './types'

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
export function getEffectiveTodayWorkout(program: WorkoutProgram | null, completedCount: number, todayAdjustment: TodayAdjustment, focusArea?: FocusArea): EffectiveWorkout {
  if (!program) return null
  const numDays = program.track === 'home' ? (program.home?.days.length || 1) : (program.gymDays?.length || 1)
  const startDay = focusArea ? pickFocusDayIndex(program, focusArea) : (numDays > 0 ? completedCount % numDays : 0)
  let workout: EffectiveWorkout = null
  if (program.track === 'home') {
    const d = program.home?.days[startDay]
    if (d) workout = { title: d.title }
  } else {
    const d = program.gymDays?.[startDay]
    if (d) workout = { title: d.title, muscles: d.muscles }
  }
  if (workout && todayAdjustment?.workoutChange?.contentSwap === 'cardio') {
    return { title: 'Cardio & Conditioning' }
  }
  return workout
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
