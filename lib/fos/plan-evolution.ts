import { createServiceClient } from '@/lib/supabase/server'
import { addDaysISO, getTimezone, localDateISO } from '@/lib/localdate'

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
// Asa's call, 2026-08-27: 21 days isn't chosen for "habit formation" (that
// popular number isn't well-supported research) — it's reused here purely
// because it's already this system's bar for "a real sustained pattern, not
// one rough week," same reasoning as every other signal below. 4 taps in
// that window is the same bar track_mismatch already uses for "this has
// become her real default, not an occasional exception."
const KEEP_IT_SIMPLE_THRESHOLD = 4

export type StructuralSignal =
  | { kind: 'workout_days_mismatch'; plannedPerWeek: number; recommendedPerWeek: number }
  | { kind: 'track_mismatch'; plannedTrack: 'home' | 'gym'; recommendedTrack: 'home' | 'gym' }
  | { kind: 'eating_out_structural'; weeklyRate: number }
  // "Keep it simple" (the Next Action circle's disruption button) swapping
  // out a real assigned WORKOUT this often isn't a bad week — it's her
  // telling the app, over and over, that the workout itself is more than
  // she actually wants right now. Recommends BOTH fewer days and an easier
  // default session (Asa's explicit call — not either/or).
  | { kind: 'workout_frequent_simplify'; timesSimplified: number; plannedPerWeek: number; recommendedPerWeek: number }

export type StructuralAssessment = { hasRecommendation: boolean; signals: StructuralSignal[] }

