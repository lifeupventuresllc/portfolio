// ============================================================
// Life-Up Fitness — Workout generator
// Builds a weekly program (gym push/pull OR home bodyweight)
// from client level + goal + days. Free-weights-first,
// level-gated, push/pull supersets, ab circuit, cardio, calves.
// Deterministic by weekNumber (same week = same plan, weeks vary).
// ============================================================
import {
  GYM_POOL, AB_POOL, WARMUPS, cardioFinisher, HOME_POOL, HOME_WARMUP, HOME_COOLDOWN, walkingIntervals,
  isContraindicated, injuryNotes,
  type GymExercise, type AbExercise, type Level, type Movement, type Injury, type Muscle,
} from './workout-exercises'
import { compoundExercisesForLevel } from './compound-exercises'

// Her stated preference from intake (see the "workout style" question). 'compound'
// is the only value that changes behavior today: it makes the cardio/HIIT finisher
// built into her regular gym day COMPOUND-MOVEMENT based by default instead of a
// plain treadmill walk. The standalone /plan/compound page stays opt-in for everyone
// regardless of this flag — this only changes what's built-in automatically.
export type TrainingStyle = 'compound' | 'split' | 'cardio' | 'none'

// Her intake "what do you want to feel proudest of" answer. Maps onto the
// pre-existing target-muscle weighting in pickGym (it already sorted target
// muscles first — this was fully built, just never fed by anything real).
// 'core' has no entry in the Muscle union (abs run through the separate
// pickAb system, not GYM_POOL), so it's handled as a bonus ab set instead —
// see the coreFocus checks in generateGym/generateHome.
export type FocusArea = 'core' | 'legs' | 'arms' | 'overall'
const FOCUS_TARGETS: Record<FocusArea, Muscle[]> = {
  legs: ['glutes', 'hamstrings', 'quads'],
  arms: ['biceps', 'triceps', 'back'],
  core: [],
  overall: [],
}
const FOCUS_LABEL: Record<FocusArea, string> = {
  core: 'Core & waistline', legs: 'Legs & glutes', arms: 'Arms & back', overall: 'All-over',
}

export interface WorkoutInputs {
  name?: string
  sex?: 'male' | 'female' | 'other'
  track: 'gym' | 'home'
  level: Level
  goal: 'lose' | 'gain' | 'maintain'
  daysPerWeek?: number
  weekNumber?: number
  injuries?: Injury[]
  targets?: Muscle[]
  focusArea?: FocusArea
  postpartum?: boolean // surfaces postpartum-labeled ab work first, see pickAb
  trainingStyle?: TrainingStyle
  // Optional — only needed to surface a personalized calorie-burn estimate on the
  // home track. Omit any of the three and estCalories/estCaloriesTotal are left
  // undefined (existing callers with no stats see zero change in output).
  weightLb?: number
  heightIn?: number
  age?: number
}

export interface Superset { title: string; push: GymExercise; pull: GymExercise; reps: string }
export interface CardioFinisher {
  title: string
  note: string
  mode: 'walk' | 'compound'
  // 'walk' mode
  speed?: string
  incline?: string
  mins?: string
  // 'compound' mode — built-in full-body compound circuit, drawn from the same
  // pool as the optional /plan/compound page
  moves?: { name: string; reps: string; cue: string; imageUrl?: string }[]
}
export interface GymDay {
  dayNum: number; title: string; muscles: string[]; warmup: string[]
  supersets: Superset[]
  accessory: { name: string; reps: string; cue: string }[]
  // bonus: only set when she's chosen 'core' as her focus area — an extra ab
  // set on top of the standard upper+lower, since core has no Muscle-union
  // entry to weight through the normal target system.
  ab: { upper: AbExercise; lower: AbExercise; scheme: string; bonus?: AbExercise }
  cardio: CardioFinisher
}
export interface HomeDay { dayNum: number; title: string; exercises: { name: string; duration: string; imageUrl?: string }[]; estCalories?: number }
export interface WorkoutProgram {
  name: string; track: 'gym' | 'home'; level: Level; levelLabel: string; goal: string
  weekNumber: number; daysPerWeek: number
  gymDays?: GymDay[]
  injuryNotes?: string[]
  targetNote?: string
  home?: { minutes: string; warmup: string[]; days: HomeDay[]; cooldown: string[]; walking: string; estCaloriesTotal?: number }
}

