import { createServiceClient } from '@/lib/supabase/server'
import { addDaysISO } from '@/lib/localdate'

// ============================================================
// Fast, first-week struggle detection — the other half of the replan engine
// (see lib/fos/replan.ts). assessLifePattern (lib/fos/pattern.ts) is built,
// on purpose, to ignore someone who's never had a real streak: "someone
// who's never been consistent isn't dipping, she just hasn't built the
// habit yet." That's the right call for its own job, but it means the
// slower engine structurally CANNOT fire for a brand-new account — its
// signals need 7-21 real days of history to even compute. Per the
// successful-app checklist, most people who ever leave do it inside the
// first week, before that history can exist. A real trainer doesn't wait
// for a pattern to notice a client is struggling on day one; this is that
// same fast read, scoped ONLY to a genuinely new account, firing on the
// FIRST real sign of trouble instead of waiting for it to repeat.
// ============================================================

export type EarlyStruggleReason = 'skipped_first_workout' | 'no_early_completion' | 'early_hard_effort'
export type EarlyStruggleAssessment = { struggling: boolean; reason: EarlyStruggleReason | null }

// How long an account counts as "new" for this fast path — roughly her
// first week plus a couple of days' buffer for timezone/late-start
// enrollments, never so long this overlaps with assessLifePattern's own
// 21-28 day baseline windows.
const NEW_ACCOUNT_MAX_AGE_DAYS = 9
// Two, not one: a single hard set is normal and already self-corrects via
// lib/progression.ts's own rest-bump/intensity-drop — this is about a
// clearly rough START, not one tough rep.
const EARLY_HARD_EFFORT_MIN_COUNT = 2

export async function assessEarlyStruggle(enrollmentId: string, todayISO: string): Promise<EarlyStruggleAssessment> {
  const svc = createServiceClient()
  const { data: enrollment } = await svc.from('challenge_enrollments').select('created_at').eq('id', enrollmentId).maybeSingle()
  const createdAt = enrollment?.created_at as string | undefined
  if (!createdAt) return { struggling: false, reason: null }

  const ageDays = (new Date(todayISO).getTime() - new Date(createdAt).getTime()) / 86400000
  if (ageDays < 0 || ageDays > NEW_ACCOUNT_MAX_AGE_DAYS) return { struggling: false, reason: null }

  const enrolledOnISO = createdAt.slice(0, 10)

  // Signal 1: her very first real workout day was skipped outright — the
  // clearest possible "this didn't work for her" signal there is.
  const { data: skipped } = await svc.from('next_action_log').select('id')
    .eq('enrollment_id', enrollmentId).eq('kind', 'workout').not('skipped_at', 'is', null)
    .gte('shown_at', `${enrolledOnISO}T00:00:00Z`).limit(1)
  if (skipped && skipped.length > 0) return { struggling: true, reason: 'skipped_first_workout' }

  // Signal 2: real hard effort, twice, in her first sets ever — she's
  // trying, but the plan itself is landing too heavy right out of the gate.
  const { data: sets } = await svc.from('workout_set_logs').select('effort')
    .eq('enrollment_id', enrollmentId).gte('logged_on', enrolledOnISO).order('created_at', { ascending: true }).limit(6)
  const hardCount = (sets || []).filter((s) => s.effort === 'hard').length
  if (hardCount >= EARLY_HARD_EFFORT_MIN_COUNT) return { struggling: true, reason: 'early_hard_effort' }

  // Signal 3: three real days in without a single workout logged, despite
  // having enrolled with intent — not a skip (nothing was ever shown/acted
  // on to skip), just real silence right from the start.
  if (ageDays >= 3) {
    const { data: done } = await svc.from('challenge_progress').select('id')
      .eq('enrollment_id', enrollmentId).eq('note', '__daily__')
      .gte('logged_on', enrolledOnISO).lte('logged_on', addDaysISO(enrolledOnISO, 2))
      .contains('measurements', { workout: true }).limit(1)
    if (!done || done.length === 0) return { struggling: true, reason: 'no_early_completion' }
  }

  return { struggling: false, reason: null }
}
