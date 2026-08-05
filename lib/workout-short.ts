import type { WorkoutProgram } from '@/lib/workout'

export interface ShortMove { name: string; note: string }

// Derives a genuine 5-10 minute version from whatever today's real workout
// already is — never a generic "light cardio" substitute. Used only when a
// dip is detected: the ask shrinks, but it's still HER plan, just smaller.
export function shortVersionFor(program: WorkoutProgram, dayIndex: number): ShortMove[] {
  if (program.track === 'home') {
    const day = program.home?.days[dayIndex]
    if (!day) return []
    return day.exercises.slice(0, 3).map((e) => ({ name: e.name, note: e.duration }))
  }
  const day = program.gymDays?.[dayIndex]
  if (!day) return []
  const moves: ShortMove[] = []
  if (day.supersets[0]) {
    moves.push({ name: day.supersets[0].push.name, note: day.supersets[0].reps })
    moves.push({ name: day.supersets[0].pull.name, note: day.supersets[0].reps })
  }
  if (day.ab?.upper) moves.push({ name: day.ab.upper.name, note: day.ab.scheme })
  return moves
}
