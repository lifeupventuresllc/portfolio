// Exercise swaps — stay INSIDE Asa's system. A swap only ever offers another
// exercise from GYM_POOL that hits the SAME muscle in the SAME slot (push/pull),
// is at or below her level, and isn't ruled out by her injuries. Never invents
// a move, never leaves the program. Powers /api/plan/workout/swap + the UI menu.
import {
  GYM_POOL, isContraindicated,
  type GymExercise, type Level, type Movement, type Injury, type Muscle,
} from './workout-exercises'

// Legal alternatives for one slot: same muscle + movement, level-gated,
// injury-safe, excluding moves already used that day (no duplicates).
// Free-weight (★) options first, matching the generator's preference.
export function swapOptions(opts: {
  muscle: Muscle
  movement: Movement
  level: Level
  injuries: Injury[]
  excludeNames: string[]
}): GymExercise[] {
  const { muscle, movement, level, injuries, excludeNames } = opts
  return GYM_POOL
    .filter((e) =>
      e.muscle === muscle &&
      e.movement === movement &&
      e.minLevel <= level &&
      !isContraindicated(e.name, injuries) &&
      !excludeNames.includes(e.name))
    .sort((a, b) => (b.free ? 1 : 0) - (a.free ? 1 : 0))
}

// Look up a pool exercise by exact name (server-side validation of a swap).
export function findGymExercise(name: string): GymExercise | undefined {
  return GYM_POOL.find((e) => e.name === name)
}