const LEVEL_LABEL: Record<Level, string> = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' }
const REP_SCHEME: Record<Level, string> = { 1: '2 × 10–12', 2: '3 × 15 / 12 / 10', 3: '3 × 20 / 15 / 12' }
const AB_SCHEME: Record<Level, string> = { 1: '2 sets × 8–12', 2: '2–3 sets × 12–15', 3: '3–4 sets × 15+ (add weight)' }

// Personalized calorie estimate: METs scaled off the client's own Mifflin-St Jeor BMR
// (weight+height+age+sex) rather than the generic population-average "1 MET = 1
// kcal/kg/hr" assumption — same approach validated against Kyra's real Calorie
// Blueprint numbers (reproduces her published BMR exactly). MET rises with level
// since the home pool itself gets more vigorous (HIIT/plyo) at higher levels.
const HOME_MET: Record<Level, number> = { 1: 3.2, 2: 4.5, 3: 6.5 }
function mifflinBMR(weightLb: number, heightIn: number, age: number, sex?: WorkoutInputs['sex']): number {
  const kg = weightLb * 0.453592
  const cm = heightIn * 2.54
  const base = 10 * kg + 6.25 * cm - 5 * age
  return sex === 'male' ? base + 5 : base - 161
}
function estimateHomeCalories(inp: WorkoutInputs, level: Level, minutesLabel: string): number | undefined {
  if (!inp.weightLb || !inp.heightIn || !inp.age) return undefined
  const minutes = parseInt(minutesLabel, 10) || 20
  const bmr = mifflinBMR(inp.weightLb, inp.heightIn, inp.age, inp.sex)
  return Math.round(HOME_MET[level] * (bmr / 24) * (minutes / 60))
}

// ── Split system ─────────────────────────────────────────────
// A day = 3 push/pull supersets. Each slot names the muscles its push
// and pull may come from. Splits honor a true push-pull system:
//   • Males: legs get their OWN day; upper is split push-vs-pull.
//   • Females: legs 2–3×/week, with one leg day that's also push-pull.
// Abs, cardio, calves + tibialis are added to every day downstream.
type Slot = { push: Muscle[]; pull: Muscle[] }
type DaySpec = { title: string; muscles: string[]; warm: 'legs' | 'upper'; slots: Slot[] }

// Male day templates
const M_PUSH_ARMS: DaySpec = {
  title: 'Push · Chest & Triceps + Pull · Biceps', muscles: ['Chest', 'Triceps', 'Biceps'], warm: 'upper',
  slots: [{ push: ['chest'], pull: ['biceps'] }, { push: ['triceps'], pull: ['biceps'] }, { push: ['chest', 'triceps'], pull: ['biceps'] }],
}
const M_LEGS: DaySpec = {
  title: 'Legs · Push Quads + Pull Hamstrings', muscles: ['Quads', 'Hamstrings', 'Glutes'], warm: 'legs',
  slots: [{ push: ['quads'], pull: ['hamstrings'] }, { push: ['quads'], pull: ['glutes'] }, { push: ['quads'], pull: ['hamstrings', 'glutes'] }],
}
const M_PUSH_DELTS: DaySpec = {
  title: 'Push · Shoulders + Pull · Back', muscles: ['Shoulders', 'Back'], warm: 'upper',
  slots: [{ push: ['shoulders'], pull: ['back'] }, { push: ['shoulders'], pull: ['back'] }, { push: ['shoulders'], pull: ['back'] }],
}
const M_UPPER: DaySpec = {
  title: 'Upper Body · Push + Pull', muscles: ['Chest', 'Back', 'Shoulders', 'Arms'], warm: 'upper',
  slots: [{ push: ['chest'], pull: ['back'] }, { push: ['shoulders'], pull: ['biceps'] }, { push: ['triceps'], pull: ['back'] }],
}
const FULL_BODY: DaySpec = {
  title: 'Full Body · Push + Pull', muscles: ['Full Body'], warm: 'legs',
  slots: [{ push: ['quads'], pull: ['back'] }, { push: ['chest'], pull: ['hamstrings', 'glutes'] }, { push: ['shoulders'], pull: ['biceps'] }],
}

