// Her training week, by days available and how she likes to train
// (2026-10-29/30). Shared by the workout engine (lib/workout-assembly.ts)
// and the intake's "Where do you train?" screen, which shows the week live.
// Proven default (r/Fitness beginner routine, Fierce 5, PHUL, ACSM):
// full body for 2–3 days, upper/lower for 4, lower/upper/full/lower/upper
// for 5, push/pull/legs twice for 6.
export type DayKind = 'full' | 'upper' | 'lower' | 'push' | 'pull' | 'legs'
export type TrainStyle = 'full' | 'split' | 'auto'

export const DAY_TITLE: Record<DayKind, string> = {
  full: 'Full Body', upper: 'Upper Body', lower: 'Legs & Glutes', push: 'Chest, Shoulders & Triceps', pull: 'Back & Biceps', legs: 'Legs & Glutes',
}
export const DAY_SHORT: Record<DayKind, string> = { full: 'FULL', upper: 'UPPER', lower: 'LEGS', push: 'PUSH', pull: 'PULL', legs: 'LEGS' }

export function weekTemplate(days: number, style: TrainStyle): DayKind[] {
  const d = Math.max(2, Math.min(6, Math.round(days) || 3))
  if (style === 'full') return Array(d).fill('full')
  const split: Record<number, DayKind[]> = {
    2: ['upper', 'lower'], 3: ['lower', 'upper', 'lower'], 4: ['upper', 'lower', 'upper', 'lower'],
    5: ['push', 'pull', 'legs', 'upper', 'lower'], 6: ['push', 'pull', 'legs', 'push', 'pull', 'legs'],
  }
  if (style === 'split') return split[d]
  if (d <= 3) return Array(d).fill('full')
  if (d === 5) return ['lower', 'upper', 'full', 'lower', 'upper']
  return split[d]
}

/** Stored training_styles → the week style. */
export function trainStyleFrom(styles: Iterable<string>): TrainStyle {
  const s = new Set(styles)
  return s.has('compound') ? 'full' : s.has('split') ? 'split' : 'auto'
}
