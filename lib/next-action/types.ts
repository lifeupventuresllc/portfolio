import type { WorkoutChange, NutritionChange } from '../fos/types'

// The Next Action engine — a new, standalone system (2026-08-25 spec, see
// memory "Next Action Engine — One Thing"). Deliberately its own module tree,
// not folded into lib/fos/* — it READS existing data (fos_profile, fos_events,
// challenge_progress, challenge_food_log, the workout generator) as inputs,
// but the state aggregation and scoring logic here are new, built for one
// job: turn everything already known about her into exactly ONE instruction,
// never a menu. See lib/next-action/index.ts for the entry point.

export type EnergyLevel = 'low' | 'normal' | 'high' | 'unknown'
// 'reward_question' (prompt 7) is never a scored candidate — it's an
// occasional replacement the reward system swaps in on top of whatever
// normally would have won, when it has nothing usable yet to reward with.
// 'complete' (2026-08-28, Asa's ask): a real terminal state — she's already
// done her workout AND logged real food today, so the engine has nothing
// left to actually ask of her. Before this, the fallback pool (water,
// stretch, etc.) ALWAYS had a candidate available, so the circle could
// never go quiet even on a day she'd genuinely finished everything —
// it kept nudging for one more small thing. See candidates.ts.
export type ActionKind = 'workout' | 'meal' | 'fallback' | 'location' | 'reward_question' | 'complete'

export type UserStateSnapshot = {
  enrollmentId: string
  userId: string | null
  todayISO: string
  energy: EnergyLevel
  // Minutes she has right now, when known (only ever set by an explicit
  // signal — chat/voice parse, or a "day changed" disruption — never
  // guessed). Unknown by default: the scorer treats unknown as "don't let
  // time rule this out," not as a zero.
  minutesAvailable: number | null
  // Has she already done the thing today — the two things that currently
  // exist to be "the one action" (more kinds join this as they're built).
  workoutDoneToday: boolean
  workoutCandidate: { title: string; muscles?: string[] } | null
  calorieBudget: number | null
  caloriesLoggedToday: number
  // Real restrictions she's already told the app about — an action that
  // conflicts with one of these is disqualified before scoring, never
  // ranked-then-shown-anyway.
  injuries: string[]
  // A signal already computed by the older pattern engine (lib/fos/pattern.ts)
  // — reused as an INPUT here (a real behavior-change read), not duplicated.
  // High risk nudges energy down and biases toward the smallest real win.
  isDip: boolean
  dipRiskBand: 'low' | 'medium' | 'high'

  // ---- Goal-alignment layer (prompt 6) ----
  // Her stated goal — every candidate/instruction gets calculated against
  // THIS, even when the visible action is minimized for low capacity.
  // 'recomp' = both "Lose fat" and "Build & tone" selected (lib/goals.ts).
  goal: 'lose' | 'gain' | 'maintain' | 'recomp'
  // True only when she was actually shown a workout action today (via THIS
  // engine) and explicitly skipped it — a real signal, never guessed from
  // time of day. Drives the calorie-burn adjustment below.
  workoutSkippedToday: boolean
  // True when a workout adjustment is on file for today (e.g. a cardio
  // swap) — treated as a partial, not full, burn reduction.
  workoutReducedToday: boolean
  // A real, live approved override for today's workout that she hasn't
  // finished yet — deliberately NOT the same signal as workoutReducedToday
  // above. Real bug found live, 2026-08-31: workoutReducedToday is gated on
  // `!workoutSkippedToday`, which latches true for the rest of the day the
  // moment ANY prior workout row gets superseded — which happens on every
  // single adjustment approval by design (see index.ts's
  // resolveCurrentAction). Score.ts needs "is there a live override right
  // now" as an independent signal from that calorie-math flag, or the
  // explicit-priority boost a fresh approval needs permanently disables
  // itself the moment a second approval happens the same day.
  workoutOverrideActive: boolean
  // Calories already invisibly subtracted from calorieBudget above because
  // an expected burn didn't happen — kept here only for audit/debugging,
  // never shown to her.
  workoutBurnAdjustment: number
  // A real "I'm eating out" signal — either the plan's own schedule or an
  // explicit disruption she just reported (see index.ts's overrides).
  eatingOutToday: boolean
  // True only when THIS call carried an explicit signal (a message she just
  // sent, right now) — false when eatingOutToday came from the static
  // weekly schedule instead. Real bug fixed 2026-08-27: without this
  // distinction, saying "I'm at Chick-fil-A" live scored the exact same as
  // a generic scheduled eat-out day, so a pending workout (higher base
  // priority) kept winning anyway — the app told her to go do legs after
  // she'd just said where she was and what she wanted right now.
  eatingOutExplicit: boolean
  // The single real order picked from the app's existing Escape Plan
  // system (lib/escape-plan.ts) for right now — null only when eatingOutToday
  // is false, or the picker genuinely had nothing to offer.
  eatingOutPick: { restaurant: string; order: string; cal: number; protein: number; carbs: number; fat: number } | null
  // The meal slot actually used to pick it — either the one she explicitly
  // named (overrides.eatingOutMealSlot) or, when she didn't say, the one
  // inferred from the current local hour. Carried forward so the
  // /plan/eating-out expansion screen sizes to the SAME slot she meant,
  // not whatever the clock says by the time she taps through.
  eatingOutSlot: 'Breakfast' | 'Lunch' | 'Snack' | 'Dinner' | null

  // ---- Nutrition fallback candidates (Asa's ask, 2026-08-27) ----
  // Her real stored protein target/logged-today, same source the cal/protein
  // glance row on /plan/today already reads — never a separate number.
  proteinBudget: number | null
  proteinLoggedToday: number
  // Her actual next real planned meal's name (from the stored weekly meal
  // plan, matched to the current local hour's slot) — real data, never an
  // invented meal. Null whenever no meal plan exists yet or today has no
  // meal at that slot (e.g. Sunday's recovery day).
  nextMealName: string | null
}

