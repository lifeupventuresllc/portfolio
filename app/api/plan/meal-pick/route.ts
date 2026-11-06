import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { updateMemory, cleanOverrides, HABIT_MEALS, type MealMemory, type HabitMeal } from '@/lib/meal-pick'
import { localDateISO } from '@/lib/localdate'
import { readPlan, planFromForm, nextDayISO, cleanPick, ALL_STOP_IDS, type PlanStopId } from '@/lib/day-plan'

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
//   day_plan     today's planned meals (lib/day-plan.ts) — plan_set /
//                plan_confirm / plan_eaten / plan_extra, 2026-11-05
// Calorie logging itself goes through the existing /api/plan/food-log.
type Body = {
  action?: 'picked' | 'skipped' | 'style' | 'budget' | 'report' | 'order_app' | 'meal_time' | 'offers' | 'paid'
    | 'plan_set' | 'plan_confirm' | 'plan_eaten' | 'plan_extra'
  stop?: string; pick?: unknown; confirmed?: boolean; extras?: number
  day?: 'tomorrow'                 // plan_* on tomorrow's plan ("Plan tomorrow")
  on?: boolean
  place?: string; paid?: number; shown?: number; entryId?: string
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
  } else if (body.action === 'paid') {
    // "What did it cost?" (2026-11-02): she tells us what she really paid at
    // this restaurant; her prices there learn from it (half old, half new) and
    // today's money uses the real amount.
    const place = String(body.place || '').slice(0, 60)
    const paid = Number(body.paid), shown = Number(body.shown)
    if (!place || !(paid > 0 && paid < 200) || !(shown > 0)) return NextResponse.json({ error: 'Bad amount.' }, { status: 400 })
    const factors = { ...((formData.price_factors || {}) as Record<string, number>) }
    const old = factors[place] || 1
    const base = shown / old
    const next = Math.min(2, Math.max(0.6, old * 0.5 + (paid / base) * 0.5))
    factors[place] = Math.round(next * 100) / 100
    formData.price_factors = factors
    if (typeof body.entryId === 'string' && body.entryId) {
      // Best effort: the price column exists once migration 049 has run.
      await svc.from('challenge_food_log').update({ price: Math.round(paid * 100) / 100 }).eq('id', body.entryId).eq('enrollment_id', enrollment.id as string).then(() => null, () => null)
    }
  } else if (body.action === 'plan_set' || body.action === 'plan_confirm' || body.action === 'plan_eaten' || body.action === 'plan_extra') {
    // Her day plan. Any change to a meal un-confirms the day until she taps
    // "Confirm my day" again; eating a meal never does.
    // "Plan tomorrow" works on form_data.day_plan_next; it becomes today's
    // plan at midnight (lib/day-plan planFromForm). Nothing is eaten ahead.
    const ahead = body.day === 'tomorrow'
    if (ahead && body.action === 'plan_eaten') return NextResponse.json({ error: 'Not today yet.' }, { status: 400 })
    const plan = ahead ? readPlan(formData.day_plan_next, nextDayISO(todayIso)) : planFromForm(formData, todayIso)
    const stop = body.stop as PlanStopId
    if (body.action === 'plan_set') {
      if (!ALL_STOP_IDS.includes(stop)) return NextResponse.json({ error: 'Bad meal.' }, { status: 400 })
      if (plan.picks[stop]?.eatenId) return NextResponse.json({ error: 'Already eaten.' }, { status: 409 })
      const pick = body.pick === null ? null : cleanPick(body.pick)
      if (body.pick !== null && !pick) return NextResponse.json({ error: 'Bad pick.' }, { status: 400 })
      if (body.pick === undefined) delete plan.picks[stop]
      else plan.picks[stop] = pick
      plan.confirmed = false
      if (pick) formData.meal_memory = updateMemory((formData.meal_memory || {}) as MealMemory, pick.key, 'picked', todayIso)
    } else if (body.action === 'plan_confirm') {
      plan.confirmed = body.confirmed !== false
    } else if (body.action === 'plan_eaten') {
      const pick = plan.picks[stop]
      if (!ALL_STOP_IDS.includes(stop) || !pick) return NextResponse.json({ error: 'Bad meal.' }, { status: 400 })
      pick.eatenId = typeof body.entryId === 'string' && body.entryId ? body.entryId.slice(0, 64) : null
    } else {
      const n = Math.round(Number(body.extras))
      if (!(n >= 0 && n <= 2)) return NextResponse.json({ error: 'Bad value.' }, { status: 400 })
      for (const id of (['snack2', 'snack3'] as const).slice(n)) if (!plan.picks[id]?.eatenId) delete plan.picks[id]
      plan.extras = n
    }
    if (ahead) formData.day_plan_next = plan
    else {
      formData.day_plan = plan
      // Last night's "tomorrow" plan is today's now: drop the copy.
      if ((formData.day_plan_next as { date?: string } | undefined)?.date && (formData.day_plan_next as { date: string }).date <= todayIso) delete formData.day_plan_next
    }
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
  return NextResponse.json({ ok: true, plan: formData.day_plan ?? null })
}
