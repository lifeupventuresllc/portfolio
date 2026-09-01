// ============================================================
// Life-Up Fitness — Dynamic workout assembly engine (2026-09-01 rebuild)
//
// Layer two of Asa's directive. Never retrieves a whole pre-made workout —
// on every call, reads live constraints (location, equipment, time, goal,
// skill level, target muscles, injuries) and assembles a session by
// filtering + combining matching entries from lib/exercise-library.ts's
// ATOMIC_LIBRARY. No SLOT_SETS, no ROTATION_CYCLE, no per-area DaySpec
// tables, no separate gym-pool/home-pool special-casing — one generic
// path, driven by attribute matching, for any combination of constraints.
//
// The one place a fixed POLICY still exists is which muscle clusters a
// week's untargeted days rotate through (legsMuscleRotation below) — that's
// standard training-science sequencing (PPL-style antagonist rotation,
// legs ~2x/week for the app's target avatar), not a pre-written scenario;
// it decides WHICH MUSCLES a day targets, never which EXACT EXERCISES fill
// it. Exercise selection itself is 100% attribute-matched, every time.
// ============================================================
import { ATOMIC_LIBRARY, isExerciseSafe, type AtomicExercise, type Location, type EquipmentTag, type MuscleGroup, type SkillLevel, type MovementPattern, type IntensityLevel } from './exercise-library'
import type { Injury, Equip, Muscle } from './workout-exercises'
import { injuryNotes } from './workout-exercises'
import { compoundExercisesForLevel } from './compound-exercises'
import type {
  WorkoutInputs, WorkoutProgram, GymDay, HomeDay, Superset, CardioFinisher, FocusArea,
} from './workout.types'

const LEVEL_LABEL: Record<SkillLevel, string> = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' }
export const GOAL_LABEL: Record<WorkoutInputs['goal'], string> = { lose: 'Fat Loss', gain: 'Muscle Gain', maintain: 'Maintain' }

const FOCUS_MUSCLES: Record<FocusArea, MuscleGroup[]> = {
  legs: ['quads', 'hamstrings', 'glutes'],
  arms: ['biceps', 'triceps'],
  chest: ['chest'],
  back: ['back'],
  shoulders: ['shoulders'],
  // Empty, deliberately — core isn't a superset-fillable target muscle the
  // way legs/chest/back are; it's handled entirely through the separate
  // ab/core picking path (pickAbAtomic), same as the pre-rebuild version's
  // FOCUS_TARGETS.core. Mapping it to ['core'] here was a real bug caught
  // in testing: it made a "core only" request's overrideMuscles non-empty,
  // so isCoreOnly's `overrideMuscles.length === 0` check never fired, and
  // buildGymDay still tried to fill push/pull supersets from a muscle no
  // gym-sourced exercise is ever tagged with — reproducing the exact old
  // "Core · Full Body still has full-body supersets" bug this architecture
  // was supposed to kill outright.
  core: [],
  overall: [],
}
export const FOCUS_LABEL: Record<FocusArea, string> = {
  core: 'Core & waistline', legs: 'Legs & glutes', arms: 'Arms', chest: 'Chest', back: 'Back', shoulders: 'Shoulders', overall: 'All-over',
}

// Standard PPL-style antagonist rotation, legs-forward for a 4-day cycle
// (the app's real target avatar) — a training-science SEQUENCING policy,
// not an exercise template. Decides which muscle groups a day targets;
// which exact exercises fill it is always attribute-matched below.
const ROTATION_CLUSTERS: Record<'male' | 'female', MuscleGroup[][]> = {
  male: [
    ['quads', 'hamstrings', 'glutes'],
    ['chest', 'triceps', 'shoulders'],
    ['back', 'biceps'],
  ],
  female: [
    ['quads', 'hamstrings', 'glutes'],
    ['chest', 'triceps', 'shoulders'],
    ['quads', 'hamstrings', 'glutes'],
    ['back', 'biceps'],
  ],
}

export function rotate<T>(arr: T[], n: number): T[] {
  if (!arr.length) return arr
  const k = ((n % arr.length) + arr.length) % arr.length
  return arr.slice(k).concat(arr.slice(0, k))
}

