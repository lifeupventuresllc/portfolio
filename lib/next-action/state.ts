import { createServiceClient } from '@/lib/supabase/server'
import { generateWorkout, type WorkoutProgram, type TrainingStyle, type FocusArea } from '@/lib/workout'
import type { Level, Injury } from '@/lib/workout-exercises'
import { getEffectiveTodayWorkout, getEffectiveCalorieBudget } from '@/lib/fos/effective-plan'
import { getApprovedTodayAdjustment, getProfile } from '@/lib/fos/context'
import { assessLifePattern } from '@/lib/fos/pattern'
import { currentWeekNumber } from '@/lib/localdate'
import type { UserStateSnapshot, EnergyLevel } from './types'

// The User State Model — the "one thing" this whole engine gets built on
// first (see memory: the Recommendation Layer and personalized fallback
// ranking are both just consumers of this). Pulls together everything
// already known about her RIGHT NOW from wherever it actually lives today —
// it does not ask her anything new, and it does not own any of this data;
// it's a read-time aggregation, not a new source of truth.
export async function getUserState(enrollmentId: string, todayISO: string): Promise<UserStateSnapshot> {
  const svc = createServiceClient()

  const [{ data: enrollment }, { data: intake }, { data: workoutPlan }, { data: nutritionPlan }, { data: todayProgress }, { data: foodToday }, profile, pattern, todayAdjustment] = await Promise.all([
    svc.from('challenge_enrollments').select('*').eq('id', enrollmentId).maybeSingle(),
    svc.from('challenge_intake').select('*').eq('enrollment_id', enrollmentId).maybeSingle(),
    svc.from('challenge_workout_plans').select('*').eq('enrollment_id', enrollmentId).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_nutrition_plans').select('calories').eq('enrollment_id', enrollmentId).maybeSingle(),
    svc.from('challenge_progress').select('measurements').eq('enrollment_id', enrollmentId).eq('note', '__daily__').eq('logged_on', todayISO).maybeSingle(),
    svc.from('challenge_food_log').select('calories').eq('enrollment_id', enrollmentId).eq('logged_on', todayISO),
    getProfile(enrollmentId),
    assessLifePattern(enrollmentId, todayISO),
    getApprovedTodayAdjustment(enrollmentId, todayISO),
  ])

  const userId = (enrollment?.user_id as string | null) ?? null
  const injuries = (Array.isArray((intake?.form_data as { injuries?: Injury[] } | null)?.injuries) ? (intake!.form_data as { injuries: Injury[] }).injuries : []) as Injury[]

  // Same real regeneration every other surface uses (see effective-plan.ts) —
  // never a second, possibly-different generation.
  let program: WorkoutProgram | null = (workoutPlan?.plan as WorkoutProgram) ?? null
  if (program && intake) {
    const level = (intake.experience_level === 'advanced' ? 3 : intake.experience_level === 'intermediate' ? 2 : 1) as Level
    const goal = (intake.goal === 'gain' || intake.goal === 'maintain' ? intake.goal : 'lose') as 'lose' | 'gain' | 'maintain'
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

  const calorieBudget = nutritionPlan?.calories != null ? getEffectiveCalorieBudget(Number(nutritionPlan.calories), todayAdjustment) : null
  const caloriesLoggedToday = (foodToday || []).reduce((sum, r) => sum + (Number(r.calories) || 0), 0)

  // energyPatterns is a free-form bag (see fos/types.ts) — the only shape
  // anything writes to it today is a same-day 'today' key from the daily
  // check-in. Read it defensively; 'unknown' is a real, expected value for
  // most sessions until the check-in or an explicit chat signal sets it,
  // and the scorer is built to treat unknown as neutral, not as low.
  const energyRaw = (profile?.energyPatterns as { today?: string } | null)?.today
  const energy: EnergyLevel = energyRaw === 'low' || energyRaw === 'high' || energyRaw === 'normal' ? energyRaw : 'unknown'

  return {
    enrollmentId,
    userId,
    todayISO,
    energy,
    minutesAvailable: null,
    workoutDoneToday,
    workoutCandidate,
    calorieBudget,
    caloriesLoggedToday,
    injuries,
    isDip: pattern.isDip,
    dipRiskBand: pattern.riskBand,
  }
}
