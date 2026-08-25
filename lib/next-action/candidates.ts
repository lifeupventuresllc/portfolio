import type { ActionCandidate, UserStateSnapshot } from './types'

// The universal, wellness-scoped fallback set (prompt 2) — always available
// regardless of what real workout/meal data exists, so there is always at
// least one safe candidate to fall back to. Ranking among these (which one
// wins) is entirely the scorer's job via completionRate, not this list's —
// these all start equal here on purpose.
const FALLBACKS: { key: string; instruction: string; minutes: number }[] = [
  { key: 'water', instruction: 'Drink a full glass of water right now.', minutes: 1 },
  { key: 'breath_checkin', instruction: 'Take 5 slow breaths and check in with how you feel.', minutes: 2 },
  { key: 'stretch', instruction: 'Do one long stretch, hold it for 30 seconds.', minutes: 2 },
  { key: 'short_walk', instruction: 'Take a 5-minute walk, anywhere.', minutes: 5 },
  { key: 'stillness', instruction: 'Sit still for 5 minutes, no phone.', minutes: 5 },
]

// Builds every real option worth scoring right now — never a menu shown to
// her, just the input list the scorer picks exactly one winner from. A
// candidate is only included if it's actually actionable today (no
// double-counting a workout she's already done, no meal prompt once she's
// already hit budget).
export function buildCandidates(state: UserStateSnapshot): ActionCandidate[] {
  const candidates: ActionCandidate[] = []

  if (state.workoutCandidate && !state.workoutDoneToday) {
    candidates.push({
      kind: 'workout',
      actionKey: `workout:${state.workoutCandidate.title}`,
      instruction: `Do today's workout: ${state.workoutCandidate.title}.`,
      estMinutes: 30,
    })
  }

  if (state.calorieBudget != null && state.caloriesLoggedToday < state.calorieBudget) {
    const remaining = Math.max(0, state.calorieBudget - state.caloriesLoggedToday)
    candidates.push({
      kind: 'meal',
      actionKey: 'meal:log_next',
      instruction: `Log your next meal — you have about ${remaining} calories left today.`,
      estMinutes: 3,
    })
  }

  for (const f of FALLBACKS) {
    candidates.push({ kind: 'fallback', actionKey: `fallback:${f.key}`, instruction: f.instruction, estMinutes: f.minutes })
  }

  return candidates
}
