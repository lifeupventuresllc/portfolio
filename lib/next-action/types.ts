// The Next Action engine — a new, standalone system (2026-08-25 spec, see
// memory "Next Action Engine — One Thing"). Deliberately its own module tree,
// not folded into lib/fos/* — it READS existing data (fos_profile, fos_events,
// challenge_progress, challenge_food_log, the workout generator) as inputs,
// but the state aggregation and scoring logic here are new, built for one
// job: turn everything already known about her into exactly ONE instruction,
// never a menu. See lib/next-action/index.ts for the entry point.

export type EnergyLevel = 'low' | 'normal' | 'high' | 'unknown'
export type ActionKind = 'workout' | 'meal' | 'fallback' | 'location'

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
}