// Ephemeral, single-call overrides derived from an explicit signal (a
// structured "day changed" tap, or an LLM-parsed natural-language message) —
// never persisted as her new baseline. Passed straight into getUserState;
// unset fields fall back to whatever's actually on file.
export type StateOverrides = {
  energy?: EnergyLevel
  minutesAvailable?: number
  eatingOut?: boolean
  // The specific restaurant/chain she named, if any (2026-08-26 fix) — when
  // present, the eating-out pick is generated for THIS exact place instead
  // of a generic curated-list match unrelated to where she actually is.
  eatingOutRestaurant?: string
  // The meal she actually named (2026-08-26 fix, second gap on the same
  // report) — "give me a snack idea" at 1pm must size like a snack, not
  // whatever the clock alone would infer (Lunch). Only ever set from an
  // explicit word in her own message; time-of-day remains the fallback.
  eatingOutMealSlot?: 'Breakfast' | 'Lunch' | 'Snack' | 'Dinner'
  // A not-yet-approved workout/nutrition change to simulate INSTEAD of
  // whatever's actually approved for today (added 2026-08-31, for the
  // operator route's approval-ask copy: "we'd be changing your workout from
  // X to Y — approve?" needs the real Y, computed the exact same way the
  // dashboard would once it's actually approved, not a re-derived copy of
  // that logic). Never written anywhere — purely a read-time simulation.
  workoutChangeOverride?: WorkoutChange
  nutritionChangeOverride?: NutritionChange
}

export type ActionCandidate = {
  kind: ActionKind
  actionKey: string
  instruction: string
  // Rough time cost, used against minutesAvailable when it's known.
  estMinutes: number
  // Populated by the scorer from next_action_log history — the "past
  // completion rate for similar actions" factor prompt 5 specifies, and
  // exactly the personalized-fallback-ranking mechanism prompt 2 describes
  // (a query against the same state, not a separate system).
  completionRate?: number
}

export type ScoredAction = ActionCandidate & { score: number }

export type NextActionResult = {
  logId: string
  kind: ActionKind
  actionKey: string
  instruction: string
  score: number
  // Only populated for kind 'location' — lets the client pass the exact
  // restaurant/slot the circle already decided on through to the
  // /plan/eating-out expansion screen, so tapping through shows 2 real
  // options for THAT place/meal instead of the generic rotating picks.
  restaurant?: string
  mealSlot?: 'Breakfast' | 'Lunch' | 'Snack' | 'Dinner'
  // Reward system (2026-08-28 refinement, Asa's direct call): the reward
  // used to be silently woven into `instruction` itself ("...And after
  // that — full workout, love."), by original design, specifically so it
  // was never exposed as a distinct moment. Asa reversed that after seeing
  // it live and not noticing anything had happened — she wants a real,
  // visible celebration instead. `instruction` is the clean base task now;
  // these two fields are what the client uses to show that separately.
  isReward?: boolean
  rewardLabel?: string
}
