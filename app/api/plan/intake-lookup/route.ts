import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Real gap found+fixed: the optional-tier deep link (/plan/intake?tier=optional —
// the destination of /plan/today's "Fine-tune your plan" nudge, see app/plan/today/
// page.tsx's needsOptionalTier card) is a FRESH page load. The intake page's `f`
// state starts entirely empty on a fresh mount, and its one prefill effect
// (blueprint-lookup) explicitly skips itself when startInOptional — so a member who
// already completed the real required tier and is routed back here to "fine-tune"
// lands on a form with no memory of her own age/weight/goal/etc. Two real
// consequences, live-verified: (1) build()'s own `if (!f.age || !f.weight_lbs)`
// guard fires on submit with no age/weight fields anywhere in the optional tier's
// UI to satisfy it — a genuine dead end, "Update my plan" just shows an error
// forever; (2) even if that guard weren't there, submitting would overwrite her
// real stored age/sex/height/weight/goal/target/activity/location/focus/food
// answers with blanks/defaults, since buildInitialPlans does a full-row update,
// not a partial merge. This endpoint gives the client page what it needs to
// prefill `f` before she reaches the final "Update my plan" step, so an
// optional-tier submission only ever changes what she's actually asked here.
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ found: false })

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
  if (!enrollment) return NextResponse.json({ found: false })

  const { data: intake } = await svc
    .from('challenge_intake')
    .select('age, sex, height_in, weight_lbs, goal, target_lbs, activity_level, experience_level, training_location, days_per_week, weekly_food_budget, food_preferences, dislikes_allergies, form_data')
    .eq('enrollment_id', enrollment.id)
    .maybeSingle()
  if (!intake) return NextResponse.json({ found: false })

  const formData = (intake.form_data || {}) as Record<string, unknown>
  // Real gap found alongside the multi-select fix: training_style/goals/
  // training_styles all live in form_data, but this endpoint never surfaced
  // any of them — training_style silently reset to blank on every reopen,
  // same class of bug this whole endpoint exists to fix for age/weight/goal.
  return NextResponse.json({
    found: true,
    name: enrollment.name || '',
    intake: {
      ...intake,
      injuries: formData.injuries || [],
      focus_area: formData.focus_area || 'overall',
      training_style: formData.training_style || 'none',
      // Arrays are the real source of truth going forward (multi-select) —
      // fall back to wrapping the single legacy value for an intake row
      // saved before this existed, so a returning user's prior single
      // choice still shows as selected instead of reverting to nothing.
      goals: Array.isArray(formData.goals) ? formData.goals : [intake.goal].filter(Boolean),
      training_styles: Array.isArray(formData.training_styles) ? formData.training_styles : [formData.training_style].filter((v) => v && v !== 'none'),
      cook_days_per_week: formData.cook_days_per_week ?? 2,
      postpartum: !!formData.postpartum,
      other_info: formData.other_info || '',
    },
  })
}
