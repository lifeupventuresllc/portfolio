import { createServiceClient } from '@/lib/supabase/server'
import type { ActionCandidate, ScoredAction, UserStateSnapshot } from './types'

// The Recommendation Layer's actual decision mechanism (prompt 5) — a fast,
// cheap, deterministic weighted score, run on every circle update. The LLM
// is never called here; it only ever (a) turns her natural language into the
// structured state this reads, and (b) rewords the winning instruction's
// copy afterward. Whatever scores highest wins, full stop — no ties broken
// by anything but candidate order (kept stable so results are reproducible).

// Base priority by kind, before any adjustment below. A real workout or a
// real meal prompt outranks a generic fallback whenever she's actually
// capable of it right now — fallbacks exist for when she isn't, not as a
// default preference.
const KIND_BASE: Record<ActionCandidate['kind'], number> = {
  workout: 60,
  meal: 50,
  fallback: 20,
  location: 55,
  // Never actually built as a scored candidate (lib/next-action/reward.ts
  // injects it after scoring, replacing whatever won) — present only so
  // the map stays exhaustive over ActionKind.
  reward_question: 0,
  // Also never actually competes — candidates.ts returns it as the ONLY
  // candidate on a day she's genuinely done, so nothing else is in the
  // running for the scorer to weigh it against. Present for exhaustiveness.
  complete: 0,
  // 'coach' and 'partner' (2026-09-24) — real, but secondary to the core
  // workout/meal loop on an ordinary day. Below meal (50) and location (55)
  // on purpose: a rough day should still usually offer the (softened) real
  // workout before "go talk to someone about it." coach gets a targeted
  // boost below on genuinely high dip risk specifically — see
  // explicitContextAdjustment.
  coach: 45,
  partner: 40,
}

// A real, already-observed dip (lib/fos/pattern.ts) or a low energy signal
// both push toward the smallest real win, not the full workout — same
// "recovery, not punishment" principle the rest of this codebase already
// applies (see FOS_PRINCIPLES). High energy gives a small nudge the other
// way. Deliberately modest relative to KIND_BASE's own spread: this should
// tip a close call, not override a real, doable workout outright.
//
// Real bug fixed 2026-09-18 (beta feedback: "next-action defaults to drink
// water instead of the actual user's workout, goals, or plan" — the doc's
// own "one thing"): this used to be -20/+25, a 45-point swing against
// KIND_BASE's 40-point workout/fallback gap. That's not "tipping a close
// call" the way the comment above claims — it's a guaranteed override, every
// single time she reports low energy or a dip gets flagged, regardless of
// how personalized or doable her real workout is. A generic tester saying
// "I'm tired" (an ordinary, expected daily-checkin answer, not an edge case)
// always lost her real workout title to "a glass of water" outright. 15/15
// keeps the swing (30) under the base gap (40) so a fresh real candidate
// still wins on a normal day — fallback only overtakes it when completion
// history ALSO argues for it (e.g. she reliably doesn't finish this size
// task when low-energy), which is a real personalization signal instead of
// a blanket rule that ignores her data entirely.
function energyAdjustment(kind: ActionCandidate['kind'], state: UserStateSnapshot): number {
  const lowCapacity = state.energy === 'low' || state.dipRiskBand === 'high'
  if (lowCapacity) return kind === 'fallback' ? 15 : -15
  if (state.energy === 'high') return kind === 'fallback' ? -10 : 10
  return 0
}

// Only applied when minutesAvailable is actually known (an explicit signal —
// see types.ts) — unknown must never silently rule out the real workout, so
// this stays a no-op until something sets it.
function timeFitAdjustment(candidate: ActionCandidate, state: UserStateSnapshot): number {
  if (state.minutesAvailable == null) return 0
  return candidate.estMinutes <= state.minutesAvailable ? 0 : -100
}

