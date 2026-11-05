import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getMemberEnrollment } from '@/lib/member'

// "Start fresh" on Home (2026-11-05, Asa's Nutrition fix #7): clears her old
// data — food log, today's meal plan, what she picked before, workouts done,
// weigh-ins, streak, rewards — so the app is like day one again. Keeps her
// account, her intake answers and her plan (calories, meals, workouts).
const CLEAR = [
  'challenge_food_log', 'challenge_progress', 'challenge_checkins', 'next_action_log',
  'workout_set_logs', 'progression_state', 'reward_drops', 'meal_offers',
] as const
// Nutrition memory on her intake row; the answers themselves stay.
const FORM_KEYS = ['day_plan', 'meal_memory'] as const

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { confirm?: string }
  if (body.confirm !== 'start-fresh') return NextResponse.json({ error: 'Not confirmed.' }, { status: 400 })
  const { user, enrollment } = await getMemberEnrollment()
  if (!user || !enrollment) return NextResponse.json({ error: 'Not enrolled.' }, { status: 401 })
  const svc = createServiceClient()

  const failed: string[] = []
  for (const t of CLEAR) {
    const { error } = await svc.from(t).delete().eq('enrollment_id', enrollment.id)
    if (error) { console.error(`start-fresh ${t}:`, error.message); failed.push(t) }
  }
  const { data: intake } = await svc.from('challenge_intake').select('id, form_data').eq('enrollment_id', enrollment.id).maybeSingle()
  if (intake) {
    const fd = { ...((intake.form_data || {}) as Record<string, unknown>) }
    for (const k of FORM_KEYS) delete fd[k]
    const { error } = await svc.from('challenge_intake').update({ form_data: fd }).eq('id', intake.id)
    if (error) { console.error('start-fresh intake:', error.message); failed.push('challenge_intake') }
  }
  if (failed.length) return NextResponse.json({ error: 'Some of it did not clear. Try again.', failed }, { status: 500 })
  return NextResponse.json({ ok: true })
}
