import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { updateMemory, type MealMemory } from '@/lib/meal-pick'
import { localDateISO } from '@/lib/localdate'

// The Nutrition tab's write side (2026-10-19). Everything lives on her own
// intake row's form_data — no new table, nothing for Asa to run by hand:
//   eat_style    'cook' | 'out'   — set at intake, changed from the tab's sentence
//   meal_budget  $ for one meal   — same
//   meal_memory  per-meal picked/skipped counts (the learning loop)
// Calorie logging itself goes through the existing /api/plan/food-log.
type Body = {
  action?: 'picked' | 'skipped' | 'style' | 'budget' | 'report'
  key?: string; keys?: string[]
  eatStyle?: string; mealBudget?: number
  message?: string
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
