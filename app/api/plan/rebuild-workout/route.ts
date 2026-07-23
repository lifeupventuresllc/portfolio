import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getMemberEnrollment } from '@/lib/member'
import { generateWorkout } from '@/lib/workout'
import type { Level, Injury } from '@/lib/workout-exercises'

// Regenerate the member's workout from her stored intake using the CURRENT
// engine — so existing clients get the new push-pull splits without redoing intake.
export async function POST() {
  const { user, enrollment } = await getMemberEnrollment()
  if (!user || !enrollment) return NextResponse.json({ error: 'Not enrolled.' }, { status: 401 })
  const svc = createServiceClient()

  const { data: intake } = await svc.from('challenge_intake').select('*').eq('enrollment_id', enrollment.id).maybeSingle()
  if (!intake) return NextResponse.json({ error: 'Finish your intake first.' }, { status: 400 })

  const level = (intake.experience_level === 'advanced' ? 3 : intake.experience_level === 'intermediate' ? 2 : 1) as Level
  const track: 'gym' | 'home' = intake.training_location === 'home' ? 'home' : 'gym'
  const goal = (intake.goal === 'gain' || intake.goal === 'maintain' ? intake.goal : 'lose') as 'lose' | 'gain' | 'maintain'
  const sex = (intake.sex === 'male' ? 'male' : intake.sex === 'other' ? 'other' : 'female') as 'male' | 'female' | 'other'
  const injuries = (Array.isArray((intake.form_data as { injuries?: Injury[] })?.injuries)
    ? (intake.form_data as { injuries?: Injury[] }).injuries! : []) as Injury[]
  const postpartum = !!(intake.form_data as { postpartum?: boolean } | null)?.postpartum

  const program = generateWorkout({
    name: (enrollment.name as string) || 'Your',
    sex, track, level, goal,
    daysPerWeek: Number(intake.days_per_week) || 3,
    weekNumber: 1,
    injuries,
    postpartum,
  })

  const payload = {
    enrollment_id: enrollment.id, user_id: user.id, week_number: 1,
    location: intake.training_location || 'gym', difficulty: intake.experience_level || 'beginner',
    plan: program, status: 'published', updated_at: new Date().toISOString(),
  }
  const { data: existing } = await svc.from('challenge_workout_plans')
    .select('id').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle()
  const { error } = existing
    ? await svc.from('challenge_workout_plans').update(payload).eq('id', existing.id)
    : await svc.from('challenge_workout_plans').insert(payload)

  if (error) { console.error('rebuild workout error:', error); return NextResponse.json({ error: 'Could not rebuild.' }, { status: 500 }) }
  return NextResponse.json({ success: true })
}
