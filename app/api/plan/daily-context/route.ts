import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { localDateISO } from '@/lib/localdate'
import { planForDailyContext, type DailyContext } from '@/lib/fos/recovery'
import type { FosEventKind } from '@/lib/fos/types'

// The proactive daily check-in (feeling/time/location/goal) plans directly from
// structured answers via planForDailyContext — NOT via the free-text /api/plan/operator
// message parser, which can't reliably carry "swap to a home workout" through a
// synthesized sentence. Same persistence shape (fos_messages/fos_events/fos_adjustments)
// so it renders through the exact same pending-adjustment UI in CoachHero.

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

export async function POST(request: NextRequest) {
  const { user, enrollment, svc } = await resolve()
  if (!user || !enrollment || !svc) return NextResponse.json({ error: 'Not enrolled.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const { feeling, time, where, goal } = (body || {}) as Partial<DailyContext>
  if (!feeling || !time || !where || !goal) return NextResponse.json({ error: 'Missing answers.' }, { status: 400 })

  const today = localDateISO()
  const eid = enrollment.id as string
  const ctx = { feeling, time, where, goal } as DailyContext
  const plan = planForDailyContext(ctx)
  const summary = `Daily check-in: feeling ${feeling}, ${time} time, at ${where}, goal ${goal}`

  await svc.from('fos_messages').insert({ enrollment_id: eid, user_id: user.id, role: 'user', content: summary })

  const eventKind: FosEventKind = where === 'traveling' ? 'travel' : feeling === 'tired' ? 'low_energy' : feeling === 'stressed' ? 'stressed' : 'message'
  await svc.from('fos_events').insert({ enrollment_id: eid, user_id: user.id, occurred_on: today, kind: eventKind, summary, payload: { ctx } })

  let adjustmentId: string | null = null
  if (plan.workoutChange || plan.nutritionChange) {
    const { data: adj } = await svc.from('fos_adjustments').insert({
      enrollment_id: eid, user_id: user.id, for_date: today, trigger: summary,
      workout_change: plan.workoutChange ?? null, nutrition_change: plan.nutritionChange ?? null,
      message: plan.message, status: 'recommended', source: 'rule',
    }).select('id').maybeSingle()
    adjustmentId = (adj?.id as string) ?? null
  }
  await svc.from('fos_messages').insert({ enrollment_id: eid, user_id: user.id, role: 'operator', content: plan.message, adjustment_id: adjustmentId })

  return NextResponse.json({
    reply: plan.message,
    adjustment: (plan.workoutChange || plan.nutritionChange) ? { id: adjustmentId, ...plan } : null,
  })
}
