import { createServiceClient } from '@/lib/supabase/server'
import { addDaysISO } from '@/lib/localdate'

// ============================================================
// Goal-alignment drift — a different axis from pattern.ts (acute, today) and
// plan-evolution.ts (behavior vs. plan structure, 21 days). This asks a
// longer-horizon OUTCOME question: with everything that's been accommodated
// along the way, is she still actually tracking toward her original goal? A
// real accommodation count with results still on pace is just normal life,
// not a problem — this only flags when BOTH real drift and real
// accommodation are present together. Never shown to her as a score; only
// ever fed as quiet context into Coach Asa's generated reply (see
// generateReply() in lib/fos/memory.ts) so it surfaces in conversation, if
// it fits, the way a person who actually knows her would bring it up.
// ============================================================

const DRIFT_WINDOW_DAYS = 21
const MIN_ACCOMMODATIONS = 4 // same "this is a real pattern" bar as plan-evolution.ts
const MIN_WEEKS_BEFORE_CHECKING = 3 // early weeks are noisy — don't false-positive on day one
const BEHIND_PACE_RATIO = 0.5 // actual progress under half of expected counts as real drift

// Mirrors lib/nutrition.ts's TIMELINE_LOSS/TIMELINE_GAIN display ranges (their
// midpoints, in lbs) — those are formatted for display ("~2-4 lbs"), this needs
// precise numbers to interpolate against, not strings to parse.
const EXPECTED_LBS_BY_WEEK: Record<'lose' | 'gain', { week: number; lbs: number }[]> = {
  lose: [{ week: 4, lbs: 3 }, { week: 8, lbs: 4 }, { week: 12, lbs: 6.5 }, { week: 26, lbs: 13 }],
  gain: [{ week: 4, lbs: 1.25 }, { week: 8, lbs: 1.75 }, { week: 12, lbs: 3 }, { week: 26, lbs: 6 }],
}

function expectedProgressLbs(goal: 'lose' | 'gain', weeksSinceStart: number): number {
  const points = [{ week: 0, lbs: 0 }, ...EXPECTED_LBS_BY_WEEK[goal]]
  if (weeksSinceStart <= 0) return 0
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1]
    if (weeksSinceStart <= b.week) {
      const frac = (weeksSinceStart - a.week) / (b.week - a.week)
      return a.lbs + frac * (b.lbs - a.lbs)
    }
  }
  // Past week 26 — extrapolate from the week12->week26 rate rather than flatlining.
  const last = points[points.length - 1]
  const prev = points[points.length - 2]
  const ratePerWeek = (last.lbs - prev.lbs) / (last.week - prev.week)
  return last.lbs + ratePerWeek * (weeksSinceStart - last.week)
}

export async function assessGoalDrift(enrollmentId: string, todayISO: string): Promise<{ note: string } | null> {
  const svc = createServiceClient()
  const windowStart = addDaysISO(todayISO, -(DRIFT_WINDOW_DAYS - 1))

  const [{ data: enrollment }, { data: intake }, { data: checkin }, { data: adjustmentRows }] = await Promise.all([
    svc.from('challenge_enrollments').select('started_at').eq('id', enrollmentId).maybeSingle(),
    svc.from('challenge_intake').select('weight_lbs, target_lbs, goal').eq('enrollment_id', enrollmentId).maybeSingle(),
    svc.from('challenge_checkins').select('weight_lbs, submitted_at').eq('enrollment_id', enrollmentId).not('weight_lbs', 'is', null)
      .order('submitted_at', { ascending: false }).limit(1).maybeSingle(),
    svc.from('fos_adjustments').select('workout_change, nutrition_change').eq('enrollment_id', enrollmentId).eq('status', 'approved').gte('for_date', windowStart),
  ])

  if (!enrollment?.started_at || !intake?.weight_lbs || !checkin?.weight_lbs) return null
  // 'maintain' has no shrinking-gap narrative — this feature only makes sense for lose/gain.
  if (intake.goal !== 'lose' && intake.goal !== 'gain') return null

  const weeksSinceStart = (Date.parse(todayISO) - Date.parse(enrollment.started_at as string)) / (7 * 86400000)
  if (weeksSinceStart < MIN_WEEKS_BEFORE_CHECKING) return null

  const startWeight = Number(intake.weight_lbs)
  const currentWeight = Number(checkin.weight_lbs)
  const actualProgress = intake.goal === 'lose' ? startWeight - currentWeight : currentWeight - startWeight
  const expected = expectedProgressLbs(intake.goal as 'lose' | 'gain', weeksSinceStart)
  if (expected <= 0) return null

  const accommodations = (adjustmentRows || []).filter((r) => r.workout_change || r.nutrition_change).length
  if (accommodations < MIN_ACCOMMODATIONS) return null
  if (actualProgress >= expected * BEHIND_PACE_RATIO) return null

  return {
    note: "Her real progress has been slower than her original pace lately, and she's had several plan accommodations recently — if it fits naturally, a gentle check-in about pace could help. No pressure, don't force it if nothing else fits this reply.",
  }
}