function derivePushPull(e: AtomicExercise): 'push' | 'pull' {
  if (['squat', 'lunge', 'horizontal_push', 'vertical_push'].includes(e.movementPattern)) return 'push'
  if (['hinge', 'horizontal_pull', 'vertical_pull'].includes(e.movementPattern)) return 'pull'
  if (e.movementPattern === 'isolation') {
    if (e.muscleGroups.includes('biceps')) return 'pull'
    if (/rear delt|face pull|pec deck/i.test(e.name)) return 'pull'
    return 'push' // triceps, calves, front/lateral shoulder work
  }
  return 'push' // compound
}

// Legacy shim so the existing GymDay/Superset shape (and every downstream
// consumer — WorkoutPlayer, WorkoutView, workout-pdf, workout-steps) keeps
// working unchanged: `movement`/`muscle`/`minLevel`/`equip`/`free` are
// derived FROM the atomic entry's real tags, not a second source of truth.
// `overrides` is optional so pickAb/other gym-shim call sites that never
// deal with progression state (nothing core-related tracks a movement
// pattern intensity yet) don't have to pass it. A real, visible surface
// for layer three's intensity axis, not just an invisible filter effect —
// she SEES why a set got scaled, not just experiences it.
function toGymExerciseShim(e: AtomicExercise, overrides?: Constraints['progressionOverrides']) {
  const intensity = overrides?.[e.movementPattern]?.intensityLevel
  const intensityCue = intensity === 5 ? ' You’ve been crushing this movement lately — push the top of your range.'
    : intensity === 1 ? ' Easing the intensity here based on your recent sets — controlled reps, no rush.'
    : ''
  return {
    // Casts are safe by construction, not by hope: this is only ever called
    // on picks drawn from a gym-superset-eligible pool (buildGymDay filters
    // out core/cardio patterns before picking), so equipment[0]/muscleGroups[0]
    // are always within Equip's 5 values / Muscle's 9 values — AtomicExercise's
    // WIDER unions (kettlebell, bands, core, full_body) never reach here.
    name: e.name, equip: e.equipment[0] as Equip, free: e.freeWeight,
    movement: derivePushPull(e), muscle: e.muscleGroups[0] as Muscle, minLevel: e.skillLevel,
    cue: e.cue + intensityCue, imageUrl: e.imageUrl,
  }
}
function toAbExerciseShim(e: AtomicExercise) {
  return {
    name: e.name,
    zone: (e.movementPattern === 'core_flexion' || e.name.includes('Sit-Up') || e.name.includes('Crunch')) ? 'upper' as const : 'lower' as const,
    minLevel: e.skillLevel, weighted: e.equipment[0] !== 'bodyweight', priority: e.priority, postpartum: e.postpartum,
    cue: e.cue, imageUrl: e.imageUrl,
  }
}

interface Constraints {
  location: Location
  equipment?: EquipmentTag[]
  skillLevel: SkillLevel
  injuries: Injury[]
  postpartum: boolean
  // Layer three (lib/progression.ts) — per-movement-pattern live skill/
  // intensity, computed from real logged set-effort history. When a
  // pattern isn't here, filterLibrary falls back to the flat `skillLevel`
  // above exactly as it did before progression memory existed.
  progressionOverrides?: Partial<Record<MovementPattern, { skillLevel: SkillLevel; intensityLevel: IntensityLevel }>>
}

// Ab/core picking, generalized off the same attribute-matching `pick()`
// every other selection routes through — 'gym' as the location filter is
// deliberate, not a bug: it's the SUPERSET of every core-tagged atomic
// entry (bodyweight core work is tagged for both locations; weighted/KB
// core work is gym-only), matching the old AB_POOL's own track-agnostic
// behavior exactly. Exported (and re-exported from workout.ts) for
// lib/cardio-session.ts's standalone on-demand cardio-swap builder, which
// needs the exact same zone/level/postpartum/injury-safe ab pick this
// engine uses internally.
function pickAbAtomic(zone: 'upper' | 'lower', level: SkillLevel, offset: number, postpartum: boolean, injuries: Injury[], excludeNames: string[] = []): AtomicExercise {
  const pool = filterLibrary({ location: 'gym', skillLevel: level, injuries, postpartum }, ['core'])
  const zonePool = pool.filter((e) => zone === 'upper' ? (e.movementPattern === 'core_flexion' || e.movementPattern === 'core_rotation') : (e.movementPattern === 'core_stability' || e.movementPattern === 'core_flexion'))
  return pick(zonePool.length ? zonePool : pool, [], 1, offset, postpartum, excludeNames)[0]
}
export function pickAb(zone: 'upper' | 'lower', level: SkillLevel, offset: number, postpartum = false, injuries: Injury[] = [], excludeNames: string[] = []) {
  return toAbExerciseShim(pickAbAtomic(zone, level, offset, postpartum, injuries, excludeNames))
}

