import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { updateMemory, cleanOverrides, HABIT_MEALS, type MealMemory, type HabitMeal } from '@/lib/meal-pick'
import { localDateISO } from '@/lib/localdate'

// The Nutrition tab's write side (2026-10-19). Everything lives on her own
// intake row's form_data — no new table, nothing for Asa to run by hand:
//   eat_style    'cook' | 'out'   — set at intake, changed from the tab's sentence
//   meal_budget  $ for one meal   — same
//   meal_memory  per-meal picked/skipped counts (the learning loop)
//   order_app    'doordash' | 'ubereats' — which delivery app a pick opens
//   meal_times_set  { lunch: 780, … } — usual meal times she set herself
//                   (minutes of her day); learned ones come from her food log
//   meal_offers_off true — she turned meal-time picks (the Yes / No
//                   notification, app/api/cron/meal-offer) off
// Calorie logging itself goes through the existing /api/plan/food-log.
type Body = {
  action?: 'picked' | 'skipped' | 'style' | 'budget' | 'report' | 'order_app' | 'meal_time' | 'offers'
  on?: boolean
  key?: string; keys?: string[]
  meal?: string; minute?: number | null
  eatStyle?: string; mealBudget?: number
  message?: string
  orderApp?: string
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  let body: Body
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Bad request.' }, { status: 400 }) }

  const svc = createServiceClient()
  let { data: enrollment } = await svc.from('challenge_enrollments').select('id').eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc.from('challenge_enrollments').select('id').eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
    enrollment = byEmail || null
  }
  if (!enrollment) return NextResponse.json({ error: 'No plan found.' }, { status: 404 })

  if (body.action === 'report') {
    const message = (body.message || '').toString().slice(0, 500)
    await svc.from('app_feedback').insert({
      user_id: user.id, email: user.email || null, screen: '/plan/nutrition',
      message: `[Meal calories look wrong] ${body.key || 'unknown meal'}${message ? ` — ${message}` : ''}`,
    })
    return NextResponse.json({ ok: true })
  }

  const { data: intake } = await svc.from('challenge_intake').select('id, form_data').eq('enrollment_id', enrollment.id as string).maybeSingle()
  if (!intake) return NextResponse.json({ error: 'No intake found.' }, { status: 404 })
  const formData = { ...((intake.form_data || {}) as Record<string, unknown>) }
  const todayIso = localDateISO()

  if (body.action === 'style') {
    if (body.eatStyle !== 'cook' && body.eatStyle !== 'out') return NextResponse.json({ error: 'Bad style.' }, { status: 400 })
    formData.eat_style = body.eatStyle
    // A money number set for eating out doesn't make sense for cooking (and
    // back) — clear it so the default for the new style takes over.
    delete formData.meal_budget
  } else if (body.action === 'budget') {
    const n = Math.round(Number(body.mealBudget))
    if (!Number.isFinite(n) || n < 2 || n > 100) return NextResponse.json({ error: 'Bad amount.' }, { status: 400 })
    formData.meal_budget = n
  } else if (body.action === 'order_app') {
    if (body.orderApp !== 'doordash' && body.orderApp !== 'ubereats') return NextResponse.json({ error: 'Bad app.' }, { status: 400 })
    formData.order_app = body.orderApp
  } else if (body.action === 'meal_time') {
    // Her own usual time for one meal (Today's food settings) — wins over the
    // learned one until she taps "Use my habits again" (minute: null).
    if (!HABIT_MEALS.includes(body.meal as HabitMeal)) return NextResponse.json({ error: 'Bad meal.' }, { status: 400 })
    const set = cleanOverrides(formData.meal_times_set)
    if (body.minute == null) delete set[body.meal as HabitMeal]
    else {
      const n = Math.round(Number(body.minute))
      if (!Number.isFinite(n) || n < 0 || n >= 24 * 60) return NextResponse.json({ error: 'Bad time.' }, { status: 400 })
      set[body.meal as HabitMeal] = n
    }
    if (Object.keys(set).length) formData.meal_times_set = set
    else delete formData.meal_times_set
  } else if (body.action === 'offers') {
    // Meal-time picks on/off — off is saved, on is the default.
    if (typeof body.on !== 'boolean') return NextResponse.json({ error: 'Bad value.' }, { status: 400 })
    if (body.on) delete formData.meal_offers_off
    else formData.meal_offers_off = true
  } else if (body.action === 'picked' || body.action === 'skipped') {
    let memory = (formData.meal_memory || {}) as MealMemory
    const keys = body.action === 'picked' ? [body.key] : (body.keys || [])
    for (const k of keys) if (typeof k === 'string' && k.length <= 140) memory = updateMemory(memory, k, body.action, todayIso)
    formData.meal_memory = memory
  } else {
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  }

  const { error } = await svc.from('challenge_intake').update({ form_data: formData }).eq('id', intake.id as string)
  if (error) return NextResponse.json({ error: 'Could not save.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
