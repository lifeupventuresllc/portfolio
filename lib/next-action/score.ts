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
}

// A real, already-observed dip (lib/fos/pattern.ts) or a low energy signal
// both push toward the smallest real win, not the full workout — same
// "recovery, not punishment" principle the rest of this codebase already
// applies (see FOS_PRINCIPLES). High energy gives a small nudge the other
// way. Deliberately modest relative to KIND_BASE's own spread: this should
// tip a close call, not override a real, doable workout outright.
function energyAdjustment(kind: ActionCandidate['kind'], state: UserStateSnapshot): number {
  const lowCapacity = state.energy === 'low' || state.dipRiskBand === 'high'
  if (lowCapacity) return kind === 'fallback' ? 25 : -20
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
function explicitContextAdjustment(candidate: ActionCandidate, state: UserStateSnapshot): number {
  if (candidate.kind === 'location' && state.eatingOutExplicit) return 25
  return 0
}

// "Past completion rate for similar actions" (prompt 5) and the personalized
// minimum-win ranking (prompt 2) are the SAME query: how often has SHE
// actually finished this specific action_key, historically, vs. skipped it.
// A brand-new action_key with no history yet scores neutral (0), not
// punished for being unproven.
const COMPLETION_WEIGHT = 15

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