export async function assessStructuralPattern(enrollmentId: string, todayISO: string): Promise<StructuralAssessment> {
  const svc = createServiceClient()
  const windowStart = addDaysISO(todayISO, -(STRUCTURAL_WINDOW_DAYS - 1))

  const [{ data: intake }, { data: workoutPlanRow }, { data: progressRows }, { data: adjustmentRows }, { data: foodRows }, { data: evolutionEvents }, { data: simplifyRows }] = await Promise.all([
    svc.from('challenge_intake').select('days_per_week').eq('enrollment_id', enrollmentId).maybeSingle(),
    svc.from('challenge_workout_plans').select('plan').eq('enrollment_id', enrollmentId).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_progress').select('logged_on').eq('enrollment_id', enrollmentId).eq('note', '__daily__').gte('logged_on', windowStart),
    svc.from('fos_adjustments').select('workout_change').eq('enrollment_id', enrollmentId).eq('status', 'approved').gte('for_date', windowStart),
    svc.from('challenge_food_log').select('logged_on, source').eq('enrollment_id', enrollmentId).gte('logged_on', windowStart),
    // No date floor here — unlike the decline cooldown (a temporary "not
    // now"), an approval's own reset-the-clock effect (see timesSimplified
    // below) must hold for as long as the historical rows it approved
    // against would otherwise still be in-window, not just 10 days.
    svc.from('fos_events').select('occurred_on, payload').eq('enrollment_id', enrollmentId).eq('payload->>source', 'plan_evolution')
      .order('occurred_on', { ascending: false }).limit(50),
    // "Keep it simple" / day-changed disruptions on a real workout action —
    // see the signal computation below for how this is narrowed to actual
    // same-day taps, not next-day auto-rollover.
    svc.from('next_action_log').select('shown_at, superseded_at').eq('enrollment_id', enrollmentId).eq('kind', 'workout')
      .not('superseded_at', 'is', null).gte('shown_at', `${windowStart}T00:00:00Z`),
  ])

  // "Not now" has to actually mean it — suppress only the specific signal
  // kinds she declined, so declining one finding doesn't hide an unrelated
  // one that comes up later. Cooldown-scoped (a "not now" fades), unlike
  // the approval lookup below.
  const cooldownFloor = addDaysISO(todayISO, -(DECLINE_COOLDOWN_DAYS - 1))
  const declinedKinds = new Set<string>()
  // The most recent approval per signal kind, any time in the past — used
  // to reset count-based signals (workout_frequent_simplify) so they only
  // ever count evidence from AFTER she last acted on this exact finding,
  // never the same rows that already got her a plan change.
  const lastApprovedAt = new Map<string, string>()
  for (const row of evolutionEvents || []) {
    const payload = row.payload as { declinedKinds?: string[]; approvedKinds?: string[]; approvedAt?: string } | null
    if ((row.occurred_on as string) >= cooldownFloor && Array.isArray(payload?.declinedKinds)) {
      for (const k of payload!.declinedKinds!) declinedKinds.add(k)
    }
    // A real ISO timestamp (payload.approvedAt), never the bare `occurred_on`
    // DATE column — a same-day comparison against just a date string can
    // never exclude a same-day timestamp, since the shorter string always
    // sorts first (real bug caught immediately after the first version of
    // this fix shipped, live-tested before it ever reached production).
    if (Array.isArray(payload?.approvedKinds) && payload?.approvedAt) {
      for (const k of payload.approvedKinds) {
        if (!lastApprovedAt.has(k)) lastApprovedAt.set(k, payload.approvedAt) // rows already sorted desc
      }
    }
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

  // "Keep it simple" repeatedly swapping out a real assigned workout — same
  // calendar day it was shown, so an intentional tap (the button, or a
  // free-text redirect like "I'm exhausted") never gets confused with the
  // ordinary next-day auto-supersede that fires whenever a stale, un-acted
  // instruction just rolls over to a new day (that always spans two
  // different calendar days, this never does). No new DB column needed —
  // shown_at/superseded_at landing on the same local day is exactly the
  // signal.
  const tz = getTimezone()
  // Real bug caught live, 2026-08-27: without this floor, approving this
  // exact signal re-fired it the very next page load off the SAME
  // already-acted-on rows — days/track mismatches self-resolve because
  // approving changes the plan values those signals compare against, but a
  // raw event count never resets on its own without this.
  const simplifyApprovedAt = lastApprovedAt.get('workout_frequent_simplify')
  const timesSimplified = (simplifyRows || []).filter((r) => {
    if (simplifyApprovedAt && (r.shown_at as string) <= simplifyApprovedAt) return false
    const shown = localDateISO(tz, new Date(r.shown_at as string))
    const superseded = localDateISO(tz, new Date(r.superseded_at as string))
    return shown === superseded
  }).length
  if (plannedPerWeek > 0 && timesSimplified >= KEEP_IT_SIMPLE_THRESHOLD) {
    const recommendedPerWeek = Math.max(2, plannedPerWeek - 1)
    signals.push({ kind: 'workout_frequent_simplify', timesSimplified, plannedPerWeek, recommendedPerWeek })
  }

  const activeSignals = signals.filter((s) => !declinedKinds.has(s.kind))
  return { hasRecommendation: activeSignals.length > 0, signals: activeSignals }
}

export function messageForStructural(a: StructuralAssessment): { title: string; body: string } | null {
  if (!a.hasRecommendation) return null
  // Both workout signals can independently fire from different real data
  // (raw completion rate vs. how often "Keep it simple" replaced the
  // workout) — each with its own recommendedPerWeek. Rather than state two
  // different day-counts in one sentence, the more specific, more directly-
  // actioned-by-her signal wins the copy; the days-per-week change itself
  // still applies from whichever signal is actually present.
  const hasSimplifySignal = a.signals.some((s) => s.kind === 'workout_frequent_simplify')
  const parts: string[] = []
  for (const s of a.signals) {
    if (s.kind === 'workout_days_mismatch' && !hasSimplifySignal) parts.push(`realistically training about ${s.recommendedPerWeek} days a week lately, not ${s.plannedPerWeek}`)
    if (s.kind === 'workout_frequent_simplify') parts.push(`choosing something simpler than your assigned workout ${s.timesSimplified} times these last 3 weeks`)
    if (s.kind === 'track_mismatch') parts.push(`mostly training ${s.recommendedTrack === 'home' ? 'at home' : 'at the gym'} instead of ${s.plannedTrack === 'home' ? 'at home' : 'at the gym'}`)
    if (s.kind === 'eating_out_structural') parts.push('eating out regularly now, not just once in a while')
  }
  return {
    title: "I've been paying attention 💛",
    body: `Over these last few weeks, I've noticed you're ${parts.join(' and ')} — and that's not you falling short, that's just what your real life looks like right now. Let's build the plan around the real you, not the version of you from week one. Same goal — I'll just walk it with you differently.`,
  }
}
