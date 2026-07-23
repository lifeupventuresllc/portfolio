import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { calcNutritionTargets } from '@/lib/nutrition'
import { generateWorkout } from '@/lib/workout'
import type { Level, Injury } from '@/lib/workout-exercises'

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

    const intakePayload = {
      enrollment_id: enrollment.id,
      user_id: user.id,
      age: body.age,
      sex: body.sex || 'female',
      height_in: body.height_in,
      weight_lbs: body.weight_lbs,
      goal: body.goal,
      target_lbs: body.target_lbs,
      activity_level: body.activity_level,
      experience_level: body.experience_level,
      training_location: body.training_location,
      days_per_week: body.days_per_week,
      weekly_food_budget: body.weekly_food_budget,
      food_preferences: body.food_preferences,
      dislikes_allergies: body.dislikes_allergies,
      injuries_limitations: body.injuries_limitations,
      // catch-all: cook days drive the meal plan (how many times/week she batch-cooks);
      // structured injuries persist so exercise swaps stay injury-aware
      form_data: {
        cook_days_per_week: Number(body.cook_days_per_week) || 2,
        injuries: (Array.isArray(body.injuries) ? body.injuries : []) as Injury[],
      },
    }

    // Upsert intake (one per enrollment)
    const { data: existingIntake } = await svc
      .from('challenge_intake')
      .select('id, experience_level')
      .eq('enrollment_id', enrollment.id)
      .maybeSingle()

    if (existingIntake) {
      // Only reset level_started_at when the level ITSELF changed — an unrelated
      // intake edit (food preferences, budget, etc.) shouldn't restart her clock.
      const levelChanged = existingIntake.experience_level !== body.experience_level
      await svc
        .from('challenge_intake')
        .update({ ...intakePayload, updated_at: new Date().toISOString(), ...(levelChanged ? { level_started_at: new Date().toISOString() } : {}) })
        .eq('id', existingIntake.id)
    } else {
      await svc.from('challenge_intake').insert(intakePayload)
    }

    // Auto-calculate her calorie + macro targets
    const targets = calcNutritionTargets({
      age: Number(body.age),
      sex: body.sex || 'female',
      height_in: Number(body.height_in),
      weight_lbs: Number(body.weight_lbs),
      activity_level: body.activity_level,
      goal: body.goal,
    })

    // Create/refresh a draft Week 1 nutrition plan (macros auto; coach fills meals from The Menu)
    const planPayload = {
      enrollment_id: enrollment.id,
      user_id: user.id,
      week_number: 1,
      calories: targets.calories,
      protein_g: targets.protein_g,
      carbs_g: targets.carbs_g,
      fats_g: targets.fats_g,
      status: 'draft',
    }
    const { data: existingPlan } = await svc
      .from('challenge_nutrition_plans')
      .select('id')
      .eq('enrollment_id', enrollment.id)
      .eq('week_number', 1)
      .maybeSingle()

    if (existingPlan) {
      await svc
        .from('challenge_nutrition_plans')
        .update({ ...planPayload, updated_at: new Date().toISOString() })
        .eq('id', existingPlan.id)
    } else {
      await svc.from('challenge_nutrition_plans').insert(planPayload)
    }

    // Auto-generate her Week 1 workout program from her setup + goals, and publish it.
    const level = (body.experience_level === 'advanced' ? 3 : body.experience_level === 'intermediate' ? 2 : 1) as Level
    const track: 'gym' | 'home' = body.training_location === 'home' ? 'home' : 'gym'
    const workoutGoal = (body.goal === 'gain' || body.goal === 'maintain' ? body.goal : 'lose') as 'lose' | 'gain' | 'maintain'
    const program = generateWorkout({
      name: enrollment.name || body.name || 'Your',
      sex: (body.sex === 'male' ? 'male' : body.sex === 'other' ? 'other' : 'female'),
      track,
      level,
      goal: workoutGoal,
      daysPerWeek: Number(body.days_per_week) || 3,
      weekNumber: 1,
      injuries: (Array.isArray(body.injuries) ? body.injuries : []) as Injury[],
    })

    const workoutPayload = {
      enrollment_id: enrollment.id,
      user_id: user.id,
      week_number: 1,
      location: body.training_location || 'gym',
      difficulty: body.experience_level || 'beginner',
      plan: program,
      status: 'published',
    }
    const { data: existingWorkout } = await svc
      .from('challenge_workout_plans')
      .select('id')
      .eq('enrollment_id', enrollment.id)
      .eq('week_number', 1)
      .maybeSingle()

    if (existingWorkout) {
      await svc
        .from('challenge_workout_plans')
        .update({ ...workoutPayload, updated_at: new Date().toISOString() })
        .eq('id', existingWorkout.id)
    } else {
      await svc.from('challenge_workout_plans').insert(workoutPayload)
    }

    // Mark intake complete + set goal on the enrollment
    await svc
      .from('challenge_enrollments')
      .update({ intake_completed: true, goal: body.goal, updated_at: new Date().toISOString() })
      .eq('id', enrollment.id)

    return NextResponse.json({ success: true, targets })
  } catch (error) {
    console.error('Challenge intake error:', error)
    return NextResponse.json({ error: 'Failed to submit intake' }, { status: 500 })
  }
}
