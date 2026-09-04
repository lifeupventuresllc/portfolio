import type { TrainingStyle } from './workout.types'

// Same bug shape as lib/goals.ts, found live 2026-09-04 while checking a beta
// tester's "can only select one workout style" report: the intake/preferences
// screen genuinely lets her pick multiple training styles ("pick all that
// apply" — Full body/compound, Split, Cardio-first), but every real generation
// call site read only `training_style` (styles[0], whichever she clicked
// first) and silently discarded the rest. Unlike goal, a training style isn't
// reduced to one derived label — 'compound' and 'cardio' each independently
// turn on a real behavior (a compound-move finisher, a bigger cardio block),
// so the real fix is a Set the assembly code checks with `.has()`, not a
// single winner.
const VALID: TrainingStyle[] = ['compound', 'split', 'cardio', 'none']
function isTrainingStyle(v: unknown): v is TrainingStyle {
  return typeof v === 'string' && (VALID as string[]).includes(v)
}

export function effectiveTrainingStyles(styles: string[] | null | undefined): Set<TrainingStyle> {
  const set = new Set((styles || []).filter(isTrainingStyle))
  set.delete('none')
  return set
}

// Reads training style(s) already stored in the DB (challenge_intake.form_data)
// back into the real set. Prefers the plural `training_styles` array (the
// actual source of truth for what she picked); falls back to the singular
// `training_style` column for rows written before the multi-select array
// existed, same "old row, new reader" fallback parseStoredGoal uses.
export function parseStoredTrainingStyles(stored: unknown, fallbackSingle: unknown): Set<TrainingStyle> {
  if (Array.isArray(stored) && stored.length) return effectiveTrainingStyles(stored as string[])
  return effectiveTrainingStyles(isTrainingStyle(fallbackSingle) ? [fallbackSingle] : [])
}
