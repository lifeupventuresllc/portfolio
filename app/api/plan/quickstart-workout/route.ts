import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { buildInitialPlans } from '@/lib/plan-builder'

// The "Sculpt Sessions" fast lane — she picks home or gym, nothing else, and gets
// a real beginner-friendly full-body workout immediately. No injury/focus question
// (unlike Coach Asa's chat build) — this is the zero-friction entry point Asa asked
// for specifically for this card; Coach Asa's chat remains the place for anything
// more tailored.
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  let body: { location?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Bad request.' }, { status: 400 }) }
  const training_location: 'home' | 'gym' = body.location === 'home' ? 'home' : 'gym'

  const svc = createServiceClient()
  let { data: enrollment } = await svc
    .from('challenge_enrollments').select('id, name')
    .eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc
      .from('challenge_enrollments').select('id, name')
      .eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
    enrollment = byEmail || null
  }
  if (!enrollment) return NextResponse.json({ error: 'No enrollment found.' }, { status: 404 })

  await buildInitialPlans({
    enrollmentId: enrollment.id as string,
    userId: user.id,
    name: (enrollment.name as string) || 'Your',
    age: 30,
    sex: 'female',
    height_in: 64,
    weight_lbs: 165,
    goal: 'lose',
    target_lbs: 10,
    activity_level: 'moderate',
    experience_level: 'beginner',
    training_location,
    days_per_week: 3,
    workout_days_per_week: 3,
    cook_days_per_week: 2,
    injuries: [],
    postpartum: false,
    training_style: 'none',
    focus_area: 'overall',
    autoFillMeals: true,
  })

  return NextResponse.json({ ok: true })
}
