import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { localDateISO, localHourNumber } from '@/lib/localdate'
import { recover, type LifeSignal } from '@/lib/fos/recovery'
import { parseSignal } from '@/lib/fos/parse'
import { detectEatenFood } from '@/lib/food-estimate'
import type { FosEventKind } from '@/lib/fos/types'

// The Fitness OS operator (Phase 1). She tells it about her day; it replies in Coach
// Asa's voice with a goal-protecting adjustment she can approve / modify / reject.
// Runs on the rule-based recovery engine — persists to the fos_* tables when migration
// 017 is applied, and degrades to a live preview (no persistence) until then.

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

const eventKindFor = (s: LifeSignal): FosEventKind =>
  s.kind === 'missed' ? 'miss'
  : s.kind === 'eat_out' ? 'eat_out'
  : s.kind === 'schedule_change' ? 'schedule_change'
  : s.kind === 'exhausted' ? 'low_energy'
  : s.kind === 'poor_sleep' ? 'poor_sleep'
  : s.kind === 'craving' ? 'craving'
  : s.kind === 'stressed' ? 'stressed'
  : 'message'

export async function GET() {
  const { user, enrollment, svc } = await resolve()
  if (!user || !enrollment || !svc) return NextResponse.json({ messages: [] })
  const { data } = await svc.from('fos_messages').select('role, content, created_at').eq('enrollment_id', enrollment.id).order('created_at', { ascending: true }).limit(60)
  return NextResponse.json({ messages: data || [] })
}

export async function POST(request: NextRequest) {
  const { user, enrollment, svc } = await resolve()
  if (!user || !enrollment || !svc) return NextResponse.json({ error: 'Not enrolled.' }, { status: 401 })
  let body
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Bad request.' }, { status: 400 }) }
  const today = localDateISO()
  const eid = enrollment.id as string

  // Action: she approved / modified / rejected a recommended adjustment.
  if (body.adjustmentId !== undefined && body.status) {
    const status = ['approved', 'modified', 'rejected'].includes(body.status) ? body.status : 'approved'
    if (body.adjustmentId) await svc.from('fos_adjustments').update({ status }).eq('id', body.adjustmentId).eq('enrollment_id', eid)
    await svc.from('fos_events').insert({ enrollment_id: eid, user_id: user.id, occurred_on: today, kind: 'adjustment', summary: `Adjustment ${status}`, payload: { adjustmentId: body.adjustmentId, status } })
    const reply = status === 'approved' ? "Locked in. I've got the rest — go be great. 💛"
      : status === 'rejected' ? "No problem — we'll keep today as planned. You're always in control."
      : "Got it — tell me what you'd rather do and I'll rework it around your goal."
    await svc.from('fos_messages').insert({ enrollment_id: eid, user_id: user.id, role: 'operator', content: reply })
    return NextResponse.json({ reply })
  }

  // Message flow: parse → recover → recommend an adjustment.
  const message = (body.message || '').toString().trim().slice(0, 800)
  if (!message) return NextResponse.json({ error: 'Say something first.' }, { status: 400 })
  await svc.from('fos_messages').insert({ enrollment_id: eid, user_id: user.id, role: 'user', content: message })

  const signal = parseSignal(message)

  // Nothing situational matched — check whether she's actually just telling us
  // what she ate ("I had a slice of pizza"). Real Claude detection (see
  // lib/food-estimate.ts), not a keyword guess — degrades to nothing (falls
  // through to the generic reply below) when ANTHROPIC_API_KEY isn't set yet.
  // Logs immediately, no approve/reject step: same as tapping a food-search
  // result, and a mislogged item is a one-tap delete in the food log.
  if (!signal) {
    const foods = await detectEatenFood(message)
    if (foods.length > 0) {
      const hour = localHourNumber()
      const meal = hour < 11 ? 'breakfast' : hour < 15 ? 'lunch' : hour < 21 ? 'dinner' : 'snack'
      for (const f of foods) {
        await svc.from('challenge_food_log').insert({
          enrollment_id: eid, user_id: user.id, logged_on: today, meal, name: f.name,
          brand: f.brand, servings: f.servings, serving_label: f.serving_label,
          calories: f.calories, protein_g: f.protein_g, carbs_g: f.carbs_g, fats_g: f.fats_g,
          source: 'estimated',
        })
      }
      const summary = foods.map((f) => `${f.name} (~${f.calories} cal)`).join(', ')
      const reply = `Logged it: ${summary}. Estimated, not exact — but it's counted toward today already. 💛`
      await svc.from('fos_events').insert({ enrollment_id: eid, user_id: user.id, occurred_on: today, kind: 'message', summary: message, payload: { loggedFood: true, foods } })
      await svc.from('fos_messages').insert({ enrollment_id: eid, user_id: user.id, role: 'operator', content: reply })
      return NextResponse.json({ reply, loggedFood: true })
    }
  }

  const plan = signal ? recover(signal, 45) : null
  const reply = plan ? plan.message
    : "I hear you. Tell me what today looks like — how much time you've got, your energy, or what changed — and I'll adjust your plan around it while protecting your goal."

  await svc.from('fos_events').insert({ enrollment_id: eid, user_id: user.id, occurred_on: today, kind: signal ? eventKindFor(signal) : 'message', summary: message, payload: signal ? { signal } : {} })

  let adjustmentId: string | null = null
  if (plan) {
    const { data: adj } = await svc.from('fos_adjustments').insert({
      enrollment_id: eid, user_id: user.id, for_date: today, trigger: message,
      workout_change: plan.workoutChange ?? null, nutrition_change: plan.nutritionChange ?? null,
      message: reply, status: 'recommended', source: 'rule',
    }).select('id').maybeSingle()
    adjustmentId = (adj?.id as string) ?? null
  }
  await svc.from('fos_messages').insert({ enrollment_id: eid, user_id: user.id, role: 'operator', content: reply, adjustment_id: adjustmentId })

  return NextResponse.json({
    reply,
    adjustment: plan ? { id: adjustmentId, ...plan } : null,
  })
}