// Female day templates — glute/leg forward, upper woven in
const F_LOWER: DaySpec = {
  title: 'Lower · Glutes & Hamstrings', muscles: ['Glutes', 'Hamstrings', 'Quads'], warm: 'legs',
  slots: [{ push: ['quads'], pull: ['glutes'] }, { push: ['quads'], pull: ['hamstrings'] }, { push: ['quads'], pull: ['glutes', 'hamstrings'] }],
}
const F_UPPER: DaySpec = {
  title: 'Upper · Push + Pull', muscles: ['Chest', 'Back', 'Shoulders', 'Arms'], warm: 'upper',
  slots: [{ push: ['chest'], pull: ['back'] }, { push: ['shoulders'], pull: ['biceps'] }, { push: ['triceps'], pull: ['back'] }],
}
const F_LOWER_PP: DaySpec = {
  title: 'Legs + Upper · Push-Pull', muscles: ['Glutes', 'Quads', 'Upper'], warm: 'legs',
  slots: [{ push: ['quads'], pull: ['glutes'] }, { push: ['shoulders'], pull: ['back'] }, { push: ['chest'], pull: ['hamstrings'] }],
}

const clampDays = (d: number) => Math.min(Math.max(Math.round(d) || 3, 1), 6)

// Male: legs their own day; 4th+ days are Full Body (per coach spec).
function maleSplit(days: number): DaySpec[] {
  const n = clampDays(days)
  if (n === 1) return [FULL_BODY]
  if (n === 2) return [M_UPPER, M_LEGS]
  const base = [M_PUSH_ARMS, M_LEGS, M_PUSH_DELTS]
  for (let i = 3; i < n; i++) base.push(FULL_BODY)
  return base
}

// Female: legs 2–3×/week; one leg day is also push-pull (F_LOWER_PP).
function femaleSplit(days: number): DaySpec[] {
  const n = clampDays(days)
  const plans: Record<number, DaySpec[]> = {
    1: [F_LOWER_PP],
    2: [F_LOWER, F_LOWER_PP],
    3: [F_LOWER, F_UPPER, F_LOWER_PP],
    4: [F_LOWER, F_UPPER, F_LOWER, F_LOWER_PP],
    5: [F_LOWER, F_UPPER, F_LOWER, F_UPPER, F_LOWER_PP],
    6: [F_LOWER, F_UPPER, F_LOWER, F_UPPER, F_LOWER_PP, F_UPPER],
  }
  return plans[n]
}

function splitFor(sex: WorkoutInputs['sex'], days: number): DaySpec[] {
  return sex === 'male' ? maleSplit(days) : femaleSplit(days) // 'other'/undefined → female (avatar)
}

export function rotate<T>(arr: T[], n: number): T[] {
  if (!arr.length) return arr
  const k = ((n % arr.length) + arr.length) % arr.length
  return arr.slice(k).concat(arr.slice(0, k))
}

// Pick `count` exercises for a slot: the requested muscle(s) ALWAYS come first
// (rotated week-to-week for variety); only if the slot still needs more do we
// fall back to other muscles of the same movement — never ahead of the real one.
function pickGym(movement: Movement, muscles: string[], level: Level, weekOffset: number, count: number, injuries: Injury[], targets: Muscle[]): GymExercise[] {
  const ok = (e: GymExercise) => e.movement === movement && e.minLevel <= level && !isContraindicated(e.name, injuries)
  const sortFn = (a: GymExercise, b: GymExercise) => {
    const at = targets.includes(a.muscle) ? 1 : 0, bt = targets.includes(b.muscle) ? 1 : 0
    if (at !== bt) return bt - at                    // target muscles first
    return a.free === b.free ? 0 : a.free ? -1 : 1   // then free weights
  }
  const exact = rotate(GYM_POOL.filter(e => ok(e) && muscles.includes(e.muscle)).sort(sortFn), weekOffset)
  const fallback = GYM_POOL.filter(e => ok(e) && !muscles.includes(e.muscle)).sort(sortFn)
  return exact.concat(fallback).slice(0, count)
}

// Priority pool (Asa's curated screenshot batch) is the PRIMARY source now — the
// original generic pool is only a fallback for zone/level combos priority doesn't
// cover. Postpartum-flagged entries take priority over priority over generic when
// she's flagged postpartum in intake. Injury filtering was missing here entirely
// before (pre-existing gap, not introduced by the priority-pool work) — pickGym and
// generateHome both already filtered by injuries, this closes the same gap for abs.
export function pickAb(zone: 'upper' | 'lower', level: Level, offset: number, postpartum = false, injuries: Injury[] = []): AbExercise {
  const base = AB_POOL.filter(a => a.zone === zone && a.minLevel <= level)
  const safe = base.filter(a => !isContraindicated(a.name, injuries))
  const inZoneLevel = safe.length ? safe : base // never end up with nothing just because every option got excluded
  if (postpartum) {
    const pp = inZoneLevel.filter(a => a.postpartum)
    if (pp.length) return rotate(pp, offset)[0]
  }
  const priority = inZoneLevel.filter(a => a.priority && !a.postpartum)
  if (priority.length) return rotate(priority, offset)[0]
  return rotate(inZoneLevel, offset)[0]
}

