import { createServiceClient } from '@/lib/supabase/server'
import { getUserState } from './state'
import { buildCandidates } from './candidates'
import { scoreCandidates } from './score'
import type { NextActionResult } from './types'

export { getUserState } from './state'
export { buildCandidates } from './candidates'
export { scoreCandidates } from './score'
export type * from './types'

// The entry point: everything known about her right now → exactly one
// instruction. Every call both decides AND logs — the log row this writes
// is the same row the Feedback Loop (markCompleted/markSkipped below) closes
// out, and the same table next call's completion-rate scoring reads. There
// is deliberately no way to get a recommendation without it being recorded;
// an unlogged decision can never be learned from.
export async function getNextAction(enrollmentId: string, todayISO: string): Promise<NextActionResult> {
  const state = await getUserState(enrollmentId, todayISO)
  const candidates = buildCandidates(state)
  const scored = await scoreCandidates(candidates, state)
  const winner = scored[0]

  const svc = createServiceClient()
  const { data: row, error } = await svc
    .from('next_action_log')
    .insert({
      enrollment_id: enrollmentId,
      user_id: state.userId,
      kind: winner.kind,
      action_key: winner.actionKey,
      instruction: winner.instruction,
      energy_context: state.energy,
      minutes_available: state.minutesAvailable,
      score: winner.score,
      source: 'rule',
    })
    .select('id')
    .single()
  if (error) throw error

  return { logId: row.id as string, kind: winner.kind, actionKey: winner.actionKey, instruction: winner.instruction, score: winner.score }
}

// Feedback Loop writes (prompt 4's third system) — every real interaction
// closes the loop on the shown instruction so the next call's completion-
// rate scoring reflects it immediately, not after some batch job.
export async function markActionCompleted(logId: string): Promise<void> {
  const svc = createServiceClient()
  await svc.from('next_action_log').update({ completed_at: new Date().toISOString() }).eq('id', logId)
}

export async function markActionSkipped(logId: string): Promise<void> {
  const svc = createServiceClient()
  await svc.from('next_action_log').update({ skipped_at: new Date().toISOString() }).eq('id', logId)
}

// "My day changed" — a real disruption, not a skip (see types.ts /
// migration comment on superseded_at: this must weigh differently in
// ranking than a genuine decline). Callers should immediately follow this
// with a fresh getNextAction call to produce the ONE replacement instruction.
export async function markActionSuperseded(logId: string): Promise<void> {
  const svc = createServiceClient()
  await svc.from('next_action_log').update({ superseded_at: new Date().toISOString() }).eq('id', logId)
}
