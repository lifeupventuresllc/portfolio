// A member can select more than one goal on the intake/preferences screen
// ("pick all that apply" — Lose fat / Build & tone / Maintain). Real bug
// found live, 2026-09-03 (beta tester report + direct verification): every
// downstream calculation used to just take `goals[0]` — whichever she
// clicked FIRST — and silently discard the rest. Picking "Lose fat" AND
// "Build & tone" together is a real, well-established training goal (body
// recomposition), not a UI glitch to collapse away. This is the one place
// that decides her real combined goal — every caller that used to read
// `goals[0]` directly should call this instead.
export type EffectiveGoal = 'lose' | 'gain' | 'maintain' | 'recomp'

export function effectiveGoal(goals: string[] | null | undefined): EffectiveGoal {
  const set = new Set(goals || [])
  if (set.has('lose') && set.has('gain')) return 'recomp'
  if (set.has('lose')) return 'lose'
  if (set.has('gain')) return 'gain'
  return 'maintain'
}

// Reads a goal value already stored in the DB (challenge_intake.goal, a free-
// text column) back into a real EffectiveGoal. Real bug found live,
// 2026-09-03: the SAME narrow 3-value cast (`goal === 'gain' || goal ===
// 'maintain' ? goal : 'lose'`) was copy-pasted across half a dozen real,
// live call sites (the workout week view, plan evolution, manual rebuild,
// the Next Action engine, the initial plan build itself) — every one of
// them silently downgraded a real 'recomp' row back to a plain 'lose' plan.
// One shared reader instead of six independent copies of the same bug.
export function parseStoredGoal(raw: string | null | undefined): EffectiveGoal {
  return raw === 'gain' || raw === 'maintain' || raw === 'recomp' ? raw : 'lose'
}
