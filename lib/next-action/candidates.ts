import type { ActionCandidate, UserStateSnapshot } from './types'

// The universal, wellness-scoped fallback set (prompt 2) — always available
// regardless of what real workout/meal data exists, so there is always at
// least one safe candidate to fall back to. Ranking among these (which one
// wins) is entirely the scorer's job via completionRate, not this list's —
// these all start equal here on purpose.
// Phrasing note (Asa's live-testing feedback, 2026-08-26): earlier copy read
// as a command ("Do X," "Take X") — like an order, not a coach on her side.
// Went through soft-nudge → uplifting → encouraging options live with Asa;
// landed on "loving" — warm, affectionate, states the thing as care rather
// than an instruction to follow.
const FALLBACKS: { key: string; instruction: string; minutes: number }[] = [
  { key: 'water', instruction: 'A glass of water for you, beautiful — you deserve the care.', minutes: 1 },
  { key: 'breath_checkin', instruction: '5 slow breaths, love — just check in with yourself.', minutes: 2 },
  { key: 'stretch', instruction: 'One long stretch — be gentle with yourself today.', minutes: 2 },
  { key: 'short_walk', instruction: 'A 5-minute walk — just you and some fresh air.', minutes: 5 },
  { key: 'stillness', instruction: '5 minutes of stillness, love — just for you, no phone.', minutes: 5 },
]

// Builds every real option worth scoring right now — never a menu shown to
// her, just the input list the scorer picks exactly one winner from. A
// candidate is only included if it's actually actionable today (no
// double-counting a workout she's already done, no meal prompt once she's
// already hit budget).
export function buildCandidates(state: UserStateSnapshot): ActionCandidate[] {
  const candidates: ActionCandidate[] = []

  if (state.workoutCandidate && !state.workoutDoneToday) {
    let instruction = `${state.workoutCandidate.title} today, love — your body's worth it.`
    // Goal-alignment layer (prompt 6): logging an off-track/over-budget day
    // feeds back into the workout side too — but only when it actually
    // matters for HER stated goal. More food eaten isn't a problem to solve
    // for a 'gain' goal, so this nudge is fat-loss-specific, not universal.
    // This adjusts the copy only — it never rewrites her stored program —
    // bounded, invisible-to-her-as-math, and reversible day to day.
    if (state.goal === 'lose' && state.calorieBudget != null && state.caloriesLoggedToday > state.calorieBudget) {
      instruction += ' Keep it shorter today if you need to, love — a lighter version still fully counts.'
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
      // Kept short on purpose (2026-08-26 fix) — the full calorie/protein
      // detail was pushing the circle's visible text past what fits;
      // the macro breakdown is still there if she taps through to
      // /plan/eating-out (prompt 3's expansion routing).
      instruction: `At ${p.restaurant}, love: ${p.order}.`,
      estMinutes: 2,
    })
  } else if (state.calorieBudget != null && state.caloriesLoggedToday < state.calorieBudget) {
    const remaining = Math.max(0, state.calorieBudget - state.caloriesLoggedToday)
    // Names her actual next real meal from her stored plan when one exists
    // (Asa's ask, 2026-08-27: "show their meals ... so they know what to
    // eat," not just a number) — real data only, silently omitted (not a
    // guess) on days with no meal plan or no meal at this slot.
    const mealLine = state.nextMealName ? ` Up next: ${state.nextMealName}.` : ''
    candidates.push({
      kind: 'meal',
      actionKey: 'meal:log_next',
      instruction: `About ${remaining} calories left today — you're taking care of you.${mealLine}`,
      estMinutes: 3,
    })
  }

  for (const f of FALLBACKS) {
    // The water fallback gets a real, quantified target instead of a vague
    // "a glass" whenever her real bodyweight is on file (Asa's ask,
    // 2026-08-27) — same standard guideline (half bodyweight in oz) the
    // wellness field generally uses, computed, never invented. Falls back
    // to the original generic line for a brand-new account with no intake
    // yet, same `fallback:water` action_key either way so her completion
    // history for it never fragments.
    if (f.key === 'water' && state.weightLbs) {
      const glasses = Math.max(1, Math.round(state.weightLbs / 2 / 8))
      candidates.push({ kind: 'fallback', actionKey: 'fallback:water', instruction: `${glasses} glasses of water for you today, love — you deserve the care.`, estMinutes: 1 })
      continue
    }
    candidates.push({ kind: 'fallback', actionKey: `fallback:${f.key}`, instruction: f.instruction, estMinutes: f.minutes })
  }

  // A second real, quantified nutrition fallback (Asa's ask, 2026-08-27) —
  // same foundation-piece spirit as the calorie candidate above, just the
  // protein side. Lives in the same fallback tier as water/stretch/walk so
  // it's personalized by the exact same completion-rate mechanism, no new
  // scoring logic needed. Omitted (not zeroed) whenever she has no real
  // protein target yet, or she's already hit it today.
  if (state.proteinBudget != null) {
    const proteinRemaining = Math.max(0, state.proteinBudget - state.proteinLoggedToday)
    if (proteinRemaining > 0) {
      candidates.push({ kind: 'fallback', actionKey: 'fallback:protein', instruction: `${proteinRemaining}g protein left today, love — you're taking care of you.`, estMinutes: 2 })
    }
  }

  return candidates
}
