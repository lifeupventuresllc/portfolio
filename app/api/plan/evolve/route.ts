import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { localDateISO } from '@/lib/localdate'
import { assessStructuralPattern, messageForStructural } from '@/lib/fos/plan-evolution'
import { generateWorkout, type TrainingStyle, type WorkoutProgram } from '@/lib/workout'
import type { Level, Injury } from '@/lib/workout-exercises'

async function resolve() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, enrollment: null, svc: null }
  const svc = createServiceClient()
  let { data: enrollment } = await svc.from('challenge_enrollments').select('id, name').eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc.from('challenge_enrollments').select('id, name').eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
    enrollment = byEmail || null
  }
  return { user, enrollment, svc }
}

export async function GET() {
  const { user, enrollment, svc } = await resolve()
  if (!user || !enrollment || !svc) return NextResponse.json({ hasRecommendation: false, signals: [], message: null })
  const assessment = await assessStructuralPattern(enrollment.id as string, localDateISO())
  return NextResponse.json({ ...assessment, message: messageForStructural(assessment) })
}

export async function POST(request: NextRequest) {
  const { user, enrollment, svc } = await resolve()
  if (!user || !enrollment || !svc) return NextResponse.json({ error: 'Not enrolled.' }, { status: 401 })
  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const eid = enrollment.id as string
  const today = localDateISO()

  if (body.status === 'rejected') {
    // Record exactly which findings she's declining so the cooldown in
    // assessStructuralPattern suppresses only those, not every future
    // recommendation — "not now" on one shouldn't hide an unrelated one later.
    const declined = await assessStructuralPattern(eid, today)
    await svc.from('fos_events').insert({
      enrollment_id: eid, user_id: user.id, occurred_on: today, kind: 'adjustment', summary: 'Plan evolution declined',
      payload: { source: 'plan_evolution', declinedKinds: declined.signals.map((s) => s.kind) },
    })
    return NextResponse.json({ reply: "No problem — we'll keep things as they are. You can always tell me if that changes." })
  }
  // This endpoint rewrites her real stored plan — only an explicit approval
  // should ever reach the mutation path below, never a malformed/empty body.
  if (body.status !== 'approved') return NextResponse.json({ error: 'Missing status.' }, { status: 400 })

  // Re-run fresh rather than trusting a stale client-held assessment — the
  // plan she approves should reflect her pattern right now, not whenever
  // the card first loaded.
  const assessment = await assessStructuralPattern(eid, today)
  if (!assessment.hasRecommendation) return NextResponse.json({ reply: 'Looks like your plan already matches your real pattern — nothing to change.' })

  const { data: intake } = await svc.from('challenge_intake').select('*').eq('enrollment_id', eid).maybeSingle()
  const { data: workoutPlanRow } = await svc.from('challenge_workout_plans').select('plan').eq('enrollment_id', eid).eq('week_number', 1).maybeSingle()

  let daysPerWeek = Number(intake?.days_per_week) || 4
  let track = (((workoutPlanRow?.plan as WorkoutProgram | null)?.track) || 'home') as 'home' | 'gym'
  let workoutChanged = false
  const daysMismatch = assessment.signals.find((s) => s.kind === 'workout_days_mismatch')
  const trackMismatch = assessment.signals.find((s) => s.kind === 'track_mismatch')
  if (daysMismatch) { daysPerWeek = daysMismatch.recommendedPerWeek; workoutChanged = true }
  if (trackMismatch) { track = trackMismatch.recommendedTrack; workoutChanged = true }

  // Only report a change as real once the mutation below actually runs —
  // without an intake row, generateWorkout() has nothing safe to build
  // from, so nothing is written and nothing should be claimed either.
  const changes: string[] = []
  if (workoutChanged && intake) {
    const level = (intake.experience_level === 'advanced' ? 3 : intake.experience_level === 'intermediate' ? 2 : 1) as Level
    const goal = (intake.goal === 'gain' || intake.goal === 'maintain' ? intake.goal : 'lose') as 'lose' | 'gain' | 'maintain'
    const sex = (intake.sex === 'male' ? 'male' : intake.sex === 'other' ? 'other' : 'female') as 'male' | 'female' | 'other'
    const injuries = (Array.isArray((intake.form_data as { injuries?: Injury[] } | null)?.injuries) ? (intake.form_data as { injuries?: Injury[] }).injuries! : []) as Injury[]
    const postpartum = !!(intake.form_data as { postpartum?: boolean } | null)?.postpartum
    const trainingStyle = ((intake.form_data as { training_style?: TrainingStyle } | null)?.training_style || 'none') as TrainingStyle
    const newProgram = generateWorkout({
      name: (enrollment.name as string) || 'Your', sex, track, level, goal,
      daysPerWeek, weekNumber: 1, injuries, postpartum, trainingStyle,
    })
    await svc.from('challenge_workout_plans').update({ plan: newProgram }).eq('enrollment_id', eid).eq('week_number', 1)
    await svc.from('challenge_intake').update({ days_per_week: daysPerWeek }).eq('enrollment_id', eid)
    if (daysMismatch) changes.push(`training days → ${daysMismatch.recommendedPerWeek}/week`)
    if (trackMismatch) changes.push(`track → ${trackMismatch.recommendedTrack}`)
  }

  // Nutrition targets are derived from a full Calorie Blueprint calculation
  // (BMR/TDEE/macro math), not a simple number to nudge — recalibrating that
  // safely needs the same rigor as the original calculation, not a quick
  // patch here. Recommend the real fix (rebuild via the existing meal
  // builder, which already supports picking eat-out days) instead of
  // silently touching numbers that materially affect her fat-loss rate.
  const eatOutSignal = assessment.signals.find((s) => s.kind === 'eating_out_structural')

  await svc.from('fos_events').insert({
    enrollment_id: eid, user_id: user.id, occurred_on: today, kind: 'adjustment',
    summary: `Plan evolved: ${changes.join(', ') || 'no workout change'}${eatOutSignal ? ', flagged nutrition for rebuild' : ''}`,
  })

  const workoutPart = changes.length ? `Updated your workout — ${changes.join(', ')}.` : null
  const nutritionPart = eatOutSignal
    ? "Eating out has become regular enough that your meal plan should reflect it — head to your meals page and rebuild it with more eat-out days built in, and I'll keep your targets accurate either way."
    : null
  const reply = [workoutPart, nutritionPart].filter(Boolean).join(' ')
    || (workoutChanged && !intake ? "I found the pattern, but couldn't update your plan yet — finish your profile first and I'll pick this back up." : 'Updated. Same goal, a path that actually fits your real life now. 💛')

  return NextResponse.json({ reply, changes, flaggedNutrition: !!eatOutSignal })
}
