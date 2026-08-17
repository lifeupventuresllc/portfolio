import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { buildInitialPlans } from '@/lib/plan-builder'
import type { Injury } from '@/lib/workout-exercises'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Please log in to complete your intake.' }, { status: 401 })
    }

    const body = await request.json()
    const svc = createServiceClient()

    // Find this user's enrollment. If they bought as a guest, link by email now.
    let { data: enrollment } = await svc
      .from('challenge_enrollments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .maybeSingle()

    if (!enrollment && user.email) {
      const { data: byEmail } = await svc
        .from('challenge_enrollments')
        .select('*')
        .eq('email', user.email)
        .is('user_id', null)
        .order('created_at', { ascending: false })
        .maybeSingle()
      if (byEmail) {
        await svc.from('challenge_enrollments').update({ user_id: user.id }).eq('id', byEmail.id)
        enrollment = { ...byEmail, user_id: user.id }
      }
    }

    if (!enrollment) {
      return NextResponse.json({ error: 'No challenge enrollment found for your account.' }, { status: 404 })
    }

    const { targets } = await buildInitialPlans({
      enrollmentId: enrollment.id,
      userId: user.id,
      name: enrollment.name || body.name || 'Your',
      age: Number(body.age),
      sex: (body.sex === 'male' ? 'male' : body.sex === 'other' ? 'other' : 'female'),
      height_in: Number(body.height_in),
      weight_lbs: Number(body.weight_lbs),
      goal: body.goal,
      target_lbs: Number(body.target_lbs) || 10,
      activity_level: body.activity_level,
      experience_level: body.experience_level,
      training_location: body.training_location,
      days_per_week: Number(body.days_per_week) || 3,
      weekly_food_budget: body.weekly_food_budget,
      food_preferences: body.food_preferences,
      dislikes_allergies: body.dislikes_allergies,
      injuries_limitations: body.injuries_limitations,
      cook_days_per_week: Number(body.cook_days_per_week) || 2,
      injuries: (Array.isArray(body.injuries) ? body.injuries : []) as Injury[],
      postpartum: !!body.postpartum,
      training_style: body.training_style || 'none',
      other_info: body.other_info || '',
      focus_area: body.focus_area || 'overall',
      // She may have only done the required tier (name/goal/focus/body) so far — once
      // she completes the optional second pass, this flag flips and stays flipped,
      // so the dashboard's "finish your profile" nudge knows to stop showing.
      optional_completed: !!body.refining,
    })

    return NextResponse.json({ success: true, targets })
  } catch (error) {
    console.error('Challenge intake error:', error)
    return NextResponse.json({ error: 'Failed to submit intake' }, { status: 500 })
  }
}
