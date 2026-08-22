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
// Real gap found live, via a formal bug report + Asa's own screenshot: 'arms'
// used to be the app's only upper-body bucket, so "back," "chest and
// shoulders," and "arms" all resolved to the exact same value — three
// genuinely different asks returned the byte-for-byte identical workout, and
// the recommendation card visibly told her "Focus → arms today" right under
// Coach Asa's own reply describing a "back day." Split into real distinct
// categories matching the Muscle tags the exercise pool already has (same
// concept as Fitbod's "Pick Muscle Groups" override, confirmed via research
// before building this — not a made-up structure). Scoped to chat's one-off
// detection only: the structured intake form's permanent focus preference
// (app/plan/intake/page.tsx) uses its own separate literal type, untouched by
// this — she still only ever sees core/legs/arms/overall there by design.
export type FocusArea = 'core' | 'legs' | 'arms' | 'chest' | 'back' | 'shoulders' | 'overall'
const FOCUS_TARGETS: Record<FocusArea, Muscle[]> = {
  legs: ['glutes', 'hamstrings', 'quads'],
  arms: ['biceps', 'triceps'],
  chest: ['chest'],
  back: ['back'],
  shoulders: ['shoulders'],
  core: [],
  overall: [],
}
const FOCUS_LABEL: Record<FocusArea, string> = {
  core: 'Core & waistline', legs: 'Legs & glutes', arms: 'Arms', chest: 'Chest', back: 'Back', shoulders: 'Shoulders', overall: 'All-over',
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
  // Multi-area chat request ("arms, legs, and core") — replaces day 0 of the
  // rotation with a day built directly from ALL named areas via
  // daySpecFromAreas, instead of the single-value focusArea only ever being
  // able to pick one. focusArea above stays for the permanent single-value
  // preference (intake form); this is specifically for a live chat ask.
  overrideAreas?: FocusArea[]
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
  // Set only when applyProgressiveOverload actually bumped the program — a
  // real, UI-surfaceable "why did my sets change" explanation, not silent.
  progressionNote?: string
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

// ── Split system — rebuilt from a computed foundation, not hardcoded day
// templates ──────────────────────────────────────────────────────────────
// Real gap that no amount of prompt/classifier tweaking could ever fix: the
// old system had 8 separate hand-authored day objects (one per sex/day-count
// combination), each with its own fixed muscle pairing baked in — asking for
// "back" or "arms, legs, and core" could only ever route to whichever
// pre-written day happened to score closest, never a day actually built
// FROM what she asked for. Replaced with a small set of reusable muscle-
// pairing "slot sets" plus a rotation cycle, so the split is COMPUTED for
// any day count instead of enumerated by hand — and a chat-requested focus
// for "today" builds a real day from her exact named areas the same way,
// through the same function, instead of being a special case bolted on.
// Researched real training-split science before rebuilding this (Push/Pull/
// Legs vs. old-style single-muscle "bro splits") — PPL-style antagonist
// pairing, training each muscle ~2x/week, is the current evidence-backed
// default for most people including beginners, which is exactly what this
// rotation still does; only the DaySpec objects were hand-authored, not the
// underlying training logic, which was already correct and stays intact.
type Slot = { push: Muscle[]; pull: Muscle[] }
type DaySpec = { title: string; muscles: string[]; warm: 'legs' | 'upper'; slots: Slot[] }

const LEGS_SLOTS: Slot[] = [{ push: ['quads'], pull: ['glutes'] }, { push: ['quads'], pull: ['hamstrings'] }, { push: ['quads'], pull: ['glutes', 'hamstrings'] }]
const PUSH_SLOTS: Slot[] = [{ push: ['chest'], pull: ['biceps'] }, { push: ['triceps'], pull: ['biceps'] }, { push: ['chest', 'triceps'], pull: ['biceps'] }]
const PULL_SLOTS: Slot[] = [{ push: ['shoulders'], pull: ['back'] }, { push: ['shoulders'], pull: ['back'] }, { push: ['chest'], pull: ['back'] }]
const FULL_BODY_SLOTS: Slot[] = [{ push: ['quads'], pull: ['back'] }, { push: ['chest'], pull: ['hamstrings', 'glutes'] }, { push: ['shoulders'], pull: ['biceps'] }]

const SLOT_SETS = {
  legs: { title: 'Legs · Quads, Hamstrings & Glutes', muscles: ['Quads', 'Hamstrings', 'Glutes'], warm: 'legs' as const, slots: LEGS_SLOTS },
  push: { title: 'Push · Chest & Triceps', muscles: ['Chest', 'Triceps', 'Biceps'], warm: 'upper' as const, slots: PUSH_SLOTS },
  pull: { title: 'Pull · Shoulders & Back', muscles: ['Shoulders', 'Back'], warm: 'upper' as const, slots: PULL_SLOTS },
  full: { title: 'Full Body · Push + Pull', muscles: ['Full Body'], warm: 'legs' as const, slots: FULL_BODY_SLOTS },
}

// Legs-forward cadence for the app's real target avatar (women) — legs hit
// twice per 4-day cycle instead of once per 3-day cycle. A deliberate,
// previously-confirmed product choice, kept intact — just computed via a
// short rotation array now instead of 4 separately hand-written day objects.
const ROTATION_CYCLE: Record<'male' | 'female', Array<keyof typeof SLOT_SETS>> = {
  male: ['push', 'legs', 'pull'],
  female: ['legs', 'push', 'legs', 'pull'],
}

const clampDays = (d: number) => Math.min(Math.max(Math.round(d) || 3, 1), 6)

// Beginners (level 1) get Full Body every day regardless of day count —
// same reasoning as before (isolating splits aren't the right first-weeks
// program), just computed instead of special-cased per sex/day-count.
function splitFor(sex: WorkoutInputs['sex'], days: number, level: Level): DaySpec[] {
  const n = clampDays(days)
  if (level === 1) return Array(n).fill(SLOT_SETS.full)
  const cycle = sex === 'male' ? ROTATION_CYCLE.male : ROTATION_CYCLE.female // 'other'/undefined → female (avatar)
  return Array.from({ length: n }, (_, i) => SLOT_SETS[cycle[i % cycle.length]])
}

// The actual fix for "arms, legs, and core" only ever building "arms":
// builds a real day directly from whatever areas she named — any number of
// them — through the exact same Slot/DaySpec shape as the rotation above,
// so every downstream step (superset assembly, accessory, ab work, cardio)
// works identically whether a day came from the weekly rotation or from a
// live chat request. 2 slots per named area keeps a 1-area ask proportionate
// (~2 exercises) and a 3-area ask still a real, complete session (~6).
// Real bug found live: chest and back are each ENTIRELY one movement
// direction in GYM_POOL (every chest exercise is 'push', every back
// exercise is 'pull' — confirmed by reading the pool) — so building a slot
// as {push: m, pull: m} for either one asks pickGym for a movement that
// literally does not exist for that muscle. pickGym's fallback then quietly
// ignores the muscle filter and returns whatever's next in the whole pool,
// which is how "focus on my back" came back with tricep/calf/core exercises
// and only 2 real back moves. Every area gets a real antagonist pairing
// instead — the same pairing already used for the weekly rotation's own
// PUSH_SLOTS/PULL_SLOTS/LEGS_SLOTS above, so a live chat request and the
// normal weekly split build a day the exact same, correct way.
const AREA_SLOT_MUSCLES: Record<Exclude<FocusArea, 'core' | 'overall'>, { push: Muscle[]; pull: Muscle[] }> = {
  legs: { push: ['quads'], pull: ['glutes', 'hamstrings'] },
  arms: { push: ['triceps'], pull: ['biceps'] },
  chest: { push: ['chest'], pull: ['biceps'] },
  back: { push: ['shoulders'], pull: ['back'] },
  shoulders: { push: ['shoulders'], pull: ['shoulders'] },
}
export function daySpecFromAreas(areas: FocusArea[]): DaySpec {
  const bodyAreas = areas.filter((a): a is Exclude<FocusArea, 'core' | 'overall'> => a !== 'core' && a !== 'overall')
  const slots: Slot[] = bodyAreas.flatMap((area) => {
    const { push, pull } = AREA_SLOT_MUSCLES[area]
    return [{ push, pull }, { push, pull }]
  })
  const label = areas.map((a) => a === 'core' ? 'Core' : a === 'overall' ? 'Full Body' : a[0].toUpperCase() + a.slice(1)).join(' + ')
  return {
    title: `${label}${slots.length ? '' : ' · Full Body'}`,
    muscles: bodyAreas.length ? bodyAreas.map((a) => a[0].toUpperCase() + a.slice(1)) : ['Full Body'],
    warm: bodyAreas.includes('legs') ? 'legs' : 'upper',
    slots: slots.length ? slots : FULL_BODY_SLOTS,
  }
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
  // Real gap found: pickGym's own sort already puts free weights first
  // (barbell/dumbbell over machine/cable), but this bonus pick never had
  // that bias at all — plain rotation over the whole candidate list. Since
  // this only ever returns ONE exercise (not several to choose from like
  // pickGym), a soft sort-then-rotate tiebreak isn't reliable here — a
  // large rotation offset can still wrap straight past every free-weight
  // candidate into machine territory. Restricting to the free-weight subset
  // whenever one exists (falling back to the full pool only when it
  // genuinely doesn't) makes "prioritize free weights" actually hold,
  // regardless of offset.
  const candidates = GYM_POOL.filter(ok)
  const freeCandidates = candidates.filter((e) => e.free)
  const pick = rotate(freeCandidates.length ? freeCandidates : candidates, offset)[0]
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
  // A live chat ask should also steer the bonus accessory pick and the
  // exact-vs-fallback sort priority in pickGym — without this, "focus on my
  // back" built a real back-targeted day 0 (see daySpecFromAreas) but the
  // bonus accessory exercise still came from her unrelated PERMANENT
  // preference, not what she actually asked for right now.
  const targets = (inp.targets && inp.targets.length) ? inp.targets
    : inp.overrideAreas?.length ? inp.overrideAreas.flatMap((a) => FOCUS_TARGETS[a])
    : FOCUS_TARGETS[inp.focusArea || 'overall']
  const coreFocus = inp.focusArea === 'core' || !!inp.overrideAreas?.includes('core')
  const split = splitFor(inp.sex, inp.daysPerWeek || 3, level)
  // A live chat ask for specific areas replaces "today" (day 0) with a day
  // built directly from exactly what she named — every other day in her
  // week keeps its normal rotation assignment, untouched.
  if (inp.overrideAreas?.length) split[0] = daySpecFromAreas(inp.overrideAreas)

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
  const cycle = ['Leg Focus', 'Upper Body & Core']
  return Array.from({ length: n }, (_, i) => cycle[i % 2]) // n=3 → Leg/Upper/Leg, matches the original default exactly
}

// Bodyweight-only priority/postpartum ab moves (no plates/kettlebells) — the home
// track's equivalent of pickAb's priority pool. Weighted or KB-named entries need
// equipment a home session doesn't assume, so those stay gym-only.
const HOME_AB_PRIORITY = AB_POOL.filter(a => a.priority && !a.weighted && !a.name.startsWith('KB '))

function generateHome(inp: WorkoutInputs): WorkoutProgram['home'] {
  const level = inp.level
  const week = inp.weekNumber || 1
  const coreFocus = inp.focusArea === 'core' || !!inp.overrideAreas?.includes('core')
  // Home exercises only carry a broad 'leg'/'upper'/'core'/'cardio' type, not
  // per-muscle data like GYM_POOL — 'upper' is the closest available proxy
  // for "arms & back". On a split that's already Leg-day/Upper-day
  // alternating, every non-core pick on the matching day is already 100% the
  // focus type (nothing to reorder) — the partition below mainly matters on
  // Full Body days (level 1 or a 1-day/week split), where leg/upper/core mix
  // together. The count bump below is what actually adds real extra volume
  // on every split, tested against a real generated program before shipping.
  // A live chat override with any upper-body area (arms/chest/back/shoulders)
  // maps to the same 'upper' proxy — the real per-muscle split lives on the
  // gym track (GYM_POOL has the fine-grained tags); this is home's honest ceiling.
  const overrideUpper = inp.overrideAreas?.some((a) => a === 'arms' || a === 'chest' || a === 'back' || a === 'shoulders')
  // Real bug found live: coreFocus and focusType used to be mutually
  // exclusive (coreFocus ? null : ...), so a compound request that included
  // 'core' alongside a real body area ("arms, legs, and core") silently
  // dropped ALL leg/upper targeting the moment core was one of the areas
  // named — the session came back almost entirely core/cardio content with
  // at most one stray upper move, nothing resembling "legs" at all. core
  // only controls the separate ab-set bonus below; it should never override
  // which non-core type gets prioritized.
  const focusType: 'leg' | 'upper' | null =
    inp.overrideAreas?.includes('legs') ? 'leg' : overrideUpper ? 'upper'
    : coreFocus ? null
    : inp.focusArea === 'legs' ? 'leg' : inp.focusArea === 'arms' ? 'upper' : null
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
// Accepts one area or several — a compound ask ("arms, legs, and core")
// scores every day against the UNION of all named areas' targets rather than
// only the first one, so the day picked is whichever real day overlaps the
// most with everything she asked for, not just the first-named area.
export function pickFocusDayIndex(program: WorkoutProgram, focusArea?: FocusArea | FocusArea[]): number {
  const areas = (Array.isArray(focusArea) ? focusArea : focusArea ? [focusArea] : []).filter((a) => a !== 'overall')
  if (!areas.length) return 0
  if (program.track === 'gym' && program.gymDays?.length) {
    const bodyAreas = areas.filter((a): a is Exclude<FocusArea, 'core' | 'overall'> => a !== 'core')
    const wantsCore = areas.includes('core')
    if (!bodyAreas.length && wantsCore) {
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
      const idx = program.gymDays.findIndex(d => !/leg|lower|full body/i.test(d.title))
      return idx >= 0 ? idx : 0
    }
    const targets = bodyAreas.flatMap((a) => FOCUS_TARGETS[a])
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
    // of falling through to day 0. Home's bodyweight pool has no chest/back/
    // shoulders-specific split (equipment-free training doesn't usually
    // isolate that finely, and the pool doesn't have the exercise variety to
    // justify one) — all three route to the same "Upper" day arms already did.
    const wantsUpper = areas.some((a) => a === 'arms' || a === 'chest' || a === 'back' || a === 'shoulders')
    const wantType = wantsUpper ? 'Upper' : areas.includes('legs') ? 'Leg' : areas.includes('core') ? 'Core' : null
    if (wantType) {
      const idx = program.home.days.findIndex(d => d.title.includes(wantType))
      if (idx >= 0) return idx
    }
  }
  return 0
}

// Real progressive overload — the one new capability asked for on top of
// the Fitbod-style rewrite: "either time or weight or both, based off the
// user's level." No per-exercise weight log exists anywhere in this app
// (challenge_progress only ever tracked workout-done/nutrition-done
// booleans, not sets/reps/weight — confirmed by reading the schema before
// building this), so a computed "add exactly 5lbs" number would be
// fabricated, not real. What IS real and available today: her own logged
// training consistency. A genuinely consistent pattern — the caller
// computes this from real challenge_progress dates, see
// app/plan/workout/page.tsx — is exactly the standard trigger real coaches
// use to tell a client to push harder. Gym gets a WEIGHT/rep cue (no real
// weight data to compute a number from, so it names the action instead of
// inventing one); home/bodyweight gets a real TIME bump, since duration is
// something this function actually controls. Pure post-process over an
// already-built program — never changes exercise selection, only the
// load/duration presented for it, so it can't introduce a selection bug.
const PROGRESSION_THRESHOLD_WEEKS = 3
export function applyProgressiveOverload(program: WorkoutProgram, consistencyWeeks: number): WorkoutProgram {
  if (consistencyWeeks < PROGRESSION_THRESHOLD_WEEKS) return program
  const note = `${consistencyWeeks} weeks consistent at this level — time to push a little harder.`
  if (program.track === 'gym' && program.gymDays?.length) {
    const cue = ' — go up in weight or reps from last time'
    const gymDays = program.gymDays.map((day) => ({
      ...day,
      supersets: day.supersets.map((s) => (s.reps.includes(cue) ? s : { ...s, reps: `${s.reps}${cue}` })),
    }))
    return { ...program, gymDays, progressionNote: note }
  }
  if (program.track === 'home' && program.home) {
    const bump = (d: string): string => {
      const m = d.match(/^(\d+)(\D*)$/)
      if (!m) return d
      return `${Math.round(parseInt(m[1], 10) * 1.2)}${m[2]}`
    }
    const days = program.home.days.map((day) => ({
      ...day,
      exercises: day.exercises.map((e) => ({ ...e, duration: bump(e.duration) })),
    }))
    return { ...program, home: { ...program.home, days }, progressionNote: note }
  }
  return program
}
