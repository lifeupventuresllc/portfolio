// ============================================================
// Life-Up Fitness — Atomic exercise library (2026-09-01 rebuild)
//
// Asa's explicit directive: erase workout generation built on fixed,
// pre-written templates tied to category (location/skill/split), and
// replace it with a two-layer architecture. THIS is layer one — every
// exercise is a standalone atomic entry tagged with equipment, location
// suitability, muscle group, movement pattern, intensity, skill level,
// and duration. No exercise is ever bundled into a preset workout here;
// bundling happens live, per request, in lib/workout-assembly.ts (layer
// two), never in this file.
//
// The underlying exercise DATA (names, cues, form images, injury-avoid
// mappings) is real, curated content built over many sessions — this
// file doesn't re-author any of that, it re-tags it. GYM_POOL/AB_POOL/
// HOME_POOL/COMPOUND_POOL (workout-exercises.ts, compound-exercises.ts)
// stay as the source of truth for that content; TAG_* below is the one
// place the new attribute schema gets derived from their old category
// fields, so the judgment call lives in one reviewable spot instead of
// being hand-typed 150+ times with 150+ chances to slip.
// ============================================================
import { GYM_POOL, AB_POOL, HOME_POOL, isContraindicated, type Injury, type GymExercise, type AbExercise, type HomeExercise } from './workout-exercises'
import { COMPOUND_POOL, type CompoundExercise } from './compound-exercises'

export type Location = 'gym' | 'home'
export type EquipmentTag = 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'kettlebell' | 'bands' | 'bodyweight'
export type MuscleGroup =
  | 'glutes' | 'hamstrings' | 'quads' | 'calves'
  | 'back' | 'shoulders' | 'chest' | 'biceps' | 'triceps'
  | 'core' | 'full_body'
export type MovementPattern =
  | 'squat' | 'hinge' | 'lunge'
  | 'horizontal_push' | 'vertical_push'
  | 'horizontal_pull' | 'vertical_pull'
  | 'isolation' | 'core_flexion' | 'core_rotation' | 'core_stability'
  | 'compound' | 'cardio'
// Skill level is a STARTING point only — lib/progression.ts is the thing
// that actually moves it per user over time from logged set history. Never
// treat this field as the live truth for a returning user; it's the cold-
// start default before any real history exists.
export type SkillLevel = 1 | 2 | 3
// Separate axis from skill level (Asa's explicit distinction: "skill level
// and intensity are not static tags chosen once, they are dynamic states").
// baseIntensity here is the exercise's OWN inherent difficulty at a neutral
// effort; a user's live intensity STATE (lib/progression.ts) is what
// actually scales load/reps against this baseline, set by set.
export type IntensityLevel = 1 | 2 | 3 | 4 | 5

export interface AtomicExercise {
  id: string
  name: string
  equipment: EquipmentTag[]
  locations: Location[]
  muscleGroups: MuscleGroup[]
  movementPattern: MovementPattern
  skillLevel: SkillLevel
  baseIntensity: IntensityLevel
  durationSec: number
  cue: string
  imageUrl?: string
  freeWeight: boolean
  priority?: boolean
  postpartum?: boolean
}

const looseMuscle = (m: string): MuscleGroup => {
  const t = m.toLowerCase().replace(/\s+/g, '_')
  const known: MuscleGroup[] = ['glutes', 'hamstrings', 'quads', 'calves', 'back', 'shoulders', 'chest', 'biceps', 'triceps', 'core', 'full_body']
  return (known.includes(t as MuscleGroup) ? t : 'full_body') as MuscleGroup
}

// ---------- GYM_POOL → atomic ----------
function gymMovementPattern(e: GymExercise): MovementPattern {
  const n = e.name
  if (e.muscle === 'quads') return /lunge|step-up|split squat/i.test(n) ? 'lunge' : 'squat'
  if (e.muscle === 'glutes' || e.muscle === 'hamstrings') {
    if (/lunge/i.test(n)) return 'lunge'
    if (/kickback|donkey kick/i.test(n)) return 'isolation'
    return 'hinge'
  }
  if (e.muscle === 'calves') return 'isolation'
  if (e.muscle === 'back') return /pulldown|pull-up/i.test(n) ? 'vertical_pull' : 'horizontal_pull'
  if (e.muscle === 'shoulders') {
    if (e.movement === 'pull') return 'isolation' // rear delt work
    return /lateral|front raise/i.test(n) ? 'isolation' : 'vertical_push'
  }
  if (e.muscle === 'chest') return 'horizontal_push'
  return 'isolation' // biceps, triceps
}
const GYM_INTENSITY: Record<GymExercise['minLevel'], IntensityLevel> = { 1: 2, 2: 3, 3: 4 }
const gymAtomic: AtomicExercise[] = GYM_POOL.map((e) => ({
  id: `gym:${e.name}`,
  name: e.name,
  equipment: [e.equip],
  locations: e.equip === 'bodyweight' ? ['gym', 'home'] : ['gym'],
  muscleGroups: [e.muscle],
  movementPattern: gymMovementPattern(e),
  skillLevel: e.minLevel,
  baseIntensity: GYM_INTENSITY[e.minLevel],
  durationSec: e.free ? 45 : 35, // free-weight compound work runs longer per working set than machine/cable isolation
  cue: e.cue,
  imageUrl: e.imageUrl,
  freeWeight: e.free,
}))