// Real gap this closes: `e.skillLevel <= c.skillLevel` used to gate every
// exercise by ONE flat number for the whole session — her intake level,
// chosen once, never moving. `effectiveSkill` looks up whether she has
// real logged history for THIS exercise's specific movement pattern
// (lib/progression.ts) and gates by THAT instead when present — so a
// member who's been logging consistent "easy" squats gets access to
// harder squat-pattern exercises automatically, while her overhead-press
// pattern (no history yet, or a recent "hard" streak) stays gated at her
// baseline. This is what "progressive overload happens automatically
// within the attribute-matching logic itself" actually means in code.
function filterLibrary(c: Constraints, muscles?: MuscleGroup[]): AtomicExercise[] {
  return ATOMIC_LIBRARY.filter((e) => {
    const effectiveSkill = c.progressionOverrides?.[e.movementPattern]?.skillLevel ?? c.skillLevel
    return e.locations.includes(c.location) &&
      e.skillLevel <= effectiveSkill &&
      isExerciseSafe(e, c.injuries) &&
      (!c.equipment || e.equipment.some((eq) => c.equipment!.includes(eq))) &&
      (!muscles || muscles.length === 0 || e.muscleGroups.some((m) => muscles.includes(m)))
  })
}

// The one real picker every selection in this file routes through — target
// muscles first (rotated for weekly variety), then whatever else is
// available in-constraint, free weights preferred, priority-tagged and
// postpartum-flagged entries surfaced first when relevant. Replaces
// pickGym/pickAb/HOME_POOL's byType entirely: one function, attribute-
// driven, works for gym or home, any muscle set, any movement pattern.
function pick(pool: AtomicExercise[], targetMuscles: MuscleGroup[], count: number, offset: number, postpartum: boolean, excludeNames: string[] = []): AtomicExercise[] {
  const fresh = pool.filter((e) => !excludeNames.includes(e.name))
  // Real bug caught in testing: a plain non-postpartum request was still
  // surfacing postpartum-flagged entries first, purely because they also
  // happen to carry `priority: true` — the old pickAb deliberately reserved
  // those for postpartum members specifically (`priority.filter(a =>
  // !a.postpartum)` when not postpartum), and this generic picker had no
  // equivalent exclusion. `effectivePriority` folds that in once, here,
  // rather than re-adding a special case at every call site.
  const effectivePriority = (e: AtomicExercise) => e.priority && (postpartum || !e.postpartum)
  const sortFn = (a: AtomicExercise, b: AtomicExercise) => {
    if (postpartum && a.postpartum !== b.postpartum) return a.postpartum ? -1 : 1
    const ap = effectivePriority(a) ? 1 : 0, bp = effectivePriority(b) ? 1 : 0
    if (ap !== bp) return bp - ap
    const at = targetMuscles.some((m) => a.muscleGroups.includes(m)) ? 1 : 0
    const bt = targetMuscles.some((m) => b.muscleGroups.includes(m)) ? 1 : 0
    if (at !== bt) return bt - at
    return a.freeWeight === b.freeWeight ? 0 : a.freeWeight ? -1 : 1
  }
  const ranked = rotate([...fresh].sort(sortFn), offset)
  if (ranked.length >= count) return ranked.slice(0, count)
  // Ran out of fresh options at this exact filter — fall back to the full
  // pool (still injury/skill/location-safe) rather than return short.
  return ranked.concat(rotate([...pool].sort(sortFn), offset)).slice(0, count)
}

