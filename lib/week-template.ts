// Her training week, by days available and how she likes to train
// (2026-10-29/30). Shared by the workout engine (lib/workout-assembly.ts)
// and the intake's "Where do you train?" screen, which shows the week live.
// Proven default (r/Fitness beginner routine, Fierce 5, PHUL, ACSM):
// full body for 2–3 days, upper/lower for 4, lower/upper/full/lower/upper
// for 5, push/pull/legs twice for 6.
//
// 2026-11-04 (Asa's new lifting styles, intake "How do you like to lift?"):
// - Compound movements (Recommended) → a compound day every day.
// - Classic strength, Intermediate/Advanced → two body groups a day
//   (Legs & Glutes, Chest & Triceps, Back & Biceps, Shoulders & Glutes), done
//   as supersets.
// - Classic strength, Beginner → the proven default above, straight sets.
export type DayKind = 'full' | 'upper' | 'lower' | 'push' | 'pull' | 'legs'
  | 'compound' | 'chest_tri' | 'back_bi' | 'shoulders_glutes' | 'chest_back'
export type TrainStyle = 'full' | 'split' | 'auto' | 'compound' | 'pairs'

export const DAY_TITLE: Record<DayKind, string> = {
  full: 'Full Body', upper: 'Upper Body', lower: 'Legs & Glutes', push: 'Chest, Shoulders & Triceps', pull: 'Back & Biceps', legs: 'Legs & Glutes',
  compound: 'Compound Movements', chest_tri: 'Chest & Triceps', back_bi: 'Back & Biceps', shoulders_glutes: 'Shoulders & Glutes', chest_back: 'Chest & Back',
}
export const DAY_SHORT: Record<DayKind, string> = {
  full: 'FULL', upper: 'UPPER', lower: 'LEGS', push: 'PUSH', pull: 'PULL', legs: 'LEGS',
  compound: 'COMPOUND', chest_tri: 'CHEST + TRI', back_bi: 'BACK + BI', shoulders_glutes: 'SHOULDERS + GLUTES', chest_back: 'CHEST + BACK',
}
const PAIRS: Record<number, DayKind[]> = {
  2: ['legs', 'chest_back'], 3: ['legs', 'chest_tri', 'back_bi'], 4: ['legs', 'chest_tri', 'shoulders_glutes', 'back_bi'],
  5: ['legs', 'chest_tri', 'back_bi', 'shoulders_glutes', 'legs'], 6: ['legs', 'chest_tri', 'back_bi', 'shoulders_glutes', 'legs', 'chest_back'],
}

export function weekTemplate(days: number, style: TrainStyle): DayKind[] {
  const d = Math.max(2, Math.min(6, Math.round(days) || 3))
  if (style === 'compound') return Array(d).fill('compound')
  if (style === 'pairs') return PAIRS[d]
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

/** Stored training_styles + level (1–3) → the week style. 'split' is Classic
 *  strength; anything else (compound, or an old 'none'/'cardio') is Compound
 *  movements, the recommended default. */
export function trainStyleFrom(styles: Iterable<string>, level: number): TrainStyle {
  const s = new Set(styles)
  if (s.has('split') && !s.has('compound')) return level >= 2 ? 'pairs' : 'auto'
  return 'compound'
}

/** Classic strength only for 'split'; everything else lifts compound. */
export const isClassicStyle = (styles: Iterable<string>) => { const s = new Set(styles); return s.has('split') && !s.has('compound') }