// ---------- AB_POOL → atomic ----------
function abMovementPattern(e: AbExercise): MovementPattern {
  if (/bicycle|oblique|windmill|around the world|toe touch/i.test(e.name)) return 'core_rotation'
  if (/bird dog|dead bug|plank|march/i.test(e.name)) return 'core_stability'
  return 'core_flexion'
}
const AB_INTENSITY: Record<AbExercise['minLevel'], IntensityLevel> = { 1: 1, 2: 2, 3: 3 }
const abAtomic: AtomicExercise[] = AB_POOL.map((e) => {
  const isKb = e.name.startsWith('KB ')
  const equipment: EquipmentTag[] = isKb ? ['kettlebell'] : e.weighted ? ['dumbbell'] : ['bodyweight']
  return {
    id: `ab:${e.name}`,
    name: e.name,
    equipment,
    // A weighted/KB ab move needs equipment a home session doesn't assume
    // (same reasoning HOME_AB_PRIORITY already used) — gym-only. Every
    // plain bodyweight ab entry works anywhere.
    locations: equipment[0] === 'bodyweight' ? ['gym', 'home'] : ['gym'],
    muscleGroups: ['core'],
    movementPattern: abMovementPattern(e),
    skillLevel: e.minLevel,
    baseIntensity: AB_INTENSITY[e.minLevel],
    durationSec: 30,
    cue: e.cue,
    imageUrl: e.imageUrl,
    freeWeight: equipment[0] !== 'machine' && equipment[0] !== 'cable',
    priority: e.priority,
    postpartum: e.postpartum,
  }
})

// ---------- HOME_POOL → atomic ----------
function homeMovementPattern(e: HomeExercise): MovementPattern {
  if (e.type === 'cardio') return 'cardio'
  if (e.type === 'leg') return /lunge|step/i.test(e.name) ? 'lunge' : 'squat'
  if (e.type === 'core') return abMovementPattern({ name: e.name } as AbExercise)
  // type === 'upper'
  if (e.sub === 'chest') return 'horizontal_push'
  if (e.sub === 'back') return 'horizontal_pull'
  if (e.sub === 'shoulders') return /pike push-up/i.test(e.name) ? 'vertical_push' : 'isolation'
  return 'isolation' // sub === 'arms' or unlabeled
}
const HOME_INTENSITY: Record<HomeExercise['level'], IntensityLevel> = { 1: 1, 2: 2, 3: 3 }
const homeAtomic: AtomicExercise[] = HOME_POOL.map((e) => ({
  id: `home:${e.name}`,
  name: e.name,
  equipment: ['bodyweight'],
  // Bodyweight-only by construction (home track's entire premise) — works
  // anywhere, gym included, not just at home.
  locations: ['home', 'gym'],
  muscleGroups: e.type === 'leg' ? ['quads', 'glutes']
    : e.type === 'core' ? ['core']
    : e.type === 'cardio' ? ['full_body']
    : e.sub === 'chest' ? ['chest'] : e.sub === 'back' ? ['back'] : e.sub === 'shoulders' ? ['shoulders'] : ['biceps', 'triceps'],
  movementPattern: homeMovementPattern(e),
  skillLevel: e.level,
  baseIntensity: HOME_INTENSITY[e.level],
  durationSec: e.type === 'cardio' ? 45 : 30,
  cue: `Bodyweight — no equipment needed.`,
  imageUrl: e.imageUrl,
  freeWeight: true,
}))

// ---------- COMPOUND_POOL → atomic ----------
const COMPOUND_INTENSITY: Record<CompoundExercise['level'], IntensityLevel> = { 1: 3, 2: 4, 3: 5 }
const compoundAtomic: AtomicExercise[] = COMPOUND_POOL.map((e) => ({
  id: `compound:${e.name}`,
  name: e.name,
  equipment: [e.equip === 'banded' ? 'bands' : e.equip],
  locations: e.equip === 'bodyweight' ? ['gym', 'home'] : ['gym'],
  muscleGroups: e.muscles.map(looseMuscle),
  movementPattern: 'compound',
  skillLevel: e.level,
  baseIntensity: COMPOUND_INTENSITY[e.level],
  durationSec: 40,
  cue: e.cue,
  imageUrl: e.imageUrl,
  freeWeight: e.equip !== 'banded',
}))

// The one flat, atomic library — layer one, in full. Every downstream
// consumer (lib/workout-assembly.ts) reads ONLY from this array; nothing
// downstream is allowed to reach back into GYM_POOL/AB_POOL/HOME_POOL/
// COMPOUND_POOL directly, so there is exactly one place selection logic
// can pull from.
export const ATOMIC_LIBRARY: AtomicExercise[] = [...gymAtomic, ...abAtomic, ...homeAtomic, ...compoundAtomic]

export function isExerciseSafe(e: AtomicExercise, injuries: Injury[]): boolean {
  return !isContraindicated(e.name, injuries)
}
