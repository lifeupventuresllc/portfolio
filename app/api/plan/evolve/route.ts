import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { localDateISO } from '@/lib/localdate'
import { assessStructuralPattern, messageForStructural } from '@/lib/fos/plan-evolution'
import { generateWorkout, type TrainingStyle, type WorkoutProgram, type FocusArea, type WorkoutInputs } from '@/lib/workout'
import type { Level, Injury } from '@/lib/workout-exercises'
import { parseStoredGoal } from '@/lib/goals'

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
  let reduceIntensity = false
  const daysMismatch = assessment.signals.find((s) => s.kind === 'workout_days_mismatch')
  const trackMismatch = assessment.signals.find((s) => s.kind === 'track_mismatch')
  // Repeatedly choosing "Keep it simple" over her real assigned workout —
  // Asa's explicit call, 2026-08-27: reduce BOTH the days and the intensity,
  // not either/or. Takes precedence over the raw-completion-rate days
  // number when both fire (same precedence messageForStructural already
  // uses for the copy), since it's the more directly-actioned-by-her signal.
  const simplifyMismatch = assessment.signals.find((s) => s.kind === 'workout_frequent_simplify')
  if (daysMismatch) { daysPerWeek = daysMismatch.recommendedPerWeek; workoutChanged = true }
  if (simplifyMismatch) { daysPerWeek = simplifyMismatch.recommendedPerWeek; workoutChanged = true; reduceIntensity = true }
  if (trackMismatch) { track = trackMismatch.recommendedTrack; workoutChanged = true }

  // Only report a change as real once the mutation below actually runs —
  // without an intake row, generateWorkout() has nothing safe to build
  // from, so nothing is written and nothing should be claimed either.
  const changes: string[] = []
  if (workoutChanged && intake) {
    let level = (intake.experience_level === 'advanced' ? 3 : intake.experience_level === 'intermediate' ? 2 : 1) as Level
    let intensityChanged = false
    if (reduceIntensity && level > 1) { level = (level - 1) as Level; intensityChanged = true }
    const experienceLevel = level === 3 ? 'advanced' : level === 2 ? 'intermediate' : 'beginner'
    // Real bug found live, 2026-09-03: same narrow-cast bug as
    // app/plan/workout/page.tsx — plan evolution rebuilds her real workout,
    // so it needs her real goal, not a silently downgraded one.
    const goal = parseStoredGoal(intake.goal as string | null)
    const sex = (intake.sex === 'male' ? 'male' : intake.sex === 'other' ? 'other' : 'female') as 'male' | 'female' | 'other'
    const injuries = (Array.isArray((intake.form_data as { injuries?: Injury[] } | null)?.injuries) ? (intake.form_data as { injuries?: Injury[] }).injuries! : []) as Injury[]
    const postpartum = !!(intake.form_data as { postpartum?: boolean } | null)?.postpartum
    const trainingStyle = ((intake.form_data as { training_style?: TrainingStyle } | null)?.training_style || 'none') as TrainingStyle
    const focusArea = ((intake.form_data as { focus_area?: FocusArea } | null)?.focus_area || 'overall') as FocusArea
    const newProgram = generateWorkout({
      name: (enrollment.name as string) || 'Your', sex, track, level, goal,
      daysPerWeek, weekNumber: 1, injuries, postpartum, trainingStyle, focusArea,
      activityLevel: intake.activity_level as WorkoutInputs['activityLevel'],
    })
    await svc.from('challenge_workout_plans').update({ plan: newProgram }).eq('enrollment_id', eid).eq('week_number', 1)
    // experience_level persists too (not just days_per_week) — a reduced
    // intensity should hold for future weeks' regenerations, not just this
    // one, same reasoning as why days_per_week is written back below.
    await svc.from('challenge_intake').update({ days_per_week: daysPerWeek, ...(intensityChanged ? { experience_level: experienceLevel } : {}) }).eq('enrollment_id', eid)
    if (simplifyMismatch) changes.push(`training days → ${simplifyMismatch.recommendedPerWeek}/week`)
    else if (daysMismatch) changes.push(`training days → ${daysMismatch.recommendedPerWeek}/week`)
    if (intensityChanged) changes.push('lighter default intensity')
    if (trackMismatch) changes.push(`track → ${trackMismatch.recommendedTrack}`)
  }

  // Nutrition targets are derived from a full Calorie Blueprint calculation
  // (BMR/TDEE/macro math), not a simple number to nudge — recalibrating that
  // safely needs the same rigor as the original calculation, not a quick
  // patch here. Recommend the real fix (rebuild via the existing meal
  // builder, which already supports picking eat-out days) instead of
  // silently touching numbers that materially affect her fat-loss rate.
  const eatOutSignal = assessment.signals.find((s) => s.kind === 'eating_out_structural')

  // Real bug caught live, 2026-08-27: approving used to write no
  // `plan_evolution` marker at all, only the decline path did — so a
  // count-based signal like workout_frequent_simplify kept re-firing off
  // the EXACT SAME already-acted-on historical rows the very next time she
  // opened the page, even though she'd just approved the change. The
  // days/track mismatches happened to self-resolve (approving changes the
  // stored plan those signals compare against), but a raw event-count
  // never resets on its own. `approvedKinds` lets assessStructuralPattern
  // only count next_action_log rows shown AFTER this exact moment for
  // those specific kinds — same "resolved, don't ask again for the same
  // evidence" idea the decline path already has, just for approval too.
  await svc.from('fos_events').insert({
    enrollment_id: eid, user_id: user.id, occurred_on: today, kind: 'adjustment',
    summary: `Plan evolved: ${changes.join(', ') || 'no workout change'}${eatOutSignal ? ', flagged nutrition for rebuild' : ''}`,
    // A precise timestamp, not just `occurred_on` (a DATE column) — real bug
    // caught immediately after writing the first version of this fix: a
    // same-day comparison against a bare date string like "2026-08-27"
    // never excludes a same-day ISO timestamp like "2026-08-27T16:51:...Z",
    // since the shorter date string always sorts first. Approving something
    // that happened minutes ago needs minute-level precision, not day-level.
    payload: { source: 'plan_evolution', approvedKinds: assessment.signals.map((s) => s.kind), approvedAt: new Date().toISOString() },
  })

  const workoutPart = changes.length ? `Updated your workout — ${changes.join(', ')}.` : null
  const nutritionPart = eatOutSignal
    ? "Eating out has become regular enough that your meal plan should reflect it — head to your meals page and rebuild it with more eat-out days built in, and I'll keep your targets accurate either way."
    : null
  const reply = [workoutPart, nutritionPart].filter(Boolean).join(' ')
    || (workoutChanged && !intake ? "I found the pattern, but couldn't update your plan yet — finish your profile first and I'll pick this back up." : 'Updated. Same goal, a path that actually fits your real life now. 💛')

  return NextResponse.json({ reply, changes, flaggedNutrition: !!eatOutSignal })
}