// Builds the day's cardio/HIIT finisher. Default (everyone else) stays the plain
// incline-treadmill walk, unchanged. When she's told us her training style leans
// full-body/compound (intake), the finisher automatically becomes a short compound
// circuit instead — no opt-in tap required, per Asa's ask that this be built-in by
// default for her, while the dedicated /plan/compound page remains optional for all.
function buildCardioFinisher(level: Level, goal: string, trainingStyle: TrainingStyle | undefined, injuries: Injury[], offset: number): CardioFinisher {
  if (trainingStyle === 'compound') {
    const pool = compoundExercisesForLevel(level, injuries)
    const moves = rotate(pool, offset).slice(0, 3).map((m) => ({ name: m.name, reps: m.reps, cue: m.cue, imageUrl: m.imageUrl }))
    return {
      title: 'Compound Finisher',
      mode: 'compound',
      note: 'Full-body compound moves to close out your session — built in because that’s your training style.',
      moves,
    }
  }
  return { ...cardioFinisher(level, goal), mode: 'walk' }
}

function generateGym(inp: WorkoutInputs): GymDay[] {
  const level = inp.level
  const week = inp.weekNumber || 1
  const injuries = inp.injuries || []
  const targets = (inp.targets && inp.targets.length) ? inp.targets : FOCUS_TARGETS[inp.focusArea || 'overall']
  const coreFocus = inp.focusArea === 'core'
  const split = splitFor(inp.sex, inp.daysPerWeek || 3)

  return split.map((spec, i) => {
    const dayNum = i + 1
    const off = week + i // vary by week AND day
    // Fill each push/pull slot from its allowed muscles, no repeats within the day.
    const usedPush = new Set<string>()
    const usedPull = new Set<string>()
    const supersets: Superset[] = spec.slots.map((slot, s) => {
      const pushC = pickGym('push', slot.push, level, off + s, 6, injuries, targets)
      const pullC = pickGym('pull', slot.pull, level, off + s + 1, 6, injuries, targets)
      const push = pushC.find(e => !usedPush.has(e.name)) || pushC[0]
      const pull = pullC.find(e => !usedPull.has(e.name)) || pullC[0]
      usedPush.add(push.name); usedPull.add(pull.name)
      return { title: `${push.name} + ${pull.name}`, push, pull, reps: REP_SCHEME[level] }
    })
    return {
      dayNum,
      title: spec.title,
      muscles: spec.muscles,
      warmup: WARMUPS[spec.warm],
      supersets,
      accessory: [
        { name: 'Standing Calf Raise', reps: level === 1 ? '2 × 15–20' : '3 × 15–20', cue: 'Rise onto toes, squeeze at the top, lower slow for a full stretch.' },
        { name: 'Single-Arm Tibialis Raise (wall)', reps: '2 × 15 each', cue: 'Back to wall, lift toes toward shins, squeeze the shin, lower slow.' },
      ],
      ab: {
        upper: pickAb('upper', level, off, inp.postpartum, injuries),
        lower: pickAb('lower', level, off + 2, inp.postpartum, injuries),
        scheme: AB_SCHEME[level],
        ...(coreFocus ? { bonus: pickAb('upper', level, off + 5, inp.postpartum, injuries) } : {}),
      },
      cardio: buildCardioFinisher(level, inp.goal, inp.trainingStyle, injuries, off),
    } as GymDay
  })
}

// Home split day count must always match the gym split's day count for the same
// daysPerWeek input — a daily check-in track-swap (gym↔home) regenerates a fresh
// program via generateWorkout, and the page picks "today's day" via
// `completedWorkouts % numDays`. If home and gym split lengths ever diverged,
// swapping track for a single day would shift her onto the wrong day in her
// push-pull sequence. Same legs-2-to-3x/week philosophy as femaleSplit/maleSplit.
function homeSplit(daysPerWeek: number, level: Level): string[] {
  const n = clampDays(daysPerWeek)
  if (level < 2) return Array(n).fill('Full Body')
  if (n === 1) return ['Full Body']
  const cycle = ['Leg Focus', 'Upper Body & Core 🚫 No Leg Strain']
  return Array.from({ length: n }, (_, i) => cycle[i % 2]) // n=3 → Leg/Upper/Leg, matches the original default exactly
}

