// ============================================================
// Life-Up Fitness — every muscle a move works (2026-11-09, Asa's rest rule)
//
// The library tags most moves with ONE muscle, and combo moves had none, so
// "Squat + Curl + Press" never counted as leg work. This reads the move's
// name, part by part, and returns ALL the muscles it works:
//   "Lunge + Curl + Press" → legs (quads, glutes, hamstrings) + biceps +
//   shoulders + triceps.
// Used by the rest rule (lib/rest-rule.ts) and when a set is logged.
// ============================================================
import { ATOMIC_LIBRARY, type MuscleGroup } from './exercise-library'

// Body groups the rest rule protects (biceps and triceps rest separately:
// a triceps day then a biceps day is fine). Core is left out on purpose: core is in
// every session (Asa, 2026-11-04).
export type BodyGroup = 'legs' | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
export const BODY_GROUP_LABEL: Record<BodyGroup, string> = { legs: 'Legs & glutes', chest: 'Chest', back: 'Back', shoulders: 'Shoulders', biceps: 'Biceps', triceps: 'Triceps' }
export const groupOf = (m: MuscleGroup): BodyGroup | null =>
  m === 'quads' || m === 'hamstrings' || m === 'glutes' || m === 'calves' ? 'legs'
    : m === 'chest' ? 'chest' : m === 'back' ? 'back' : m === 'shoulders' ? 'shoulders'
      : m === 'biceps' ? 'biceps' : m === 'triceps' ? 'triceps' : null

const LEGS: MuscleGroup[] = ['quads', 'glutes', 'hamstrings']
const FULL: MuscleGroup[] = ['quads', 'glutes', 'hamstrings', 'back', 'shoulders', 'chest', 'triceps', 'biceps', 'core']

// One part of a move's name → the muscles that part works. First match wins.
const RULES: [RegExp, MuscleGroup[]][] = [
  [/burpee|man maker|clean|snatch|thruster/i, FULL],
  [/leg raise|knee raise|knee tuck|hanging|flutter|scissor/i, ['core']],
  [/back extension|hyperextension|superman/i, ['back', 'glutes']],
  [/tricep|skull/i, ['triceps']],
  [/leg curl|hamstring curl|hammy|nordic/i, ['hamstrings']],
  [/leg extension/i, ['quads']],
  [/calf|calves|tibialis/i, ['calves']],
  [/leg press|hack squat|wall sit|squat|lunge|step[- ]?up|split|surrender|pistol|skater|jump/i, LEGS],
  [/deadlift|\brdl\b|good morning|swing|hinge/i, ['hamstrings', 'glutes', 'back']],
  [/hip thrust|bridge|glute|kickback|donkey|fire hydrant|abduct|clamshell/i, ['glutes', 'hamstrings']],
  [/upright row|high pull/i, ['shoulders', 'back']],
  [/reverse fly|rear delt|face pull|band pull|reverse pec deck/i, ['back', 'shoulders']],
  [/\bfly\b|pec deck/i, ['chest', 'shoulders']],
  [/pullover/i, ['back', 'chest']],
  [/row|pulldown|pull-?up|chin-?up|\blat\b/i, ['back', 'biceps']],
  [/bench|chest press|floor press|push-?up|chest dip/i, ['chest', 'triceps', 'shoulders']],
  [/shoulder press|overhead press|military|arnold|press out|\bpress\b/i, ['shoulders', 'triceps']],
  [/lateral raise|front raise|arm raise|\braise\b|shoulder tap/i, ['shoulders']],
  [/curl/i, ['biceps']],
  [/dip|extension/i, ['triceps']],
  [/plank|crunch|sit-?up|twist|woodchop|chop|dead ?bug|bird ?dog|leg raise|v-?up|toe touch|hollow|mountain|reach|march/i, ['core']],
]

const cache = new Map<string, MuscleGroup[]>()

/** Every muscle this move works, from its library tags and each part of its name. */
export function musclesWorked(name: string): MuscleGroup[] {
  const hit = cache.get(name)
  if (hit) return hit
  const out = new Set<MuscleGroup>()
  for (const m of ATOMIC_LIBRARY.find((e) => e.name === name)?.muscleGroups || []) if (m !== 'full_body') out.add(m)
  for (const part of name.split(/\s*(?:\+|\/| to | into )\s*/i)) {
    const rule = RULES.find(([re]) => re.test(part))
    if (rule) rule[1].forEach((m) => out.add(m))
  }
  if (/full body/i.test(name)) FULL.forEach((m) => out.add(m))
  const list = Array.from(out)
  cache.set(name, list)
  return list
}

/** The body groups (legs, chest, back, shoulders, arms) a move works. */
export function groupsWorked(name: string): BodyGroup[] {
  return Array.from(new Set(musclesWorked(name).map(groupOf).filter((g): g is BodyGroup => !!g)))
}