const CARDIO_MIN_ADJUST: Record<string, number> = { lose: 5, gain: -5, maintain: 0 }
function walkFinisher(level: SkillLevel, goal: string): CardioFinisher {
  const base = level === 1 ? { incline: '0–2.5%', minLow: 15, minHigh: 20 } : level === 2 ? { incline: '2.5–3.0%', minLow: 20, minHigh: 25 } : { incline: '3.0–4.0%', minLow: 25, minHigh: 30 }
  const adjust = CARDIO_MIN_ADJUST[goal] ?? 0
  const mins = `${Math.max(10, base.minLow + adjust)}–${Math.max(15, base.minHigh + adjust)} min`
  const note = goal === 'lose' ? 'Your fat-burning finisher — walk tall, shoulders back, no handrails.'
    : goal === 'gain' ? 'Keeps heart rate up without burning muscle — walk tall, no handrails.'
    : 'Steady-state to hold where you\'re at — walk tall, shoulders back, no handrails.'
  return { title: 'Incline Treadmill Walk', mode: 'walk', speed: '3.3 mph (fixed)', incline: base.incline, mins, note }
}
function cardioFinisherFor(level: SkillLevel, goal: string, trainingStyle: WorkoutInputs['trainingStyle'], injuries: Injury[], offset: number): CardioFinisher {
  if (trainingStyle === 'compound') {
    const pool = compoundExercisesForLevel(level, injuries)
    const moves = rotate(pool, offset).slice(0, 3).map((m) => ({ name: m.name, reps: m.reps, cue: m.cue, imageUrl: m.imageUrl }))
    return { title: 'Compound Finisher', mode: 'compound', note: 'Full-body compound moves to close out your session — built in because that’s your training style.', moves }
  }
  return walkFinisher(level, goal)
}

const AB_SCHEME: Record<SkillLevel, string> = { 1: '2 sets × 8–12', 2: '2–3 sets × 12–15', 3: '3–4 sets × 15+ (add weight)' }
const REP_SCHEME: Record<SkillLevel, Record<WorkoutInputs['goal'], string>> = {
  1: { lose: '3 × 12–15 (short rest)', gain: '3 × 8–10', maintain: '2 × 10–12' },
  2: { lose: '3 × 18 / 15 / 12 (short rest)', gain: '4 × 10 / 8 / 8', maintain: '3 × 15 / 12 / 10' },
  3: { lose: '4 × 20 / 15 / 12 / 12 (short rest)', gain: '4 × 10 / 8 / 6 / 6', maintain: '3 × 20 / 15 / 12' },
}
const repScheme = (level: SkillLevel, goal: WorkoutInputs['goal']) => REP_SCHEME[level][goal] || REP_SCHEME[level].maintain

// Time-aware count: how many exercises actually fit the minutes she has,
// derived from each pick's own real durationSec tag (× ~2.3 for
// sets+rest) — a genuine new capability the old fixed-count templates
// never had (they always built ~6-8 exercises regardless of a stated time
// budget; the operator route could only crudely SLICE the result after
// the fact). Falls back to a level-appropriate default when no time was
// stated.
function countForMinutes(minutesAvailable: number | undefined, avgDurationSec: number, fallback: number): number {
  if (!minutesAvailable) return fallback
  // Real bug caught in testing: capping at `fallback + 2` regardless of how
  // much time was actually stated made a 15-minute and a 60-minute request
  // land on the exact same exercise count the moment the raw time-based
  // estimate exceeded that small fixed ceiling — the cap swallowed the
  // signal instead of scaling with it. `fallback * 2` still keeps a longer
  // session from ballooning unreasonably, but a real hour genuinely gets
  // more content than a real 15 minutes now, not the same amount either way.
  const perExerciseMin = (avgDurationSec * 2.3) / 60
  return Math.max(2, Math.min(fallback * 2, Math.round(minutesAvailable / perExerciseMin)))
}

