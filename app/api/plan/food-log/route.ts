import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { localDateISO } from '@/lib/localdate'

// Food log — what she ACTUALLY ate today (MyFitnessPal-style), tracked vs her daily target.
// Rows live in challenge_food_log (migration 016). One row per food, grouped by `meal`.
const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'] as const
type Meal = (typeof MEALS)[number]
const num = (v: unknown, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d }

async function resolve() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, enrollment: null, svc: null }
  const svc = createServiceClient()
  let { data: enrollment } = await svc.from('challenge_enrollments').select('id').eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc.from('challenge_enrollments').select('id').eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
    enrollment = byEmail || null
  }
  return { user, enrollment, svc }
}

// Her daily macro target — from the stored nutrition plan (week 1). carbs/fats can be null on
// the row, so derive a sensible split from calories + protein when they're missing.
async function loadTarget(svc: ReturnType<typeof createServiceClient>, enrollmentId: string) {
  const { data } = await svc.from('challenge_nutrition_plans').select('calories, protein_g, carbs_g, fats_g').eq('enrollment_id', enrollmentId).eq('week_number', 1).maybeSingle()
  const calories = num(data?.calories)
  const protein_g = num(data?.protein_g)
  let carbs_g = data?.carbs_g == null ? null : num(data.carbs_g)
  let fats_g = data?.fats_g == null ? null : num(data.fats_g)
  if ((carbs_g == null || fats_g == null) && calories > 0) {
    const remaining = Math.max(0, calories - protein_g * 4)
    if (fats_g == null) fats_g = Math.round((remaining * 0.30) / 9)
    if (carbs_g == null) carbs_g = Math.round((remaining * 0.70) / 4)
  }
  return { calories, protein_g, carbs_g: carbs_g ?? 0, fats_g: fats_g ?? 0 }
}

async function loadDay(svc: ReturnType<typeof createServiceClient>, enrollmentId: string, day: string) {
  const { data: entries } = await svc.from('challenge_food_log')
    .select('id, meal, name, brand, servings, serving_label, calories, protein_g, carbs_g, fats_g, source')
    .eq('enrollment_id', enrollmentId).eq('logged_on', day).order('created_at', { ascending: true })
  const list = entries || []
  const totals = list.reduce((a, r) => ({
    calories: a.calories + num(r.calories), protein_g: a.protein_g + num(r.protein_g),
    carbs_g: a.carbs_g + num(r.carbs_g), fats_g: a.fats_g + num(r.fats_g),
  }), { calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0 })
  const target = await loadTarget(svc, enrollmentId)
  return { date: day, entries: list, totals, target }
}

export async function GET(request: NextRequest) {
  const { user, enrollment, svc } = await resolve()
  const day = request.nextUrl.searchParams.get('date') || localDateISO()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  if (!enrollment || !svc) return NextResponse.json({ date: day, entries: [], totals: { calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0 }, target: { calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0 } })
  return NextResponse.json(await loadDay(svc, enrollment.id as string, day))
}

export async function POST(request: NextRequest) {
  const { user, enrollment, svc } = await resolve()
  if (!user || !enrollment || !svc) return NextResponse.json({ error: 'Not enrolled.' }, { status: 401 })
  const b = await request.json()
  const name = (b.name || '').toString().trim()
  if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  const meal: Meal = MEALS.includes(b.meal) ? b.meal : 'snack'
  const day = (b.logged_on || localDateISO()).toString().slice(0, 10)
  const servings = Math.max(0.1, num(b.servings, 1))
  await svc.from('challenge_food_log').insert({
    enrollment_id: enrollment.id, user_id: user.id, logged_on: day, meal, name,
    brand: b.brand ? b.brand.toString().slice(0, 120) : null,
    servings, serving_label: b.serving_label ? b.serving_label.toString().slice(0, 60) : null,
    calories: Math.round(num(b.calories)), protein_g: Math.round(num(b.protein_g)),
    carbs_g: Math.round(num(b.carbs_g)), fats_g: Math.round(num(b.fats_g)),
    source: b.source ? b.source.toString().slice(0, 40) : 'manual',
  })
  return NextResponse.json(await loadDay(svc, enrollment.id as string, day))
}

// Real gap found live, 2026-09-03 (beta tester report + novice glance-test
// audit): editing a logged entry only ever meant delete-and-redo — no way
// to just fix the quantity. Same MyFitnessPal/Lose It! pattern researched
// live: tap the entry, adjust it, save — this is that save.
export async function PATCH(request: NextRequest) {
  const { user, enrollment, svc } = await resolve()
  if (!user || !enrollment || !svc) return NextResponse.json({ error: 'Not enrolled.' }, { status: 401 })
  const b = await request.json()
  const id = (b.id || '').toString()
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })
  const day = (b.logged_on || localDateISO()).toString().slice(0, 10)
  const servings = Math.max(0.1, num(b.servings, 1))
  // Scope to this enrollment so a user can only ever update their own rows.
  const { error } = await svc.from('challenge_food_log').update({
    servings, serving_label: b.serving_label ? b.serving_label.toString().slice(0, 60) : null,
    calories: Math.round(num(b.calories)), protein_g: Math.round(num(b.protein_g)),
    carbs_g: Math.round(num(b.carbs_g)), fats_g: Math.round(num(b.fats_g)),
  }).eq('id', id).eq('enrollment_id', enrollment.id)
  if (error) return NextResponse.json({ error: 'Could not update that entry.' }, { status: 500 })
  return NextResponse.json(await loadDay(svc, enrollment.id as string, day))
}

export async function DELETE(request: NextRequest) {
  const { user, enrollment, svc } = await resolve()
  if (!user || !enrollment || !svc) return NextResponse.json({ error: 'Not enrolled.' }, { status: 401 })
  const id = request.nextUrl.searchParams.get('id')
  const day = request.nextUrl.searchParams.get('date') || localDateISO()
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })
  // Scope the delete to this enrollment so a user can only remove their own rows.
  await svc.from('challenge_food_log').delete().eq('id', id).eq('enrollment_id', enrollment.id)
  return NextResponse.json(await loadDay(svc, enrollment.id as string, day))
}
