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
    let instruction = `Do today's workout: ${state.workoutCandidate.title}.`
    // Goal-alignment layer (prompt 6): logging an off-track/over-budget day
    // feeds back into the workout side too — but only when it actually
    // matters for HER stated goal. More food eaten isn't a problem to solve
    // for a 'gain' goal, so this nudge is fat-loss-specific, not universal.
    // This adjusts the copy only — it never rewrites her stored program —
    // bounded, invisible-to-her-as-math, and reversible day to day.
    if (state.goal === 'lose' && state.calorieBudget != null && state.caloriesLoggedToday > state.calorieBudget) {
      instruction += ' Keep it shorter today if you need to — a lighter version still fully counts.'
    }
    candidates.push({ kind: 'workout', actionKey: `workout:${state.workoutCandidate.title}`, instruction, estMinutes: 30 })
  }

  // Eating out replaces the generic meal-log reminder entirely — a real
  // location signal means she needs ONE specific order, not a reminder to
  // log something later (prompt 6's single-selection requirement). Uses the
  // app's real Escape Plan pick (state.eatingOutPick), not a synthetic list.
  if (state.eatingOutToday && state.eatingOutPick) {
    const p = state.eatingOutPick
    candidates.push({
      kind: 'location',
      actionKey: `location:${p.restaurant}:${p.order}`,
      instruction: `At the restaurant, order: ${p.restaurant} — ${p.order} (about ${p.cal} cal, ${p.protein}g protein).`,
      estMinutes: 2,
    })
  } else if (state.calorieBudget != null && state.caloriesLoggedToday < state.calorieBudget) {
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
