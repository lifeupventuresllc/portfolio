import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { buildBlueprint } from '@/lib/nutrition'
import { buildWeekFromSelections, type DayType, type SelectedMeals } from '@/lib/meal-plan'
import { findRecipe } from '@/lib/recipes'
import type { Recipe } from '@/lib/recipes'
import { parseStoredGoal } from '@/lib/goals'

// Build + save "What to Eat This Week" from her meal selections.
// Targets come from HER stored intake (authoritative) — we never trust the client's numbers.
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    const svc = createServiceClient()

    let { data: enrollment } = await svc
      .from('challenge_enrollments').select('*')
      .eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
    if (!enrollment && user.email) {
      const { data: byEmail } = await svc
        .from('challenge_enrollments').select('*')
        .eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
      enrollment = byEmail || null
    }
    if (!enrollment) return NextResponse.json({ error: 'No enrollment found.' }, { status: 404 })

    const { data: intake } = await svc
      .from('challenge_intake').select('*').eq('enrollment_id', enrollment.id).maybeSingle()
    if (!intake) return NextResponse.json({ error: 'Complete your intake first.' }, { status: 400 })

    // Recompute her per-day targets from her stored stats
    const bp = buildBlueprint({
      age: Number(intake.age), sex: intake.sex === 'male' ? 'male' : 'female',
      height_in: Number(intake.height_in), weight_lbs: Number(intake.weight_lbs),
      // Real bug found live, 2026-09-03: same narrow-cast bug as
      // app/plan/workout/page.tsx — meal targets need her real goal too.
      goal: parseStoredGoal(intake.goal as string | null),
      activity: intake.activity_level || 'moderate',
      workout_days_per_week: Number(intake.days_per_week) || 4,
      workout_length: '45_60_both',
    })

    const body = await request.json()
    const names = body.selections || {}
    const toRecipes = (arr: unknown): Recipe[] =>
      Array.isArray(arr) ? (arr.map((n) => findRecipe(String(n))).filter(Boolean) as Recipe[]) : []
    const selections: SelectedMeals = {
      breakfasts: toRecipes(names.breakfasts), lunches: toRecipes(names.lunches),
      dinners: toRecipes(names.dinners), snacks: toRecipes(names.snacks), desserts: toRecipes(names.desserts),
    }
    const eatOutDays: boolean[] = Array.isArray(body.eatOutDays) && body.eatOutDays.length === 6
      ? body.eatOutDays.map(Boolean) : Array(6).fill(false)
    const needsCooking = eatOutDays.some((v) => !v)

    if (needsCooking && (!selections.breakfasts.length || !selections.lunches.length || !selections.dinners.length)) {
      return NextResponse.json({ error: 'Pick at least one breakfast, lunch, and dinner for your cook days.' }, { status: 400 })
    }

    const cookDays = ([1, 2, 3].includes(Number(body.cookDays)) ? Number(body.cookDays) : 2) as 1 | 2 | 3
    const dayTypes: DayType[] = Array.isArray(body.dayTypes) && body.dayTypes.length === 6
      ? body.dayTypes.map((d: string) => (d === 'rest' ? 'rest' : 'workout'))
      : Array(6).fill('workout')

    const plan = buildWeekFromSelections({
      name: enrollment.name || 'Your',
      workoutDayCal: bp.current.workout.eat,
      restDayCal: bp.current.rest.eat,
      proteinTarget: bp.protein_g,
      cookDays, dayTypes, selections,
      eatOutDays, weightLbs: Number(intake.weight_lbs) || 170,
    })

    // Persist to her Week 1 nutrition plan (published so she can read it)
    const payload = {
      enrollment_id: enrollment.id, user_id: user.id, week_number: 1,
      calories: plan.avgCal, protein_g: plan.avgProtein,
      carbs_g: intake.form_data?.carbs_g ?? null, fats_g: intake.form_data?.fats_g ?? null,
      meals: plan, status: 'published',
    }
    const { data: existing } = await svc
      .from('challenge_nutrition_plans').select('id')
      .eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle()
    if (existing) {
      await svc.from('challenge_nutrition_plans').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await svc.from('challenge_nutrition_plans').insert(payload)
    }

    // Persist her cook-days choice back to intake
    await svc.from('challenge_intake')
      .update({ form_data: { ...(intake.form_data || {}), cook_days_per_week: cookDays }, updated_at: new Date().toISOString() })
      .eq('id', intake.id)

    return NextResponse.json({ success: true, plan })
  } catch (error) {
    console.error('Meal plan build error:', error)
    return NextResponse.json({ error: 'Failed to build meal plan' }, { status: 500 })
  }
}