// Bodyweight-only priority/postpartum ab moves (no plates/kettlebells) — the home
// track's equivalent of pickAb's priority pool. Weighted or KB-named entries need
// equipment a home session doesn't assume, so those stay gym-only.
const HOME_AB_PRIORITY = AB_POOL.filter(a => a.priority && !a.weighted && !a.name.startsWith('KB '))

function generateHome(inp: WorkoutInputs): WorkoutProgram['home'] {
  const level = inp.level
  const week = inp.weekNumber || 1
  const coreFocus = inp.focusArea === 'core'
  const split = homeSplit(inp.daysPerWeek || 3, level)

  const injuries = inp.injuries || []
  const avail = HOME_POOL.filter(e => e.level <= level && !isContraindicated(e.name, injuries))
  // Real bug fixed here: this filter previously only excluded contraindicated moves —
  // it never capped by minLevel, so a Beginner (level 1) home program could get served
  // "Reclined Leg Raise (Advanced)" for core work. Gym-track's pickAb already does this
  // level cap correctly; home-track's core picker just never had the equivalent check.
  const homeAbSafe = HOME_AB_PRIORITY.filter(a => a.minLevel <= level && !isContraindicated(a.name, injuries))
  const byType = (types: string[], off: number, count: number) => {
    let picked: { name: string; duration: string; imageUrl?: string }[] = []
    if (types.includes('core')) {
      const corePool = inp.postpartum
        ? homeAbSafe.filter(a => a.postpartum).concat(homeAbSafe.filter(a => !a.postpartum))
        : homeAbSafe.filter(a => !a.postpartum)
      picked = rotate(corePool, off).slice(0, Math.min(coreFocus ? 3 : 2, count)).map(a => ({ name: a.name, duration: '30 sec', imageUrl: a.imageUrl }))
    }
    // prefer moves at the client's exact level (progression), fall back to lower levels only if needed
    const remaining = count - picked.length
    const atLevel = avail.filter(e => types.includes(e.type) && e.type !== 'cardio' && e.level === level)
    const lower = avail.filter(e => types.includes(e.type) && e.type !== 'cardio' && e.level < level)
    const ordered = rotate(atLevel, off).concat(rotate(lower, off))
    return picked.concat(ordered.slice(0, remaining).map(e => ({ name: e.name, duration: '30 sec', imageUrl: e.imageUrl })))
  }
  const finisher = (off: number) => {
    const atLevel = avail.filter(e => e.type === 'cardio' && e.level === level)
    const cardio = atLevel.length ? atLevel : avail.filter(e => e.type === 'cardio')
    const pick = rotate(cardio, off)[0] || { name: 'March in Place' }
    return { name: pick.name, duration: '60 sec', imageUrl: (pick as { imageUrl?: string }).imageUrl }
  }

  const minutes = level === 1 && (week <= 1) ? '20 min' : '15 min'
  const estCalories = estimateHomeCalories(inp, level, minutes)

  const days: HomeDay[] = split.map((focus, i) => {
    const off = week + i
    let types: string[]
    if (focus.startsWith('Leg')) types = ['leg', 'core']
    else if (focus.startsWith('Upper')) types = ['upper', 'core']
    else types = ['leg', 'upper', 'core']
    const exercises = [...byType(types, off, 4), finisher(off + 3)]
    return { dayNum: i + 1, title: `Day ${i + 1}: ${focus}`, exercises, estCalories }
  })

  return {
    minutes,
    warmup: HOME_WARMUP,
    days,
    cooldown: HOME_COOLDOWN,
    walking: walkingIntervals(level),
    estCaloriesTotal: estCalories !== undefined ? estCalories * days.length : undefined,
  }
}

export function generateWorkout(inp: WorkoutInputs): WorkoutProgram {
  const base: WorkoutProgram = {
    name: inp.name || 'Your',
    track: inp.track,
    level: inp.level,
    levelLabel: LEVEL_LABEL[inp.level],
    goal: inp.goal,
    weekNumber: inp.weekNumber || 1,
    daysPerWeek: inp.daysPerWeek || 3,
  }
  base.injuryNotes = injuryNotes(inp.injuries || [])
  if (inp.targets && inp.targets.length) {
    base.targetNote = inp.targets.map(m => m[0].toUpperCase() + m.slice(1)).join(' · ')
  } else if (inp.focusArea && inp.focusArea !== 'overall') {
    base.targetNote = FOCUS_LABEL[inp.focusArea]
  }
  if (inp.track === 'home') base.home = generateHome(inp)
  else base.gymDays = generateGym(inp)
  return base
}
