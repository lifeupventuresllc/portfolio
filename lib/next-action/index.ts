import { createServiceClient } from '@/lib/supabase/server'
import { getTimezone, localDateISO } from '@/lib/localdate'
import { getUserState } from './state'
import { buildCandidates } from './candidates'
import { scoreCandidates } from './score'
import { humanizeInstruction } from './llm'
import { isRewardEligible, pickRewardOrQuestion, pickRewardQuestion, recordRewardOffered } from './reward'
import type { NextActionResult, StateOverrides } from './types'

export { getUserState } from './state'
export { buildCandidates } from './candidates'
export { scoreCandidates } from './score'
export { humanizeInstruction, parseNextActionSignal, type ParsedSignal } from './llm'
export { recordStatedPreference } from './reward'
export type * from './types'

type FoodLogData = { restaurant: string; order: string; cal: number; protein: number; carbs: number; fat: number; slot: string | null }
type OpenRow = { id: string; kind: string; action_key: string; instruction: string; display_text: string | null; score: number; shown_at: string; food_log_data: FoodLogData | null }

const OPEN_ROW_COLUMNS = 'id, kind, action_key, instruction, display_text, score, shown_at, food_log_data'

// action_key for a 'location' kind is always `location:{restaurant}:{order}`
// (see candidates.ts) — parsed back out here so a page refresh can still
// carry the restaurant through to the /plan/eating-out expansion link
// without a DB round trip for it. Restaurant names in the curated data
// never contain a colon, so splitting on ':' is safe.
function restaurantFromActionKey(kind: string, actionKey: string): string | undefined {
  if (kind !== 'location') return undefined
  const parts = actionKey.split(':')
  return parts.length >= 2 ? parts[1] : undefined
}

