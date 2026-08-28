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

// Real bug fixed 2026-08-28: the fallback pool below was ALWAYS available
// regardless of anything else being done, so the circle could never go
// quiet — even on a day she'd genuinely finished her workout AND logged
// real food, it kept nudging "one more small thing" (a glass of water, a
// stretch) instead of ever just telling her she was done.
const COMPLETE_MESSAGES = [
  "You did it all today, love — every single thing. Rest now, you've more than earned it.",
  "That's everything for today, love. Go be proud of yourself tonight.",
  'Workout done, food logged — today is fully yours now. Well done, love.',
  'You showed up for all of it today. Let yourself feel good about that, love.',
  "Nothing left to do today, love — you already gave it everything.",
]

// Real bug fixed 2026-08-28 (Asa's live report): this used to fire off
// caloriesLoggedToday > 0 — ANY single food entry — so logging one small
// snack after a workout claimed "you did it all today, nothing left to do"
// even with hundreds of real calories still in her budget, and hid the
// actual remaining-calorie number underneath it. "Done" for nutrition now
// means the same thing the meal candidate below means by "still has calories
// left": she's used her real budget, not merely touched the log once. With
// no known budget there's nothing to compare against, so a real entry still
// counts (the old behavior, kept only for that one case).
function nutritionDoneToday(state: UserStateSnapshot): boolean {
  return state.calorieBudget != null ? state.caloriesLoggedToday >= state.calorieBudget : state.caloriesLoggedToday > 0
}

// Builds every real option worth scoring right now — never a menu shown to
// her, just the input list the scorer picks exactly one winner from. A
// candidate is only included if it's actually actionable today (no
// double-counting a workout she's already done, no meal prompt once she's
// already hit budget).
export function buildCandidates(state: UserStateSnapshot): ActionCandidate[] {
  if (state.workoutDoneToday && nutritionDoneToday(state)) {
    const instruction = COMPLETE_MESSAGES[Math.floor(Math.random() * COMPLETE_MESSAGES.length)]
    return [{ kind: 'complete', actionKey: 'complete:done_for_today', instruction, estMinutes: 0 }]
  }

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
    // Real bug caught live, 2026-08-27: a quantified daily total ("12
    // glasses of water today") briefly replaced the plain line here — Asa's
    // direct feedback: even though the number is real, seeing a whole-day
    // total on a "keep it simple" tap breaks the one-tiny-thing feel every
    // other fallback has (5 breaths, one stretch, a short walk — none of
    // them show a cumulative target). Reverted to the same single, bite-
    // sized framing as the rest of this list.
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
