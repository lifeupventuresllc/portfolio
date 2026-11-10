// ============================================================
// Life-Up Fitness — what she grabs for each move (2026-11-10, Asa)
//
// "The user should know if it's weighted or not": every move on the workout
// screen gets one small tag — Dumbbells, Kettlebell, Barbell, Machine, Band,
// or No weights. Also decides her dumbbell / kettlebell days:
//   - gym: days switch between dumbbell and kettlebell (gyms have both)
//   - home: dumbbells, or both if she said she has kettlebells at home
//   - "Switch" on the workout screen: that kind only, today only
// ============================================================
import { COMBO_MOVES, type ComboWeight } from './combo-moves'
import { ATOMIC_LIBRARY } from './exercise-library'
import type { WorkoutInputs, GymDay, HomeDay } from './workout.types'

export type WeightTag = 'Dumbbells' | 'Kettlebell' | 'Barbell' | 'Machine' | 'Band' | 'No weights'

/** The one tag for a move, or null when we don't know the move (treadmill, warm-up lines). */
export function weightLabel(name: string): WeightTag | null {
  const combo = COMBO_MOVES.find((m) => m.name === name)
  if (combo) return combo.weight === 'kettlebell' ? 'Kettlebell' : 'Dumbbells'
  const e = ATOMIC_LIBRARY.find((x) => x.name === name)
  if (!e) return /treadmill|bike|rower|stair|elliptical/i.test(name) ? 'Machine' : null
  const eq = e.equipment
  if (eq.includes('kettlebell') || /^KB /.test(name)) return 'Kettlebell'
  if (eq.includes('barbell')) return 'Barbell'
  if (eq.includes('dumbbell')) return 'Dumbbells'
  if (eq.includes('cable') || eq.includes('machine')) return 'Machine'
  if (eq.includes('bands')) return 'Band'
  if (eq.includes('bodyweight')) return 'No weights'
  return null
}

/** What weights to build her compound days with today. */
export function weightsFor(formData: { home_kettlebells?: boolean } | null | undefined, track: 'gym' | 'home', todayOverride?: ComboWeight): WorkoutInputs['weights'] {
  if (todayOverride) return todayOverride
  if (track === 'home') return formData?.home_kettlebells ? 'both' : 'dumbbell'
  return undefined // gym: alternate dumbbell / kettlebell days
}

/** Is this a dumbbell day or a kettlebell day? null when the day has no combo moves. */
export function dayWeight(day: GymDay | HomeDay | undefined): ComboWeight | null {
  if (!day) return null
  const names = 'exercises' in day ? day.exercises.map((x) => x.name) : [...(day.accessory || []).map((x) => x.name)]
  const kinds = names.map((n) => COMBO_MOVES.find((m) => m.name === n)?.weight).filter(Boolean) as ComboWeight[]
  if (!kinds.length) return null
  return kinds.filter((k) => k === 'kettlebell').length * 2 >= kinds.length ? 'kettlebell' : 'dumbbell'
}
