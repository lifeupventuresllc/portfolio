import { createServiceClient } from '@/lib/supabase/server'
import { addDaysISO } from '@/lib/localdate'

// ============================================================
// Layer 1 Phase 5 — plan evolution. lib/fos/pattern.ts catches ACUTE dips
// and offers a TEMPORARY smaller ask for today; this is the longer-horizon
// counterpart. When a real pattern holds for weeks, not days, it's not a
// today problem anymore — it's evidence her actual life doesn't match the
// plan she started with. This never rewrites anything silently: it
// recommends a permanent change she approves, same "recommend, never
// control" principle as every other adjustment (see FOS_PRINCIPLES in
// lib/fos/types.ts). The goal never changes — only the path does.
// ============================================================

const STRUCTURAL_WINDOW_DAYS = 21
const MIN_ACTIVE_DAYS = 6 // enough real data across 3 weeks to trust the read, not a brand-new user
const DECLINE_COOLDOWN_DAYS = 10 // a real 21-day pattern doesn't vanish overnight — "not now" must mean it, not just "ask me again tomorrow"

export type StructuralSignal =
  | { kind: 'workout_days_mismatch'; plannedPerWeek: number; recommendedPerWeek: number }
  | { kind: 'track_mismatch'; plannedTrack: 'home' | 'gym'; recommendedTrack: 'home' | 'gym' }
  | { kind: 'eating_out_structural'; weeklyRate: number }

export type StructuralAssessment = { hasRecommendation: boolean; signals: StructuralSignal[] }

export async function assessStructuralPattern(enrollmentId: string, todayISO: string): Promise<StructuralAssessment> {
  const svc = createServiceClient()
  const windowStart = addDaysISO(todayISO, -(STRUCTURAL_WINDOW_DAYS - 1))

  const [{ data: intake }, { data: workoutPlanRow }, { data: progressRows }, { data: adjustmentRows }, { data: foodRows }, { data: declineRows }] = await Promise.all([
    svc.from('challenge_intake').select('days_per_week').eq('enrollment_id', enrollmentId).maybeSingle(),
    svc.from('challenge_workout_plans').select('plan').eq('enrollment_id', enrollmentId).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_progress').select('logged_on').eq('enrollment_id', enrollmentId).eq('note', '__daily__').gte('logged_on', windowStart),
    svc.from('fos_adjustments').select('workout_change').eq('enrollment_id', enrollmentId).eq('status', 'approved').gte('for_date', windowStart),
    svc.from('challenge_food_log').select('logged_on, source').eq('enrollment_id', enrollmentId).gte('logged_on', windowStart),
    svc.from('fos_events').select('payload').eq('enrollment_id', enrollmentId).eq('payload->>source', 'plan_evolution')
      .gte('occurred_on', addDaysISO(todayISO, -(DECLINE_COOLDOWN_DAYS - 1))),
  ])

  // "Not now" has to actually mean it — suppress only the specific signal
  // kinds she declined, so declining one finding doesn't hide an unrelated
  // one that comes up later.
  const declinedKinds = new Set<string>()
  for (const row of declineRows || []) {
    const kinds = (row.payload as { declinedKinds?: string[] } | null)?.declinedKinds
    if (Array.isArray(kinds)) for (const k of kinds) declinedKinds.add(k)
  }

  const signals: StructuralSignal[] = []
  const weeks = STRUCTURAL_WINDOW_DAYS / 7
  const plannedPerWeek = Number(intake?.days_per_week) || 0
  const plannedTrack = (((workoutPlanRow?.plan as { track?: 'home' | 'gym' } | null)?.track) || 'home') as 'home' | 'gym'

  // Sustained under-completion — not one bad week, a real mismatch between
  // the plan and what she actually does most weeks. The "enough data to
  // trust" floor scales with her plan (never below MIN_ACTIVE_DAYS) — a
  // fixed floor alone would make this mathematically unreachable for
  // anyone planning 2-3 days/week, since even at the floor their observed
  // rate could never read as low enough relative to a small plannedPerWeek.
  const activeDays = new Set((progressRows || []).map((r) => r.logged_on as string)).size
  const minActiveDaysForPlan = Math.min(MIN_ACTIVE_DAYS, plannedPerWeek)
  if (plannedPerWeek > 0 && activeDays >= minActiveDaysForPlan) {
    const actualPerWeek = activeDays / weeks
    if (actualPerWeek <= plannedPerWeek * 0.6) {
      const recommendedPerWeek = Math.max(2, Math.round(actualPerWeek))
      if (recommendedPerWeek < plannedPerWeek) signals.push({ kind: 'workout_days_mismatch', plannedPerWeek, recommendedPerWeek })
    }
  }

  // She's been consistently overriding to a different track than the one
  // her stored plan is built for — the override has become her real default.
  const trackCounts: Record<'home' | 'gym', number> = { home: 0, gym: 0 }
  for (const row of adjustmentRows || []) {
    const t = (row.workout_change as { trackOverride?: 'home' | 'gym' } | null)?.trackOverride
    if (t) trackCounts[t]++
  }
  const totalOverrides = trackCounts.home + trackCounts.gym
  if (totalOverrides >= 4) {
    const majorityTrack: 'home' | 'gym' = trackCounts.home > trackCounts.gym ? 'home' : 'gym'
    const majorityShare = Math.max(trackCounts.home, trackCounts.gym) / totalOverrides
    if (majorityTrack !== plannedTrack && majorityShare >= 0.7) signals.push({ kind: 'track_mismatch', plannedTrack, recommendedTrack: majorityTrack })
  }

  // A sustained eating-out rate over 3 weeks, not the acute 5-day spike
  // lib/fos/pattern.ts already watches for — this is evidence it's become
  // her real normal, not a rough patch.
  const eatOutDays = new Set((foodRows || []).filter((r) => r.source === 'escape_plan').map((r) => r.logged_on as string)).size
  const weeklyRate = eatOutDays / weeks
  if (weeklyRate >= 4) signals.push({ kind: 'eating_out_structural', weeklyRate: Math.round(weeklyRate * 10) / 10 })

  const activeSignals = signals.filter((s) => !declinedKinds.has(s.kind))
  return { hasRecommendation: activeSignals.length > 0, signals: activeSignals }
}

export function messageForStructural(a: StructuralAssessment): { title: string; body: string } | null {
  if (!a.hasRecommendation) return null
  const parts: string[] = []
  for (const s of a.signals) {
    if (s.kind === 'workout_days_mismatch') parts.push(`realistically training about ${s.recommendedPerWeek} days a week lately, not ${s.plannedPerWeek}`)
    if (s.kind === 'track_mismatch') parts.push(`mostly training ${s.recommendedTrack === 'home' ? 'at home' : 'at the gym'} instead of ${s.plannedTrack === 'home' ? 'at home' : 'at the gym'}`)
    if (s.kind === 'eating_out_structural') parts.push('eating out regularly now, not just once in a while')
  }
  return {
    title: 'Your real pattern, not your starting guess 💛',
    body: `Looking at the last few weeks, you've been ${parts.join(' and ')}. That's not failing the plan — the plan just doesn't match your real life anymore. Want me to update it around what's actually true? Same goal, a path that actually fits.`,
  }
}
