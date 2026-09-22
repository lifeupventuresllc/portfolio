import type { WorkoutProgram } from '@/lib/workout'

export interface ShortMove { name: string; note: string }

// Derives a genuine, single move from whatever today's real workout already
// is — never a generic "light cardio" substitute, and never a menu. A dip is
// exactly when she has the least capacity to weigh options; the whole point
// of this card is one thing so small it can't be argued with (see the
// "reduce her input" / "one thing" standing rules). Real gap found live,
// 2026-09-22 (Asa's direct catch on the actual live card): this used to
// return up to 3 moves — a real dip-recovery step, but still a decision
// between two exercises, exactly the kind of choice a dip-day shouldn't ask
// her to make. Down to her single most important move: for a home day,
// whatever her real program lists first (already the anchor movement, same
// order the full workout plays it in); for a gym day, the push half of her
// first superset — the primary compound lift, not the accessory/pull side —
// falling back to her ab move only on the rare day a program has no
// superset at all.
export function shortVersionFor(program: WorkoutProgram, dayIndex: number): ShortMove[] {
  if (program.track === 'home') {
    const day = program.home?.days[dayIndex]
    const first = day?.exercises[0]
    return first ? [{ name: first.name, note: first.duration }] : []
  }
  const day = program.gymDays?.[dayIndex]
  if (!day) return []
  if (day.supersets[0]) return [{ name: day.supersets[0].push.name, note: day.supersets[0].reps }]
  if (day.ab?.upper) return [{ name: day.ab.upper.name, note: day.ab.scheme }]
  return []
}