function buildGymDay(dayNum: number, targetMuscles: MuscleGroup[], title: string, c: Constraints, goal: WorkoutInputs['goal'], offset: number, minutesAvailable: number | undefined, coreFocus: boolean, trainingStyle: WorkoutInputs['trainingStyle'], coreOnly = false): GymDay {
  const isFullBody = targetMuscles.length === 0 && !coreOnly
  const bodyMuscles: MuscleGroup[] = isFullBody ? ['quads', 'hamstrings', 'glutes', 'chest', 'back', 'shoulders', 'biceps', 'triceps'] : targetMuscles
  // A genuine core-only request skips body-area supersets entirely — real
  // gap the pre-rebuild version fixed once already ("make me an ab workout
  // only" came back titled "Core · Full Body" with full-body supersets
  // still riding along underneath): coreOnly forces bodyMuscles to [] here
  // regardless of the isFullBody fallback above, so nothing gets picked.
  const supersetPool = coreOnly ? [] : filterLibrary(c, bodyMuscles).filter((e) => e.movementPattern !== 'core_flexion' && e.movementPattern !== 'core_rotation' && e.movementPattern !== 'core_stability' && e.movementPattern !== 'cardio')
  const baseCount = isFullBody ? 6 : Math.min(8, bodyMuscles.length * 2)
  const count = countForMinutes(minutesAvailable, 45, baseCount)
  const picked = coreOnly ? [] : pick(supersetPool, bodyMuscles, count, offset, c.postpartum)

  const supersets: Superset[] = []
  for (let i = 0; i + 1 < picked.length; i += 2) {
    const a = picked[i], b = picked[i + 1]
    supersets.push({ title: `${a.name} + ${b.name}`, push: toGymExerciseShim(a, c.progressionOverrides), pull: toGymExerciseShim(b, c.progressionOverrides), reps: repScheme(c.skillLevel, goal) })
  }
  const leftover = picked.length % 2 === 1 ? picked[picked.length - 1] : null

  const upperAb = pickAbAtomic('upper', c.skillLevel, offset, c.postpartum, c.injuries)
  const lowerAb = pickAbAtomic('lower', c.skillLevel, offset + 2, c.postpartum, c.injuries, [upperAb?.name].filter((n): n is string => !!n))
  const usedAbNames = [upperAb?.name, lowerAb?.name].filter((n): n is string => !!n)
  let bonusAb: AtomicExercise | undefined
  if (coreFocus) { bonusAb = pickAbAtomic('upper', c.skillLevel, offset + 5, c.postpartum, c.injuries, usedAbNames); usedAbNames.push(bonusAb.name) }

  const wantsLegAccessory = bodyMuscles.some((m) => m === 'quads' || m === 'hamstrings' || m === 'glutes' || m === 'calves')
  const calfPool = filterLibrary(c, ['calves'])
  // A real core-only day has zero superset content, so — same fix as the
  // pre-rebuild version — it gets two MORE real ab picks here instead,
  // making it an actually substantial session rather than 2-3 exercises
  // total for something she explicitly asked for.
  const coreOnlyExtras = coreOnly ? (() => {
    const extraUpper = pickAbAtomic('upper', c.skillLevel, offset + 8, c.postpartum, c.injuries, usedAbNames)
    const extraLower = pickAbAtomic('lower', c.skillLevel, offset + 9, c.postpartum, c.injuries, [...usedAbNames, extraUpper.name])
    return [extraUpper, extraLower].map((e) => ({ name: e.name, reps: AB_SCHEME[c.skillLevel], cue: e.cue, imageUrl: e.imageUrl }))
  })() : []
  const accessory: GymDay['accessory'] = [
    ...(wantsLegAccessory ? calfPool.slice(0, 2).map((e) => ({ name: e.name, reps: c.skillLevel === 1 ? '2 × 15–20' : '3 × 15–20', cue: e.cue, imageUrl: e.imageUrl })) : []),
    ...(leftover ? [{ name: leftover.name, reps: repScheme(c.skillLevel, goal), cue: `${leftover.cue} (bonus set from today's session).`, imageUrl: leftover.imageUrl }] : []),
    ...coreOnlyExtras,
  ]

  return {
    dayNum, title, muscles: coreOnly ? ['Core'] : isFullBody ? ['Full Body'] : bodyMuscles.map((m) => m[0].toUpperCase() + m.slice(1)),
    warmup: bodyMuscles.includes('quads') || isFullBody ? ['15 bodyweight glute bridges', '10 hip circles each side', '10 arm circles', '10 leg swings each side'] : ['10 arm circles each direction', '10 shoulder rolls', '10 doorway chest stretches', '10 band pull-aparts'],
    supersets, accessory,
    ab: { upper: toAbExerciseShim(upperAb), lower: toAbExerciseShim(lowerAb), scheme: AB_SCHEME[c.skillLevel], ...(bonusAb ? { bonus: toAbExerciseShim(bonusAb) } : {}) },
    cardio: cardioFinisherFor(c.skillLevel, goal, trainingStyle, c.injuries, offset),
  }
}

