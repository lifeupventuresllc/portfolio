import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { buildInitialPlans } from '@/lib/plan-builder'

// Real gap found live, 2026-09-21 (new-visitor test): a stranger's first
// workout comes from the hardcoded Quickstart (goal 'lose'). During a rest
// step the player asks ONE tap — main goal — and this saves it so tomorrow's
// workout is theirs. Only ever touches the signed-in user's own quickstart-
// built intake; stored in the same format lib/goals.ts reads back.
const GOAL_MAP: Record<string, 'lose' | 'recomp' | 'gain'> = { 'Lose fat': 'lose', 'Build & tone': 'recomp', 'Gain muscle': 'gain' }

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  let body: { goal?: string; skip?: boolean }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Bad request.' }, { status: 400 }) }
  const goal = body.skip ? undefined : GOAL_MAP[body.goal || '']
  if (!body.skip && !goal) return NextResponse.json({ error: 'Bad goal.' }, { status: 400 })

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

  const { data: intake } = await svc
    .from('challenge_intake').select('id, form_data, training_location')
    .eq('enrollment_id', enrollment.id).maybeSingle()
  const fd = (intake?.form_data || {}) as Record<string, unknown>
  // Only a quickstart-built, still-unanswered plan may be rewritten — never a
  // real intake (which would overwrite her real stats with the placeholders).
  if (!intake || !fd.quickstart_built) return NextResponse.json({ error: 'Not a quickstart plan.' }, { status: 409 })
  if (fd.quickstart_goal_answered) return NextResponse.json({ ok: true })

  // Real gap found live, 2026-09-21 (item 3b live test): "Skip for now" only
  // ever wrote a sessionStorage flag, scoped to the browser TAB, not the
  // account — so a brand-new guest on the same device/tab never saw the
  // strip at all (it inherited the previous guest's skip), while a real
  // account that actually skipped saw it again every new session. A skip is
  // a real, permanent choice for THIS account (just "no goal picked"), so it
  // gets the exact same server marker a real pick gets — no plan rebuild,
  // since no goal was chosen; her placeholder plan stays as-is.
  if (body.skip) {
    await svc.from('challenge_intake')
      .update({ form_data: { ...fd, quickstart_goal_answered: true } })
      .eq('id', intake.id)
    return NextResponse.json({ ok: true })
  }
  if (!goal) return NextResponse.json({ error: 'Bad goal.' }, { status: 400 }) // unreachable (checked above) — narrows the type for TS below

  await buildInitialPlans({
    enrollmentId: enrollment.id as string,
    userId: user.id,
    name: (enrollment.name as string) || 'Your',
    age: 30,
    sex: 'female',
    height_in: 64,
    weight_lbs: 165,
    goal,
    target_lbs: 10,
    activity_level: 'moderate',
    experience_level: 'beginner',
    training_location: intake.training_location === 'home' ? 'home' : 'gym',
    days_per_week: 3,
    workout_days_per_week: 3,
    cook_days_per_week: 2,
    injuries: [],
    postpartum: false,
    training_style: 'none',
    focus_area: 'overall',
    autoFillMeals: true,
  })

  // buildInitialPlans rewrites form_data, so re-add the markers after it.
  const { data: fresh } = await svc.from('challenge_intake').select('id, form_data').eq('enrollment_id', enrollment.id).maybeSingle()
  if (fresh) {
    await svc.from('challenge_intake')
      .update({ form_data: { ...((fresh.form_data as Record<string, unknown>) || {}), quickstart_built: true, quickstart_goal_answered: true } })
      .eq('id', fresh.id)
  }
  return NextResponse.json({ ok: true })
}
