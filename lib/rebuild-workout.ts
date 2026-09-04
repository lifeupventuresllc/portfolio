import type { SupabaseClient } from '@supabase/supabase-js'
import { generateWorkout, type TrainingStyle, type FocusArea, type WorkoutInputs } from '@/lib/workout'
import type { Level, Injury } from '@/lib/workout-exercises'
import { parseStoredGoal } from '@/lib/goals'
import { parseStoredTrainingStyles } from '@/lib/training-styles'

// Shared by /api/plan/rebuild-workout (generic "get me on the current engine") and
// /api/plan/life-reset (Inner Circle's one-tap "life happened" reset) — both just
// regenerate week 1 from her stored intake, no re-intake required either way.
export async function regenerateWorkoutFromIntake(
  svc: SupabaseClient,
  enrollment: { id: string; name?: string | null },
  userId: string,
  intake: Record<string, unknown>
) {
  const level = (intake.experience_level === 'advanced' ? 3 : intake.experience_level === 'intermediate' ? 2 : 1) as Level
  const track: 'gym' | 'home' = intake.training_location === 'home' ? 'home' : 'gym'
  // Real bug found live, 2026-09-03: same narrow-cast bug as
  // app/plan/workout/page.tsx — the one-tap "life happened" reset and the
  // generic rebuild both need her real goal, not a silently downgraded one.
  const goal = parseStoredGoal(intake.goal as string | null)
  const sex = (intake.sex === 'male' ? 'male' : intake.sex === 'other' ? 'other' : 'female') as 'male' | 'female' | 'other'
  const formData = intake.form_data as { injuries?: Injury[]; postpartum?: boolean; training_style?: TrainingStyle; training_styles?: string[]; focus_area?: FocusArea } | null
  const injuries = (Array.isArray(formData?.injuries) ? formData!.injuries! : []) as Injury[]
  const postpartum = !!formData?.postpartum
  // Real bug found live, 2026-09-04: same narrow single-style read as
  // app/plan/workout/page.tsx (lib/training-styles.ts).
  const trainingStyles = Array.from(parseStoredTrainingStyles(formData?.training_styles, formData?.training_style))
  const focusArea = (formData?.focus_area || 'overall') as FocusArea

  const program = generateWorkout({
    name: enrollment.name || 'Your',
    sex, track, level, goal,
    daysPerWeek: Number(intake.days_per_week) || 3,
    weekNumber: 1,
    injuries,
    postpartum,
    trainingStyles,
    focusArea,
    activityLevel: intake.activity_level as WorkoutInputs['activityLevel'],
  })

  const payload = {
    enrollment_id: enrollment.id, user_id: userId, week_number: 1,
    location: (intake.training_location as string) || 'gym', difficulty: (intake.experience_level as string) || 'beginner',
    plan: program, status: 'published', updated_at: new Date().toISOString(),
  }
  const { data: existing } = await svc.from('challenge_workout_plans')
    .select('id').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle()
  const { error } = existing
    ? await svc.from('challenge_workout_plans').update(payload).eq('id', existing.id)
    : await svc.from('challenge_workout_plans').insert(payload)

  return { error }
}
