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
  postpartum?: boolean // surfaces postpartum-labeled ab work first, see pickAb
}

export interface Superset { title: string; push: GymExercise; pull: GymExercise; reps: string }
export interface GymDay {
  dayNum: number; title: string; muscles: string[]; warmup: string[]
  supersets: Superset[]
  accessory: { name: string; reps: string; cue: string }[]
  ab: { upper: AbExercise; lower: AbExercise; scheme: string }
  cardio: ReturnType<typeof cardioFinisher>
}
export interface HomeDay { dayNum: number; title: string; exercises: { name: string; duration: string }[] }
export interface WorkoutProgram {
  name: string; track: 'gym' | 'home'; level: Level; levelLabel: string; goal: string
  weekNumber: number; daysPerWeek: number
  gymDays?: GymDay[]
  injuryNotes?: string[]
  targetNote?: string
  home?: { minutes: string; warmup: string[]; days: HomeDay[]; cooldown: string[]; walking: string }
}

const LEVEL_LABEL: Record<Level, string> = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' }
const REP_SCHEME: Record<Level, string> = { 1: '2 × 10–12', 2: '3 × 15 / 12 / 10', 3: '3 × 20 / 15 / 12' }
const AB_SCHEME: Record<Level, string> = { 1: '2 sets × 8–12', 2: '2–3 sets × 12–15', 3: '3–4 sets × 15+ (add weight)' }

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

function rotate<T>(arr: T[], n: number): T[] {
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
function pickAb(zone: 'upper' | 'lower', level: Level, offset: number, postpartum = false, injuries: Injury[] = []): AbExercise {
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

function generateGym(inp: WorkoutInputs): GymDay[] {
  const level = inp.level
  const week = inp.weekNumber || 1
  const injuries = inp.injuries || []
  const targets = inp.targets || []
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
      ab: { upper: pickAb('upper', level, off, inp.postpartum, injuries), lower: pickAb('lower', level, off + 2, inp.postpartum, injuries), scheme: AB_SCHEME[level] },
      cardio: cardioFinisher(level, inp.goal),
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
  const split = homeSplit(inp.daysPerWeek || 3, level)

  const injuries = inp.injuries || []
  const avail = HOME_POOL.filter(e => e.level <= level && !isContraindicated(e.name, injuries))
  const homeAbSafe = HOME_AB_PRIORITY.filter(a => !isContraindicated(a.name, injuries))
  const byType = (types: string[], off: number, count: number) => {
    let picked: { name: string; duration: string }[] = []
    if (types.includes('core')) {
      const corePool = inp.postpartum
        ? homeAbSafe.filter(a => a.postpartum).concat(homeAbSafe.filter(a => !a.postpartum))
        : homeAbSafe.filter(a => !a.postpartum)
      picked = rotate(corePool, off).slice(0, Math.min(2, count)).map(a => ({ name: a.name, duration: '30 sec' }))
    }
    // prefer moves at the client's exact level (progression), fall back to lower levels only if needed
    const remaining = count - picked.length
    const atLevel = avail.filter(e => types.includes(e.type) && e.type !== 'cardio' && e.level === level)
    const lower = avail.filter(e => types.includes(e.type) && e.type !== 'cardio' && e.level < level)
    const ordered = rotate(atLevel, off).concat(rotate(lower, off))
    return picked.concat(ordered.slice(0, remaining).map(e => ({ name: e.name, duration: '30 sec' })))
  }
  const finisher = (off: number) => {
    const atLevel = avail.filter(e => e.type === 'cardio' && e.level === level)
    const cardio = atLevel.length ? atLevel : avail.filter(e => e.type === 'cardio')
    const pick = rotate(cardio, off)[0] || { name: 'March in Place' }
    return { name: pick.name, duration: '60 sec' }
  }

  const days: HomeDay[] = split.map((focus, i) => {
    const off = week + i
    let types: string[]
    if (focus.startsWith('Leg')) types = ['leg', 'core']
    else if (focus.startsWith('Upper')) types = ['upper', 'core']
    else types = ['leg', 'upper', 'core']
    const exercises = [...byType(types, off, 4), finisher(off + 3)]
    return { dayNum: i + 1, title: `Day ${i + 1}: ${focus}`, exercises }
  })

  return {
    minutes: level === 1 && (week <= 1) ? '20 min' : '15 min',
    warmup: HOME_WARMUP,
    days,
    cooldown: HOME_COOLDOWN,
    walking: walkingIntervals(level),
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
  if (inp.targets && inp.targets.length) base.targetNote = inp.targets.map(m => m[0].toUpperCase() + m.slice(1)).join(' · ')
  if (inp.track === 'home') base.home = generateHome(inp)
  else base.gymDays = generateGym(inp)
  return base
}
