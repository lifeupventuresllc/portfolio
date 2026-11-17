// One builder for "her plan as of right now" (2026-11-17). The workout screen
// (app/plan/workout/page.tsx) and My Plan on Progress (app/plan/today/
// MyDayBody.tsx) both call this, so the moves My Plan lists for a day are the
// moves she actually gets when she taps Start. Same inputs the workout page
// always used: her intake, the real current week (6-week blocks), her logged
// history, kettlebell/dumbbell day, favorites, and "always" swaps.
import { generateWorkout, type WorkoutProgram, type TrainingStyle, type FocusArea, type WorkoutInputs } from './workout'
import { getProgressionOverrides, getRecentlyTrainedMuscles, getExerciseSessions } from './progression'
import { currentWeekNumber } from './localdate'
import { parseStoredGoal } from './goals'
import { parseStoredTrainingStyles } from './training-styles'
import { weightsFor } from './weight-tags'
import { applyAlwaysSwaps, readAlwaysSwaps } from './always-swaps'
import { readFavorites } from './favorites'
import type { Level, Injury } from './workout-exercises'

export async function buildLiveProgram(opts: {
  enrollment: { id: string; name?: string | null; created_at?: string | null }
  intake: Record<string, unknown>
  trackOverride?: 'gym' | 'home'
  focusOverride?: FocusArea[]
  weightOverride?: unknown
  lowFuelToday?: boolean
}): Promise<WorkoutProgram> {
  const { enrollment, intake } = opts
  const fd = (intake.form_data || null) as Record<string, unknown> | null
  const level = (intake.experience_level === 'advanced' ? 3 : intake.experience_level === 'intermediate' ? 2 : 1) as Level
  const injuries = (Array.isArray(fd?.injuries) ? fd!.injuries : []) as Injury[]
  const goal = parseStoredGoal(intake.goal as string | null)
  const sex = (intake.sex === 'male' ? 'male' : intake.sex === 'other' ? 'other' : 'female') as 'male' | 'female' | 'other'
  const postpartum = !!fd?.postpartum
  const trainingStyles = Array.from(parseStoredTrainingStyles(fd?.training_styles as string[] | undefined, fd?.training_style as TrainingStyle | undefined))
  const focusArea = ((fd?.focus_area as FocusArea | undefined) || 'overall') as FocusArea
  const createdAt = enrollment.created_at || new Date().toISOString()
  const weekNumber = currentWeekNumber(createdAt)
  const [progressionOverrides, recentlyTrainedMuscles, exerciseHistory] = await Promise.all([
    getProgressionOverrides(enrollment.id),
    getRecentlyTrainedMuscles(enrollment.id),
    getExerciseSessions(enrollment.id, createdAt),
  ])
  const track = opts.trackOverride || (intake.training_location === 'home' ? 'home' : 'gym')
  const program = generateWorkout({
    favorites: readFavorites(fd),
    name: enrollment.name || 'Your', sex, track, level, goal,
    weights: weightsFor(fd as { home_kettlebells?: boolean } | null, track, opts.weightOverride as Parameters<typeof weightsFor>[2]),
    daysPerWeek: Number(intake.days_per_week) || 3, weekNumber, injuries, postpartum, trainingStyles, focusArea,
    overrideAreas: opts.focusOverride?.length ? opts.focusOverride : undefined,
    progressionOverrides,
    activityLevel: intake.activity_level as WorkoutInputs['activityLevel'],
    lowFuelToday: opts.lowFuelToday,
    recentlyTrainedMuscles,
    exerciseHistory,
  })
  return applyAlwaysSwaps(program, readAlwaysSwaps(fd))
}