// The single unresolved instruction for this enrollment, if one exists.
// There's a DB-level guarantee behind this (see 033's partial unique index)
// — at most one row can ever be open per enrollment at a time — so this is
// safe to treat as authoritative, not a best-effort check. `instruction`
// here is always the display-ready copy (the reworded text if one was
// generated, the deterministic original otherwise) — callers never need to
// know display_text exists.
export async function getOpenAction(enrollmentId: string): Promise<Omit<OpenRow, 'display_text'> | null> {
  const svc = createServiceClient()
  const { data } = await svc
    .from('next_action_log')
    .select(OPEN_ROW_COLUMNS)
    .eq('enrollment_id', enrollmentId)
    .is('completed_at', null)
    .is('skipped_at', null)
    .is('superseded_at', null)
    .order('shown_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return null
  const row = data as OpenRow
  return { id: row.id, kind: row.kind, action_key: row.action_key, instruction: row.display_text || row.instruction, score: row.score, shown_at: row.shown_at, food_log_data: row.food_log_data }
}

// The entry point: everything known about her right now → exactly one
// instruction. Every call both decides AND logs — the log row this writes
// is the same row the Feedback Loop (markCompleted/markSkipped below) closes
// out, and the same table next call's completion-rate scoring reads. There
// is deliberately no way to get a recommendation without it being recorded;
// an unlogged decision can never be learned from.
//
// Callers must resolve (or supersede) any existing open action before
// calling this — it always creates a new row. Two concurrent callers that
// both skip that check will race on the unique index (033); the loser's
// insert fails with a 23505 unique-violation, and rather than erroring we
// just return whatever the winner actually inserted, so a race never
// produces two live instructions.
export async function getNextAction(enrollmentId: string, todayISO: string, overrides: StateOverrides = {}, excludeActionKey?: string, forceFallback?: boolean): Promise<NextActionResult> {
  const state = await getUserState(enrollmentId, todayISO, overrides)
  const candidates = buildCandidates(state, { forceFallback })
  const scored = await scoreCandidates(candidates, state)
  // Real bug caught live, 2026-08-26: the scorer is fully deterministic, so
  // "day changed" replaying against unchanged state just re-picked the exact
  // same top candidate — a tap that visibly did nothing, indistinguishable
  // from a broken button even though a real new row was created underneath.
  // Skip the just-closed action when a genuinely different option scored at
  // all; fall back to it only if it's truly the only candidate that exists,
  // never leaving her with nothing rather than a repeat.
  const winner = (excludeActionKey ? scored.find((c) => c.actionKey !== excludeActionKey) : undefined) || scored[0]

  // Reward system (prompt 7) — considered only AFTER the normal winner is
  // already decided, so a reward always rides along with whatever already
  // fits her real constraints today, instead of replacing them with an
  // unrelated treat. Eligibility reads consistency only (reward.ts), never
  // this candidate's size or score.
  let kind = winner.kind
  let actionKey = winner.actionKey
  let baseInstruction = winner.instruction
  let isReward = false
  let rewardPreferenceId: string | null = null
  let rewardLabel: string | undefined

  if (await isRewardEligible(enrollmentId, todayISO, state.dipRiskBand)) {
    isReward = true
    const decision = await pickRewardOrQuestion(enrollmentId)
    if (decision.type === 'question') {
      // Replaces the normal winner outright for this one turn — the
      // question itself becomes her single instruction; the real action
      // resumes as soon as she answers (see route.ts's message handler).
      kind = 'reward_question'
      actionKey = 'reward:question'
      baseInstruction = pickRewardQuestion()
    } else {
      rewardPreferenceId = await recordRewardOffered(enrollmentId, state.userId, decision.preference)
      rewardLabel = decision.preference.label
    }
  }

  // Prompt 5's LLM half — reworded once at creation, then stored so every
  // later fetch of this same open row shows identical wording (see 034's
  // migration comment).
  //
  // Real design reversal, 2026-08-28 (Asa's direct call after seeing it
  // live and not noticing anything happened): a reward used to be woven
  // straight into this same instruction text ("...And after that — full
  // workout, love."), by the ORIGINAL spec's explicit design — deliberately
  // subtle, never exposed as a distinct moment. Asa wants the opposite: a
  // real, visible celebration. `instruction`/`displayText` are now just the
  // clean base task, never blended with reward text — `isReward`/
  // `rewardLabel` below are returned as their OWN fields instead, and the
  // client shows the celebration as a separate UI moment. This also
  // retires weaveRewardDeterministic's reason for existing on this path —
  // there's no text-weave left to have a fallback for.
  const displayText = await humanizeInstruction(baseInstruction, { energy: state.energy })

  // Carried on the row itself for kind 'location' (2026-08-26, migration 036
  // applied) — the exact real order the circle decided on, so completing it
  // can log those exact calories/macros into her real food log later (see
  // markActionCompleted) instead of the suggestion being disconnected from
  // what actually counts toward her day. Null for every other kind.
  const foodLogData: FoodLogData | null = kind === 'location' && state.eatingOutPick
    ? { restaurant: state.eatingOutPick.restaurant, order: state.eatingOutPick.order, cal: state.eatingOutPick.cal, protein: state.eatingOutPick.protein, carbs: state.eatingOutPick.carbs, fat: state.eatingOutPick.fat, slot: state.eatingOutSlot }
    : null

  const svc = createServiceClient()
  const { data: row, error } = await svc
    .from('next_action_log')
    .insert({
      enrollment_id: enrollmentId,
      user_id: state.userId,
      kind,
      action_key: actionKey,
      instruction: baseInstruction,
      display_text: displayText,
      energy_context: state.energy,
      minutes_available: state.minutesAvailable,
      score: winner.score,
      source: 'rule',
      is_reward: isReward,
      reward_preference_id: rewardPreferenceId,
      food_log_data: foodLogData,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      const existing = await getOpenAction(enrollmentId)
      if (existing) return {
        logId: existing.id, kind: existing.kind as NextActionResult['kind'], actionKey: existing.action_key, instruction: existing.instruction, score: existing.score,
        restaurant: existing.food_log_data?.restaurant ?? restaurantFromActionKey(existing.kind, existing.action_key),
        mealSlot: (existing.food_log_data?.slot as NextActionResult['mealSlot']) ?? undefined,
      }
    }
    throw error
  }

  // Real bug fixed 2026-08-27: these were attached unconditionally, so a
  // winning WORKOUT candidate on a day she'd also mentioned a restaurant
  // came back carrying restaurant/mealSlot fields that had nothing to do
  // with the actual instruction shown — cosmetically wrong even after the
  // scoring fix above, since eatingOutPick/eatingOutSlot can be populated
  // in state without location actually being the winner.
  // Only true for a REAL reward (not the reward_question path, which is
  // its own distinct instruction, not a celebration moment) — the client
  // uses this to show the visible celebration Asa asked for. Only
  // populated on this fresh-creation path; a page reload of the same
  // still-open reward action won't re-derive it (would need a join back to
  // reward_preferences for the label) — acceptable, since the point is
  // catching the moment it happens, not guaranteeing it survives a reload.
  const isActualReward = isReward && kind !== 'reward_question'
  return {
    logId: row.id as string, kind, actionKey, instruction: displayText, score: winner.score,
    restaurant: kind === 'location' ? state.eatingOutPick?.restaurant : undefined,
    mealSlot: kind === 'location' ? state.eatingOutSlot ?? undefined : undefined,
    isReward: isActualReward || undefined,
    rewardLabel: isActualReward ? rewardLabel : undefined,
  }
}

// The one shared "what's her instruction right now" resolver — today's real
// open row if one still applies, a fresh one otherwise. Used by BOTH the API
// route and the dashboard's server-rendered teaser card, so there's exactly
// one place that knows how to do this, not two copies that can drift (same
// reasoning as lib/fos/effective-plan.ts).
export async function resolveCurrentAction(enrollmentId: string): Promise<NextActionResult> {
  const tz = getTimezone()
  const today = localDateISO(tz)

  const open = await getOpenAction(enrollmentId)
  if (open) {
    // Timezone-safe comparison — see 033/route.ts history: comparing a
    // literal UTC-midnight string against a local calendar date was a real
    // bug here. Both sides go through localDateISO now.
    if (localDateISO(tz, new Date(open.shown_at)) === today) {
      // Bug #14 fix, 2026-08-28 (real, live-reported): a 'meal' row's
      // "About X calories left today" text is written once at creation and
      // stored so repeat fetches don't re-roll wording (see getNextAction's
      // comment) — but that also froze the NUMBER, so logging real food
      // through the separate food-log/search screen (not the circle itself)
      // never moved it; she kept seeing the same stale total all day.
      // Detected here, not guessed: a real challenge_food_log row landing
      // after this action was shown means her actual remaining calories
      // changed underneath it. Treated the same way a genuine day-changed
      // disruption already is — supersede the now-stale row and hand back a
      // freshly computed one instead of the frozen text.
      if (open.kind === 'meal') {
        const svc = createServiceClient()
        const { data: newerLog } = await svc
          .from('challenge_food_log')
          .select('id')
          .eq('enrollment_id', enrollmentId)
          .gt('created_at', open.shown_at)
          .limit(1)
          .maybeSingle()
        if (newerLog) {
          await markActionSuperseded(open.id, enrollmentId)
          return getNextAction(enrollmentId, today)
        }
      }
      return {
        logId: open.id, kind: open.kind as NextActionResult['kind'], actionKey: open.action_key, instruction: open.instruction, score: open.score,
        restaurant: open.food_log_data?.restaurant ?? restaurantFromActionKey(open.kind, open.action_key),
        mealSlot: (open.food_log_data?.slot as NextActionResult['mealSlot']) ?? undefined,
      }
    }
    // Stale from a prior local day she never acted on — a real day-changed
    // disruption she didn't trigger herself; handled the same way.
    await markActionSuperseded(open.id, enrollmentId)
  }

  return getNextAction(enrollmentId, today)
}

export type ResolveFailureReason = 'not_found' | 'already_resolved' | 'update_failed'
export type ResolveOutcome = { ok: true } | { ok: false; reason: ResolveFailureReason }

// Every Feedback Loop write (done / skip / day-changed) goes through this
// first: confirms the row exists, belongs to THIS enrollment (an IDOR gap a
// blind review caught 2026-08-25 — the service-role client bypasses RLS
// entirely, so ownership must be checked here in application code, not
// assumed from the migration's policy), and hasn't already been resolved
// (acting twice on the same row, e.g. skip after done, previously produced
// silent self-contradictory state).
async function resolveOwnedOpenRow(logId: string, enrollmentId: string, column: 'completed_at' | 'skipped_at' | 'superseded_at'): Promise<ResolveOutcome & { kind?: string; userId?: string; foodLogData?: FoodLogData | null }> {
  const svc = createServiceClient()
  const { data: existing } = await svc
    .from('next_action_log')
    .select('enrollment_id, user_id, kind, completed_at, skipped_at, superseded_at, food_log_data')
    .eq('id', logId)
    .maybeSingle()
  if (!existing || existing.enrollment_id !== enrollmentId) return { ok: false, reason: 'not_found' }
  if (existing.completed_at || existing.skipped_at || existing.superseded_at) return { ok: false, reason: 'already_resolved' }

  // .is(column, null) here (real race caught under stress-testing,
  // 2026-08-26): the check above reads stale-by-the-time-it-matters state
  // under concurrency — two near-simultaneous requests for the same logId
  // (a double-tap, or a client retry after a slow response) could both pass
  // that check before either writes. Without a guard on the write itself,
  // both updates would "succeed" and both would go on to call
  // logEatenSuggestion, double-inserting the same real order into her food
  // log — corrupting the exact number this feature exists to keep accurate.
  // Guarding the WHERE clause on the actual DB row makes only the first
  // writer win; the loser sees 0 rows affected and is told the same
  // already_resolved story a same-row retry would get anyway.
  // All three columns guarded, not just `column` — closes the same race for
  // two DIFFERENT actions on the same row too (e.g. "done" and "skip" both
  // in flight at once), not only a same-action double-tap.
  const { data, error } = await svc
    .from('next_action_log')
    .update({ [column]: new Date().toISOString() })
    .eq('id', logId)
    .is('completed_at', null)
    .is('skipped_at', null)
    .is('superseded_at', null)
    .select('id')
  if (error) return { ok: false, reason: 'update_failed' }
  if (!data || data.length === 0) return { ok: false, reason: 'already_resolved' }
  return { ok: true, kind: existing.kind as string, userId: existing.user_id as string, foodLogData: existing.food_log_data as FoodLogData | null }
}

// The "accurately track the suggested food option" piece (2026-08-26, Asa's
// ask): completing a location (eating-out) action used to only flip the
// daily nutrition check-in flag — the real calories/macros she was just
// told to order never actually landed in challenge_food_log, so her
// "remaining calories today" for the REST of the day stayed wrong. This
// writes the exact real order the circle showed her (never a re-estimate)
// as a real food-log row the moment she confirms she did it.
async function logEatenSuggestion(enrollmentId: string, userId: string, pick: FoodLogData) {
  const svc = createServiceClient()
  const today = localDateISO(getTimezone())
  await svc.from('challenge_food_log').insert({
    enrollment_id: enrollmentId,
    user_id: userId,
    logged_on: today,
    meal: pick.slot ? pick.slot.toLowerCase() : null,
    name: `${pick.restaurant}: ${pick.order}`,
    brand: pick.restaurant,
    servings: 1,
    calories: pick.cal,
    protein_g: pick.protein,
    carbs_g: pick.carbs,
    fats_g: pick.fat,
    source: 'next_action',
  })
}

// Done closes the Feedback Loop row AND counts today for the streak — the
// dashboard's StreakChip and the Next Action circle sit on the same screen,
// so a tap that doesn't move the chip reads as broken even though the log
// row itself was written correctly. Reuses '__daily__' / streakFrom (see
// lib/streak.ts) rather than inventing a second definition of "showed up."
async function recordDailyCheckIn(enrollmentId: string, userId: string, kind: string) {
  const svc = createServiceClient()
  const today = localDateISO(getTimezone())
  const flag = kind === 'workout' ? 'workout' : kind === 'meal' || kind === 'location' ? 'nutrition' : null

  const { data: existing } = await svc
    .from('challenge_progress')
    .select('id, measurements')
    .eq('enrollment_id', enrollmentId)
    .eq('note', '__daily__')
    .eq('logged_on', today)
    .maybeSingle()

  // OR the new flag into whatever's already there — a second Done later the
  // same day (a workout action, then a meal one) must never erase the first.
  const measurements = { ...(existing?.measurements as Record<string, unknown> || {}), ...(flag ? { [flag]: true } : {}) }
  if (existing) {
    await svc.from('challenge_progress').update({ measurements }).eq('id', existing.id)
  } else {
    await svc.from('challenge_progress').insert({ enrollment_id: enrollmentId, user_id: userId, logged_on: today, note: '__daily__', measurements })
  }
}

// Feedback Loop writes (prompt 4's third system) — every real interaction
// closes the loop on the shown instruction so the next call's completion-
// rate scoring reflects it immediately, not after some batch job.
//
// skipFoodLog (2026-08-27, real bug found live): /plan/eating-out's
// pre-existing "I ordered this" button (EatingOutPicks.tsx) already logs
// the REAL order she actually picked via its own long-standing path
// (source: 'escape_plan') -- which may be either of the 2 options shown,
// not necessarily the single one this row's food_log_data stored. When
// that flow also resolves this row (so the circle's own Done can't fire a
// SECOND log for the same meal — see route.ts), it must skip this
// function's own logEatenSuggestion call, or she'd get logged twice.
export async function markActionCompleted(logId: string, enrollmentId: string, opts?: { skipFoodLog?: boolean }): Promise<ResolveOutcome> {
  const outcome = await resolveOwnedOpenRow(logId, enrollmentId, 'completed_at')
  if (!outcome.ok) return outcome
  await recordDailyCheckIn(enrollmentId, outcome.userId!, outcome.kind!).catch(() => {})
  if (!opts?.skipFoodLog && outcome.kind === 'location' && outcome.foodLogData) {
    await logEatenSuggestion(enrollmentId, outcome.userId!, outcome.foodLogData).catch(() => {})
  }
  return { ok: true }
}

export function markActionSkipped(logId: string, enrollmentId: string): Promise<ResolveOutcome> {
  return resolveOwnedOpenRow(logId, enrollmentId, 'skipped_at')
}

// "My day changed" — a real disruption, not a skip (see types.ts /
// migration comment on superseded_at: this must weigh differently in
// ranking than a genuine decline). Callers should immediately follow a
// successful supersede with a fresh getNextAction call to produce the ONE
// replacement instruction.
export function markActionSuperseded(logId: string, enrollmentId: string): Promise<ResolveOutcome> {
  return resolveOwnedOpenRow(logId, enrollmentId, 'superseded_at')
}
