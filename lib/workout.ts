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
// 'arms' is the app's only upper-body focus bucket — there's no separate "chest"
// value anywhere in the intake UI or chat classifiers, so a "chest and arms" ask
// (a real, common request) needs to land here too. Includes 'chest' so a request
// like that actually scores M_PUSH_ARMS/F_UPPER (chest+triceps+biceps-heavy days)
// highest in pickFocusDayIndex below, instead of a day with zero chest work.
const FOCUS_TARGETS: Record<FocusArea, Muscle[]> = {
  legs: ['glutes', 'hamstrings', 'quads'],
  arms: ['biceps', 'triceps', 'back', 'chest'],
  core: [],
  overall: [],
}
const FOCUS_LABEL: Record<FocusArea, string> = {
  core: 'Core & waistline', legs: 'Legs & glutes', arms: 'Arms, chest & back', overall: 'All-over',
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
export const GOAL_LABEL: Record<WorkoutInputs['goal'], string> = { lose: 'Fat Loss', gain: 'Muscle Gain', maintain: 'Maintain' }
const AB_SCHEME: Record<Level, string> = { 1: '2 sets × 8–12', 2: '2–3 sets × 12–15', 3: '3–4 sets × 15+ (add weight)' }

// Real goal-based programming, not just a label. Standard, well-established
// exercise-science distinction: fat loss favors higher reps + shorter rest
// for metabolic density; muscle gain favors more sets at a moderate rep
// range for volume; maintain keeps the original baseline scheme untouched
// (minimizes behavior change for anyone already on that goal). Found+fixed:
// `goal` was captured in intake, stored, even passed into this function, and
// then structurally IGNORED — it only ever changed one sentence of cardio
// note text (see cardioFinisher in workout-exercises.ts), never the actual
// sets/reps/volume. Confirmed by reading every call site before this fix —
// two people with identical level/track/days/focus but different stated
// goals got byte-for-byte the same program.
const REP_SCHEME: Record<Level, Record<WorkoutInputs['goal'], string>> = {
  1: { lose: '3 × 12–15 (short rest)', gain: '3 × 8–10', maintain: '2 × 10–12' },
  2: { lose: '3 × 18 / 15 / 12 (short rest)', gain: '4 × 10 / 8 / 8', maintain: '3 × 15 / 12 / 10' },
  3: { lose: '4 × 20 / 15 / 12 / 12 (short rest)', gain: '4 × 10 / 8 / 6 / 6', maintain: '3 × 20 / 15 / 12' },
}
function repScheme(level: Level, goal: WorkoutInputs['goal']): string {
  return REP_SCHEME[level][goal] || REP_SCHEME[level].maintain
}

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
// Real gap found+fixed: a true beginner and an advanced lifter training the
// same days/week used to get the IDENTICAL day-template split — only the
// eligible exercises and rep scheme changed. The home track already varied
// its day STRUCTURE by level (full-body-only for beginners, alternating
// split for intermediate+); gym never did. A beginner training 3+ days/week
// now gets Full Body every day too, same as home's approach, instead of an
// isolating push/pull/legs split her first weeks in.
function maleSplit(days: number, level: Level): DaySpec[] {
  const n = clampDays(days)
  if (level === 1) return Array(n).fill(FULL_BODY)
  if (n === 1) return [FULL_BODY]
  if (n === 2) return [M_UPPER, M_LEGS]
  const base = [M_PUSH_ARMS, M_LEGS, M_PUSH_DELTS]
  for (let i = 3; i < n; i++) base.push(FULL_BODY)
  return base
}

// Female: legs 2–3×/week; one leg day is also push-pull (F_LOWER_PP).
// Beginner-level fix mirrors maleSplit above, but keeps the deliberate
// glute-forward design (F_LOWER_PP already combines legs + shoulders +
// chest in one day — the female equivalent of "full body" here — rather
// than forcing the male FULL_BODY template's exact muscle mix onto her).
function femaleSplit(days: number, level: Level): DaySpec[] {
  const n = clampDays(days)
  if (level === 1) return Array(n).fill(F_LOWER_PP)
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

function splitFor(sex: WorkoutInputs['sex'], days: number, level: Level): DaySpec[] {
  return sex === 'male' ? maleSplit(days, level) : femaleSplit(days, level) // 'other'/undefined → female (avatar)
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

// Real focus-area emphasis for arms/legs. The target-muscle sort inside
// pickGym above only matters when a slot allows MORE THAN ONE candidate
// muscle — but every slot in every DaySpec above already locks to exactly
// one muscle (e.g. `push: ['chest']`), so there's no ambiguity left for that
// sort to ever resolve differently. Caught this by actually testing a real
// "arms focus" program against baseline and finding zero difference in any
// exercise slot. Real fix: an extra accessory exercise from her focus
// muscles, appended to the day's existing accessory work (same place the
// calf-raise/tibialis pair already lives) — same shape as the 'core' bonus
// ab exercise below, so all three focus areas behave consistently.
function pickFocusAccessory(muscles: Muscle[], level: Level, goal: WorkoutInputs['goal'], offset: number, injuries: Injury[], usedNames: Set<string>): { name: string; reps: string; cue: string } | null {
  const ok = (e: GymExercise) => muscles.includes(e.muscle) && e.minLevel <= level && !isContraindicated(e.name, injuries) && !usedNames.has(e.name)
  const pick = rotate(GYM_POOL.filter(ok), offset)[0]
  if (!pick) return null
  return { name: pick.name, reps: repScheme(level, goal), cue: `${pick.cue} (bonus set — from your chosen focus area)` }
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
  const split = splitFor(inp.sex, inp.daysPerWeek || 3, level)

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
      return { title: `${push.name} + ${pull.name}`, push, pull, reps: repScheme(level, inp.goal) }
    })
    const usedNames = new Set<string>(Array.from(usedPush).concat(Array.from(usedPull)))
    const focusBonus = targets.length ? pickFocusAccessory(targets, level, inp.goal, off + 7, injuries, usedNames) : null
    const upperAb = pickAb('upper', level, off, inp.postpartum, injuries)
    // Real gap found live: the bonus ab pick and the regular upper ab pick
    // are both drawn from the same 'upper' zone — a small filtered pool
    // (postpartum/level/injury-narrowed) could land both offsets on the
    // identical exercise, showing the same name twice in one list. One retry
    // at a different offset is enough; if the pool really is that small, a
    // repeat is unavoidable, not a bug.
    let bonusAb: AbExercise | undefined
    if (coreFocus) {
      bonusAb = pickAb('upper', level, off + 5, inp.postpartum, injuries)
      if (bonusAb.name === upperAb.name) bonusAb = pickAb('upper', level, off + 6, inp.postpartum, injuries)
    }
    return {
      dayNum,
      title: spec.title,
      muscles: spec.muscles,
      warmup: WARMUPS[spec.warm],
      supersets,
      accessory: [
        { name: 'Standing Calf Raise', reps: level === 1 ? '2 × 15–20' : '3 × 15–20', cue: 'Rise onto toes, squeeze at the top, lower slow for a full stretch.' },
        { name: 'Single-Arm Tibialis Raise (wall)', reps: '2 × 15 each', cue: 'Back to wall, lift toes toward shins, squeeze the shin, lower slow.' },
        ...(focusBonus ? [focusBonus] : []),
      ],
      ab: {
        upper: upperAb,
        lower: pickAb('lower', level, off + 2, inp.postpartum, injuries),
        scheme: AB_SCHEME[level],
        ...(bonusAb ? { bonus: bonusAb } : {}),
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
  // Home exercises only carry a broad 'leg'/'upper'/'core'/'cardio' type, not
  // per-muscle data like GYM_POOL — 'upper' is the closest available proxy
  // for "arms & back". On a split that's already Leg-day/Upper-day
  // alternating, every non-core pick on the matching day is already 100% the
  // focus type (nothing to reorder) — the partition below mainly matters on
  // Full Body days (level 1 or a 1-day/week split), where leg/upper/core mix
  // together. The count bump below is what actually adds real extra volume
  // on every split, tested against a real generated program before shipping.
  const focusType: 'leg' | 'upper' | null = coreFocus ? null : inp.focusArea === 'legs' ? 'leg' : inp.focusArea === 'arms' ? 'upper' : null
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
    // Focus-type moves partitioned to the FRONT before rotating, not sorted-then-rotated —
    // rotating a sorted array can shove the very items we just prioritized to the back,
    // silently undoing the prioritization. Each partition still rotates independently so
    // week-to-week variety is preserved within it.
    const split2 = (arr: typeof avail) => focusType
      ? { hi: arr.filter(e => e.type === focusType), lo: arr.filter(e => e.type !== focusType) }
      : { hi: [] as typeof avail, lo: arr }
    const atLevelSplit = split2(avail.filter(e => types.includes(e.type) && e.type !== 'cardio' && e.level === level))
    const lowerSplit = split2(avail.filter(e => types.includes(e.type) && e.type !== 'cardio' && e.level < level))
    const ordered = rotate(atLevelSplit.hi, off).concat(rotate(atLevelSplit.lo, off), rotate(lowerSplit.hi, off), rotate(lowerSplit.lo, off))
    return picked.concat(ordered.slice(0, remaining).map(e => ({ name: e.name, duration: '30 sec', imageUrl: e.imageUrl })))
  }
  // Real gap found+fixed: generateHome never read `goal` at all — same
  // program regardless of stated goal, not even the cosmetic difference the
  // gym track had. Cardio finisher duration now varies (more for fat loss,
  // less for muscle gain, matching the gym track's cardioFinisher logic),
  // and 'lose' gets one extra circuit exercise below for real added
  // metabolic density — same "goalBump" shape as the existing focus-area bump.
  const CARDIO_SEC: Record<WorkoutInputs['goal'], number> = { lose: 90, gain: 45, maintain: 60 }
  const finisher = (off: number) => {
    const atLevel = avail.filter(e => e.type === 'cardio' && e.level === level)
    const cardio = atLevel.length ? atLevel : avail.filter(e => e.type === 'cardio')
    const pick = rotate(cardio, off)[0] || { name: 'March in Place' }
    return { name: pick.name, duration: `${CARDIO_SEC[inp.goal]} sec`, imageUrl: (pick as { imageUrl?: string }).imageUrl }
  }
  const goalBump = inp.goal === 'lose' ? 1 : 0

  const minutes = level === 1 && (week <= 1) ? '20 min' : '15 min'
  const estCalories = estimateHomeCalories(inp, level, minutes)

  const days: HomeDay[] = split.map((focus, i) => {
    const off = week + i
    let types: string[]
    if (focus.startsWith('Leg')) types = ['leg', 'core']
    else if (focus.startsWith('Upper')) types = ['upper', 'core']
    else types = ['leg', 'upper', 'core']
    // Real extra volume on a matching day, not just reordering — an alternating
    // Leg/Upper split has nothing left to reorder on its own matching day (every
    // non-core pick there is already the focus type), so without this bump
    // 'legs'/'arms' focus would do literally nothing on the most common split.
    const bump = focusType && types.includes(focusType) ? 1 : 0
    const exercises = [...byType(types, off, 4 + bump + goalBump), finisher(off + 3)]
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

// Real bug found live: a chat-triggered "build me an arm workout" (or any
// bare focus-area request) generated a real program with focusArea='arms'
// wired in — but every caller then read day index 0 for the preview/today's
// session, and focusArea NEVER changes which day comes first in her weekly
// rotation (see pickFocusAccessory's comment above — it only appends ONE
// bonus accessory exercise per day, it doesn't reorder days). So "arm
// workout" showed her regular Day 1 — often a leg day — with a single bonus
// arm exercise buried in the accessory list, both in the chat preview text
// and on the real /plan/workout page after approving. This picks the day
// that ACTUALLY matches the requested focus (scored by how many superset
// slots hit the target muscles on gym, or by the home split's own Leg/Upper
// label), so "today" genuinely means an arm-heavy day, not just Day 1 with
// an asterisk.
export function pickFocusDayIndex(program: WorkoutProgram, focusArea?: FocusArea): number {
  if (!focusArea || focusArea === 'overall') return 0
  if (program.track === 'gym' && program.gymDays?.length) {
    // Real gap found live: 'core' used to short-circuit straight to day 0 on
    // the theory that ab/core work is a same-day bonus added everywhere
    // anyway, so which day gets shown "didn't matter." It matters a lot to
    // her: asking for "just my core" and landing on a day literally titled
    // "Legs + Lower" reads as completely ignoring her, even though the bonus
    // ab work really is in there. There's no true "core day" in the split
    // (abs aren't a GYM_POOL muscle, see FOCUS_TARGETS above), so the best
    // real signal available is to avoid a leg/full-body-titled day in favor
    // of whichever day is least leg-dominant — not a perfect "core day," but
    // never contradicts what she just asked for.
    if (focusArea === 'core') {
      const idx = program.gymDays.findIndex(d => !/leg|lower|full body/i.test(d.title))
      return idx >= 0 ? idx : 0
    }
    const targets = FOCUS_TARGETS[focusArea]
    let bestIdx = 0, bestScore = -1
    program.gymDays.forEach((day, i) => {
      let score = 0
      for (const s of day.supersets) {
        if (targets.includes(s.push.muscle)) score++
        if (targets.includes(s.pull.muscle)) score++
      }
      if (score > bestScore) { bestScore = score; bestIdx = i }
    })
    return bestIdx
  }
  if (program.track === 'home' && program.home?.days.length) {
    // Home's split has a real day titled "Upper Body & Core" — an actual,
    // literal match, not a heuristic — so core routes there directly instead
    // of falling through to day 0.
    const wantType = focusArea === 'arms' ? 'Upper' : focusArea === 'legs' ? 'Leg' : focusArea === 'core' ? 'Core' : null
    if (wantType) {
      const idx = program.home.days.findIndex(d => d.title.includes(wantType))
      if (idx >= 0) return idx
    }
  }
  return 0
}
