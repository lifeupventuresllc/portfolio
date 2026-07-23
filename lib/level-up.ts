import type { Level } from './workout-exercises'

// Progression here is level-tier based (reps/cardio/exercise-difficulty step up
// when she moves Beginner → Intermediate → Advanced), not automatic in-level
// overload — see the two-problem filter reasoning: silently escalating difficulty
// without her buy-in risks feeling like a setback (cuts against "recommend, don't
// control"), but making HER decide when she's "ready" is itself a decision-fatigue
// point. Compromise: the app watches for it and proactively suggests leveling up,
// same pattern as the daily check-in and the Challenge upsell — she still has final
// say (one tap), she just never has to self-initiate or self-assess.

const MIN_DAYS_AT_LEVEL = 28 // ~4 weeks, matches the app's general weekly cadence
const MIN_COMPLETED_WORKOUTS = 12 // ~3x/week average over that window — proves real consistency, not just time passing

const NEXT_LEVEL: Record<Level, Level | null> = { 1: 2, 2: 3, 3: null }
const LEVEL_NAME: Record<Level, string> = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' }

export function nextLevel(current: Level): Level | null {
  return NEXT_LEVEL[current]
}

export function levelName(level: Level): string {
  return LEVEL_NAME[level]
}

// completedSince = number of workout-days logged on/after levelStartedAt.
export function shouldSuggestLevelUp(currentLevel: Level, levelStartedAt: string, completedSince: number): boolean {
  const next = nextLevel(currentLevel)
  if (!next) return false // already at Advanced, nothing to suggest
  const daysAtLevel = Math.floor((Date.now() - new Date(levelStartedAt).getTime()) / 86400000)
  return daysAtLevel >= MIN_DAYS_AT_LEVEL && completedSince >= MIN_COMPLETED_WORKOUTS
}
