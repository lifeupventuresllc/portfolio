import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { buildInitialPlans } from '@/lib/plan-builder'
import { getOpenAction, markActionSuperseded } from '@/lib/next-action'

// The "Sculpt Sessions" fast lane — she picks home or gym, nothing else, and gets
// a real beginner-friendly full-body workout immediately. No injury/focus question
// (unlike Coach Asa's chat build) — this is the zero-friction entry point Asa asked
// for specifically for this card; Coach Asa's chat remains the place for anything
// more tailored.
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  let body: { location?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Bad request.' }, { status: 400 }) }
  const training_location: 'home' | 'gym' = body.location === 'home' ? 'home' : 'gym'

  const svc = createServiceClient()
  let { data: enrollment } = await svc
    .from('challenge_enrollments').select('id, name')
    .eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc
      .from('challenge_enrollments').select('id, name')
      .eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
    enrollment = byEmail || null
  }
  if (!enrollment) return NextResponse.json({ error: 'No enrollment found.' }, { status: 404 })

  await buildInitialPlans({
    enrollmentId: enrollment.id as string,
    userId: user.id,
    name: (enrollment.name as string) || 'Your',
    age: 30,
    sex: 'female',
    height_in: 64,
    weight_lbs: 165,
    goal: 'lose',
    target_lbs: 10,
    activity_level: 'moderate',
    experience_level: 'beginner',
    training_location,
    days_per_week: 3,
    workout_days_per_week: 3,
    cook_days_per_week: 2,
    injuries: [],
    postpartum: false,
    training_style: 'none',
    focus_area: 'overall',
    autoFillMeals: true,
  })

  // Real gap found live, 2026-09-21 (new-visitor test: the first workout has
  // to be able to ask ONE goal question during a rest, but only for a plan
  // that came from this hardcoded Quickstart). buildInitialPlans rewrites
  // form_data wholesale, so the marker is merged in AFTER it. A later real
  // intake rewrites form_data again and clears it on its own.
  const { data: row } = await svc.from('challenge_intake').select('id, form_data').eq('enrollment_id', enrollment.id).maybeSingle()
  if (row) {
    await svc.from('challenge_intake')
      .update({ form_data: { ...((row.form_data as Record<string, unknown>) || {}), quickstart_built: true } })
      .eq('id', row.id)
  }

  // Real gap found live, 2026-09-21 (item 3b live test): a guest who'd done
  // this flow once lost their one-tap way back to the workout — Home's Next
  // Step kept showing a generic "glass of water" instead of her real
  // workout, even though hasPlan/intake were both genuinely set above.
  // Root cause traced to a layer this file doesn't own: NextActionCard's
  // useLiveRefresh(load) fires an unconditional GET /api/plan/next-action on
  // mount even while it's showing FirstWorkoutStartCard instead (before she's
  // ever tapped Start here) — with no intake/plan yet, that request has
  // nothing real to work with and permanently PERSISTS a generic fallback
  // (next_action_log, kind 'fallback') for today. lib/next-action/index.ts's
  // resolveCurrentAction only re-validates a same-day open row's staleness
  // for kind 'workout'/'meal' (an approved adjustment, a new food log row) —
  // 'fallback' rows aren't covered, so that pre-Quickstart row survives
  // frozen for the rest of the day even after a real plan now exists right
  // here. (lib/next-action/state.ts and candidates.ts were checked and are
  // already correct — a real intake row like the one just written above
  // already makes workoutCandidate self-heal and outscore the fallback tier
  // comfortably; the stale row above just never lets that call happen
  // again today.) Closing out any such open row the instant a real plan
  // exists — using the same markActionSuperseded the engine already applies
  // to every other same-day staleness case — makes her very next Home visit
  // build a fresh recommendation that actually sees this new plan. Only
  // runs on this Quickstart path, so it can't affect anyone who never
  // touched Quickstart or a fully real intake's own next-action rows.
  const openAction = await getOpenAction(enrollment.id as string)
  if (openAction) await markActionSuperseded(openAction.id, enrollment.id as string)

  return NextResponse.json({ ok: true })
}