// Real bug fixed 2026-08-27: KIND_BASE alone gave workout (60) a higher
// floor than location (55) — so telling it "I'm at Chick-fil-A right now,
// give me a meal" still lost to a pending workout and produced a leg-day
// instruction, flatly ignoring what she'd just said. A generic scheduled
// eat-out day is one thing; an explicit, live, right-now disruption she
// just typed or said is a different and stronger signal — same category as
// workoutSkippedToday's calorie adjustment elsewhere in this engine, where
// an explicit real-time report already outweighs a static default. +25 is
// enough to clear workout's 5-point edge with real room to spare, without
// being so large it can never lose to something even more urgent later.
// Real gap found live, 2026-08-31 (Asa: approved an arm-workout swap in
// Coach Asa chat, the circle correctly retired the stale "Full Body" row
// but then handed back a nutrition nudge instead of the arm workout just
// approved): a freshly-adjusted workout candidate carries a brand-new
// action_key (title changed), so completionRates has zero history for it —
// 0 in COMPLETION_WEIGHT's ×15 term — while 'meal:log_next' is a stable key
// this account has completed many times before. KIND_BASE's 10-point
// workout/meal gap is smaller than a well-worn meal key's completion bonus
// can make up, so the just-approved override lost outright. Same fix as
// eatingOutExplicit just above: an approved, not-yet-done today-only workout
// override (state.workoutOverrideActive — see types.ts for why this is a
// separate signal from workoutReducedToday) is exactly as strong an explicit
// right-now signal as "I'm eating out right now" — it must win on the very
// next resolve, not get outscored by unrelated history.
function explicitContextAdjustment(candidate: ActionCandidate, state: UserStateSnapshot): number {
  if (candidate.kind === 'location' && state.eatingOutExplicit) return 25
  if (candidate.kind === 'workout' && state.workoutOverrideActive) return 25
  // Real, high-confidence risk (not just a low-energy day — dipRiskBand
  // 'high' specifically) is a stronger signal than an ordinary rough
  // morning: 45 (base) + 20 (here) - 15 (energyAdjustment, since 'high'
  // also counts as lowCapacity there) = 50, clearing a same-day softened
  // workout's 60-15=45. A merely low-energy day (dipRiskBand not 'high')
  // does NOT get this boost — the softened workout still wins there,
  // unchanged from before this candidate existed.
  if (candidate.kind === 'coach' && state.dipRiskBand === 'high') return 20
  return 0
}

// "Past completion rate for similar actions" (prompt 5) and the personalized
// minimum-win ranking (prompt 2) are the SAME query: how often has SHE
// actually finished this specific action_key, historically, vs. skipped it.
// A brand-new action_key with no history yet scores neutral (0), not
// punished for being unproven.
//
// Real bug found live, 2026-09-18 (click-through on the standing test
// account): at 15, a well-worn stable key like 'meal:log_next' (rate 1.0 →
// +15 → 65) beat a real, doable, pending workout (60) on a completely normal
// day, because the workout key is the day's title and is always new (0).
// Kept strictly under the 10-point workout/meal gap in KIND_BASE so history
// can tip a close call but never, on its own, flip workout below meal.
const COMPLETION_WEIGHT = 9

async function completionRates(enrollmentId: string, actionKeys: string[]): Promise<Record<string, number>> {
  if (actionKeys.length === 0) return {}
  const svc = createServiceClient()
  const { data } = await svc
    .from('next_action_log')
    .select('action_key, completed_at, skipped_at')
    .eq('enrollment_id', enrollmentId)
    .in('action_key', actionKeys)
  const rates: Record<string, number> = {}
  const grouped = new Map<string, { done: number; total: number }>()
  for (const row of data || []) {
    const key = row.action_key as string
    const g = grouped.get(key) || { done: 0, total: 0 }
    if (row.completed_at || row.skipped_at) {
      g.total += 1
      if (row.completed_at) g.done += 1
    }
    grouped.set(key, g)
  }
  grouped.forEach((g, key) => {
    rates[key] = g.total > 0 ? g.done / g.total : 0
  })
  return rates
}

export async function scoreCandidates(candidates: ActionCandidate[], state: UserStateSnapshot): Promise<ScoredAction[]> {
  const rates = await completionRates(state.enrollmentId, candidates.map((c) => c.actionKey))
  return candidates
    .map((c) => {
      const completionRate = rates[c.actionKey] ?? 0
      const score = KIND_BASE[c.kind] + energyAdjustment(c.kind, state) + timeFitAdjustment(c, state) + explicitContextAdjustment(c, state) + completionRate * COMPLETION_WEIGHT
      return { ...c, completionRate, score }
    })
    .sort((a, b) => b.score - a.score)
}
