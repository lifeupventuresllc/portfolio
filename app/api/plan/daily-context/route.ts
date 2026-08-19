import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { localDateISO } from '@/lib/localdate'
import { planForDailyContext, injurySafetyClause, type DailyContext } from '@/lib/fos/recovery'
import type { FosEventKind } from '@/lib/fos/types'
import type { Injury } from '@/lib/workout-exercises'

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
  let plan = planForDailyContext(ctx)
  const summary = `Daily check-in: feeling ${feeling}, ${time} time, at ${where}, goal ${goal}`

  // Injury-safe confirmation — same requirement as app/api/plan/operator/route.ts:
  // every time this check-in surfaces a workout, and she has recorded injuries,
  // say so in plain language. The real filtering already happened wherever the
  // stored plan's exercises were generated; this route only ever adjusts
  // duration/track on that already-safe plan, never invents new exercises.
  if (plan.workoutChange) {
    const { data: intake } = await svc.from('challenge_intake').select('form_data').eq('enrollment_id', eid).maybeSingle()
    const recordedInjuries = (Array.isArray((intake?.form_data as Record<string, unknown> | null)?.injuries)
      ? (intake!.form_data as { injuries: Injury[] }).injuries : []) as Injury[]
    const clause = injurySafetyClause(recordedInjuries)
    if (clause) plan = { ...plan, message: plan.message + clause }
  }

  await svc.from('fos_messages').insert({ enrollment_id: eid, user_id: user.id, role: 'user', content: summary })

  const feelingKind: FosEventKind = feeling === 'tired' ? 'low_energy' : feeling === 'stressed' ? 'stressed' : 'message'
  await svc.from('fos_events').insert({ enrollment_id: eid, user_id: user.id, occurred_on: today, kind: feelingKind, summary, payload: { ctx } })
  // `where` and `feeling` are independent DailyContext answers (see the type above) — she
  // can be both stressed AND traveling on the same check-in, which is a common real
  // combination, not an edge case. The old single `eventKind` ternary treated 'traveling'
  // as taking priority over the whole row, so that combination wrote only kind='travel'
  // and the stressed/low_energy row never happened at all — lib/fos/pattern.ts's
  // STRESS_EVENT_KINDS scan (which needs 2+ distinct days to fire `recent_stress`) could
  // never see a day like that, no matter how many times she reported it. Same "one kind
  // clobbers another" gap app/api/plan/operator/route.ts hit for travel+signal combos
  // (see its comment, fixed 2026-08-19) — fixed here the same way: travel gets its own
  // row instead of overriding the feeling row. Found + fixed 2026-08-19.
  if (where === 'traveling') {
    await svc.from('fos_events').insert({ enrollment_id: eid, user_id: user.id, occurred_on: today, kind: 'travel', summary, payload: { ctx } })
  }

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
