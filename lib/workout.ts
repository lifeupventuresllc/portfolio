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
  track: 'gym' | 'home'
  level: Level
  goal: 'lose' | 'gain' | 'maintain'
  daysPerWeek?: number
  weekNumber?: number
  injuries?: Injury[]
  targets?: Muscle[]
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

const GYM_SPLIT_3 = [
  { title: 'Legs + Back & Shoulders', muscles: ['glutes', 'hamstrings', 'back', 'shoulders'], warm: 'legs' },
  { title: 'Chest + Arms', muscles: ['chest', 'biceps', 'triceps'], warm: 'upper' },
  { title: 'Legs + Back & Chest', muscles: ['quads', 'glutes', 'back', 'chest'], warm: 'legs' },
]

function rotate<T>(arr: T[], n: number): T[] {
  if (!arr.length) return arr
  const k = ((n % arr.length) + arr.length) % arr.length
  return arr.slice(k).concat(arr.slice(0, k))
}

// Pick `count` distinct exercises: muscle-matched + level-gated + free-weights first, rotated by week for variety.
function pickGym(movement: Movement, muscles: string[], level: Level, weekOffset: number, count: number, injuries: Injury[], targets: Muscle[]): GymExercise[] {
  const ok = (e: GymExercise) => !isContraindicated(e.name, injuries)
  let c = GYM_POOL.filter(e => e.movement === movement && muscles.includes(e.muscle) && e.minLevel <= level && ok(e))
  if (c.length < count) {
    const extra = GYM_POOL.filter(e => e.movement === movement && e.minLevel <= level && ok(e) && !c.includes(e))
    c = c.concat(extra)
  }
  c = [...c].sort((a, b) => {
    const at = targets.includes(a.muscle) ? 1 : 0, bt = targets.includes(b.muscle) ? 1 : 0
    if (at !== bt) return bt - at            // target muscles first
    return a.free === b.free ? 0 : a.free ? -1 : 1  // then free weights
  })
  return rotate(c, weekOffset).slice(0, count)
}

function pickAb(zone: 'upper' | 'lower', level: Level, offset: number): AbExercise {
  const c = AB_POOL.filter(a => a.zone === zone && a.minLevel <= level)
  return rotate(c, offset)[0]
}

function generateGym(inp: WorkoutInputs): GymDay[] {
  const level = inp.level
  const week = inp.weekNumber || 1
  const injuries = inp.injuries || []
  const targets = inp.targets || []
  const days = GYM_SPLIT_3.map((split, i) => {
    const dayNum = i + 1
    const off = week + i // vary by week AND day
    // 3 supersets: pair a push with a pull
    const pushes = pickGym('push', split.muscles, level, off, 3, injuries, targets)
    const pulls = pickGym('pull', split.muscles, level, off + 1, 3, injuries, targets)
    const supersets: Superset[] = []
    for (let s = 0; s < 3; s++) {
      const push = pushes[s % pushes.length]
      const pull = pulls[s % pulls.length]
      supersets.push({ title: `${push.name} + ${pull.name}`, push, pull, reps: REP_SCHEME[level] })
    }
    return {
      dayNum,
      title: split.title,
      muscles: split.muscles.map(m => m[0].toUpperCase() + m.slice(1)),
      warmup: WARMUPS[split.warm],
      supersets,
      accessory: [
        { name: 'Standing Calf Raise', reps: level === 1 ? '2 × 15–20' : '3 × 15–20', cue: 'Rise onto toes, squeeze at the top, lower slow for a full stretch.' },
        { name: 'Single-Arm Tibialis Raise (wall)', reps: '2 × 15 each', cue: 'Back to wall, lift toes toward shins, squeeze the shin, lower slow.' },
      ],
      ab: { upper: pickAb('upper', level, off), lower: pickAb('lower', level, off + 2), scheme: AB_SCHEME[level] },
      cardio: cardioFinisher(level, inp.goal),
    } as GymDay
  })
  return days
}

function generateHome(inp: WorkoutInputs): WorkoutProgram['home'] {
  const level = inp.level
  const week = inp.weekNumber || 1
  const split = level >= 2
    ? ['Leg Focus', 'Upper Body & Core 🚫 No Leg Strain', 'Leg Focus']
    : ['Full Body', 'Full Body', 'Full Body']

  const injuries = inp.injuries || []
  const avail = HOME_POOL.filter(e => e.level <= level && !isContraindicated(e.name, injuries))
  const byType = (types: string[], off: number, count: number) => {
    // prefer moves at the client's exact level (progression), fall back to lower levels only if needed
    const atLevel = avail.filter(e => types.includes(e.type) && e.type !== 'cardio' && e.level === level)
    const lower = avail.filter(e => types.includes(e.type) && e.type !== 'cardio' && e.level < level)
    const ordered = rotate(atLevel, off).concat(rotate(lower, off))
    return ordered.slice(0, count).map(e => ({ name: e.name, duration: '30 sec' }))
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
