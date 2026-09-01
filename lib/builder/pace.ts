import { createServiceClient } from '@/lib/supabase/server'
import { CHALLENGE_DAYS } from '@/lib/achievements'

// How far ahead/behind her REAL plan the garden should read, blended from
// two signals: how far through the 6-week program she is (time), and how
// far she actually is toward her stated weight goal (outcome) — outcome
// weighted higher since being ahead on the actual goal is what should be
// rewarded, not just elapsed time. Returns a scale factor applied to the
// phase-count thresholds in engine.ts: 1 = unscaled baseline (no intake
// data yet, or exactly on pace), down to 0.6 at maximum — this only ever
// makes later phases easier to reach sooner, never harder than baseline.
export async function getPaceScale(enrollmentId: string): Promise<number> {
  const svc = createServiceClient()
  const [{ data: enrollment }, { data: intakeRow }, { data: latestCheckin }] = await Promise.all([
    svc.from('challenge_enrollments').select('created_at').eq('id', enrollmentId).maybeSingle(),
    svc.from('challenge_intake').select('weight_lbs, target_lbs, goal, form_data').eq('enrollment_id', enrollmentId).maybeSingle(),
    svc.from('challenge_checkins').select('weight_lbs').eq('enrollment_id', enrollmentId).not('weight_lbs', 'is', null).order('submitted_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  const daysEnrolled = enrollment?.created_at
    ? Math.max(1, Math.floor((Date.now() - new Date(enrollment.created_at as string).getTime()) / 86400000) + 1)
    : 1
  const timeProgress = Math.min(daysEnrolled / CHALLENGE_DAYS, 1)

  // Same statsProvided gate used in app/plan/page.tsx and
  // app/plan/achievements/page.tsx — Quickstart writes a hardcoded fake
  // weight/goal (165lb, 10lb target) with no real form_data. Trusting that
  // here would silently corrupt goalProgress off numbers she never gave us.
  const statsProvided = !!(intakeRow?.form_data as Record<string, unknown> | null)?.required_tier_completed
  let goalProgress = 0
  if (statsProvided && intakeRow?.goal !== 'maintain') {
    const startWeight = Number(intakeRow?.weight_lbs) || 0
    const targetDelta = Number(intakeRow?.target_lbs) || 10
    const currentWeight = Number(latestCheckin?.weight_lbs) || startWeight
    if (targetDelta > 0) {
      goalProgress = Math.min(Math.abs(currentWeight - startWeight) / targetDelta, 1)
    }
  }

  const paceScore = timeProgress * 0.4 + goalProgress * 0.6
  return 1 - paceScore * 0.4
}