const HOME_MET: Record<SkillLevel, number> = { 1: 3.2, 2: 4.5, 3: 6.5 }
function mifflinBMR(weightLb: number, heightIn: number, age: number, sex?: WorkoutInputs['sex']): number {
  const kg = weightLb * 0.453592, cm = heightIn * 2.54
  const base = 10 * kg + 6.25 * cm - 5 * age
  return sex === 'male' ? base + 5 : base - 161
}
function estimateHomeCalories(inp: WorkoutInputs, level: SkillLevel, minutesLabel: string): number | undefined {
  if (!inp.weightLb || !inp.heightIn || !inp.age) return undefined
  const minutes = parseInt(minutesLabel, 10) || 20
  const bmr = mifflinBMR(inp.weightLb, inp.heightIn, inp.age, inp.sex)
  return Math.round(HOME_MET[level] * (bmr / 24) * (minutes / 60))
}

function buildHomeDay(dayNum: number, targetMuscles: MuscleGroup[], title: string, c: Constraints, goal: WorkoutInputs['goal'], offset: number, minutesAvailable: number | undefined, coreFocus: boolean, coreOnly = false): HomeDay {
  const isFullBody = targetMuscles.length === 0 && !coreOnly
  const wantsCore = coreFocus || isFullBody || coreOnly
  const nonCorePool = coreOnly ? [] : filterLibrary(c, isFullBody ? undefined : targetMuscles).filter((e) => e.movementPattern !== 'cardio' && e.movementPattern !== 'core_flexion' && e.movementPattern !== 'core_rotation' && e.movementPattern !== 'core_stability')
  const corePool = filterLibrary(c, ['core'])
  const cardioPool = filterLibrary(c).filter((e) => e.movementPattern === 'cardio')

  const baseCount = 5
  const count = countForMinutes(minutesAvailable, 30, baseCount)
  // A real core-only day is ALL core (same substantial-session fix as the
  // gym side) rather than the normal 2-3-of-N split.
  const coreCount = coreOnly ? count : wantsCore ? (coreFocus ? 3 : 2) : 0
  const mainCount = coreOnly ? 0 : Math.max(2, count - coreCount)

  // Real bug caught in testing: a genuine full-body day (targetMuscles=[])
  // has no target-muscle bias to sort by, so a single undifferentiated pick
  // could come back with zero leg work purely from pool-order luck — the
  // exact "an 'overall' session could have zero upper-body work" class of
  // bug the pre-rebuild version already fixed once for home, reintroduced
  // here by the new generic picker not knowing about the leg/upper split.
  // Splitting the count evenly between a real leg pool and a real upper
  // pool guarantees an actual mix every time, same fix, same reasoning.
  const LEG_MUSCLES: MuscleGroup[] = ['quads', 'hamstrings', 'glutes', 'calves']
  const UPPER_MUSCLES: MuscleGroup[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps']
  const main = isFullBody
    ? (() => {
        const legCount = Math.ceil(mainCount / 2), upperCount = mainCount - legCount
        const legPool = nonCorePool.filter((e) => e.muscleGroups.some((m) => LEG_MUSCLES.includes(m)))
        const upperPool = nonCorePool.filter((e) => e.muscleGroups.some((m) => UPPER_MUSCLES.includes(m)))
        return [...pick(legPool.length ? legPool : nonCorePool, [], legCount, offset, c.postpartum), ...pick(upperPool.length ? upperPool : nonCorePool, [], upperCount, offset + 3, c.postpartum)]
      })()
    : pick(nonCorePool, targetMuscles, mainCount, offset, c.postpartum)
  const core = wantsCore ? pick(corePool, [], coreCount, offset + 4, c.postpartum) : []
  const finisher = pick(cardioPool, [], 1, offset + 8, c.postpartum)[0]

  const exercises = [...main, ...core].map((e) => ({ name: e.name, duration: '30 sec', imageUrl: e.imageUrl }))
  if (finisher) exercises.push({ name: finisher.name, duration: `${goal === 'lose' ? 90 : goal === 'gain' ? 45 : 60} sec`, imageUrl: finisher.imageUrl })

  return { dayNum, title, exercises }
}

export function generateProgram(inp: WorkoutInputs): WorkoutProgram {
  const level = inp.level as SkillLevel
  const week = inp.weekNumber || 1
  const injuries = inp.injuries || []
  const location: Location = inp.track
  const c: Constraints = { location, skillLevel: level, injuries, postpartum: !!inp.postpartum, progressionOverrides: inp.progressionOverrides }
  const days = Math.min(Math.max(Math.round(inp.daysPerWeek || 3), 1), 6)
  const coreFocus = inp.focusArea === 'core' || !!inp.overrideAreas?.includes('core')

  // Which muscles day 0 targets: a live chat/override ask always wins for
  // "today." Every OTHER day (a full-week build with no live override)
  // rotates through the standard cluster policy — see ROTATION_CLUSTERS'
  // comment for why this one rotation stays as a sequencing policy, not an
  // exercise template.
  const overrideMuscles: MuscleGroup[] | undefined = inp.overrideAreas !== undefined
    ? inp.overrideAreas.flatMap((a) => FOCUS_MUSCLES[a])
    : undefined
  const cluster = level === 1 ? [[]] : ROTATION_CLUSTERS[inp.sex === 'male' ? 'male' : 'female']

  const base: WorkoutProgram = {
    name: inp.name || 'Your', track: inp.track, level, levelLabel: LEVEL_LABEL[level], goal: inp.goal,
    weekNumber: week, daysPerWeek: days,
  }
  base.injuryNotes = injuryNotes(injuries)
  if (inp.targets && inp.targets.length) base.targetNote = inp.targets.map((m) => m[0].toUpperCase() + m.slice(1)).join(' · ')
  else if (inp.focusArea && inp.focusArea !== 'overall') base.targetNote = FOCUS_LABEL[inp.focusArea]

  const dayMuscles = (i: number): MuscleGroup[] => (i === 0 && overrideMuscles !== undefined) ? overrideMuscles : cluster[i % cluster.length]
  const dayTitle = (i: number, muscles: MuscleGroup[]): string => {
    if (i === 0 && inp.overrideAreas !== undefined) {
      const areas = inp.overrideAreas
      const label = areas.map((a) => a === 'core' ? 'Core' : a === 'overall' ? 'Full Body' : a[0].toUpperCase() + a.slice(1)).join(' + ')
      return label || 'Full Body'
    }
    if (!muscles.length) return 'Full Body'
    if (muscles.includes('quads')) return 'Legs · Quads, Hamstrings & Glutes'
    if (muscles.includes('chest')) return 'Push · Chest & Triceps'
    return 'Pull · Shoulders & Back'
  }

  if (inp.track === 'home') {
    const homeDays: HomeDay[] = Array.from({ length: days }, (_, i) => {
      const muscles = dayMuscles(i)
      const isCoreOnly = i === 0 && overrideMuscles !== undefined && overrideMuscles.length === 0 && inp.overrideAreas?.includes('core')
      const day = buildHomeDay(i + 1, isCoreOnly ? [] : muscles, `Day ${i + 1}: ${dayTitle(i, muscles)}`, c, inp.goal, week + i, i === 0 ? inp.minutesAvailable : undefined, coreFocus && i === 0, isCoreOnly)
      return day
    })
    const minutes = level === 1 && week <= 1 ? '20 min' : '15 min'
    const estCalories = estimateHomeCalories(inp, level, minutes)
    base.home = {
      minutes, warmup: ['Arm Circles (fwd/back) – 60 sec', 'Torso Twists – 60 sec', 'Leg Swings / Hip Circles – 60 sec'],
      days: homeDays.map((d) => ({ ...d, estCalories })),
      cooldown: ['Toe Touches (Hamstrings) – 60 sec', 'Cross-Body Arm Stretch – 60 sec', 'Quad Stretch – 60 sec'],
      walking: level === 1 ? '15–20 min easy walk, 3–4×/week' : level === 2 ? '25–30 min brisk walk or 20 min with 1-min faster intervals, 4×/week' : '30–40 min power walk with 30-sec fast intervals every 3 min, 4–5×/week',
      estCaloriesTotal: estCalories !== undefined ? estCalories * homeDays.length : undefined,
    }
  } else {
    base.gymDays = Array.from({ length: days }, (_, i) => {
      const muscles = dayMuscles(i)
      const isCoreOnly = i === 0 && overrideMuscles !== undefined && overrideMuscles.length === 0 && inp.overrideAreas?.includes('core')
      return buildGymDay(i + 1, isCoreOnly ? [] : muscles, dayTitle(i, muscles), c, inp.goal, week + i, i === 0 ? inp.minutesAvailable : undefined, coreFocus && i === 0, inp.trainingStyle, isCoreOnly)
    })
  }
  return base
}
