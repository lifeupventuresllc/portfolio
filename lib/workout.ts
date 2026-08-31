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
import { FORM_IMAGES } from './exercise-images'

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
  accessory: { name: string; reps: string; cue: string; imageUrl?: string }[]
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
// A slot is normally one push-movement exercise paired with one
// pull-movement exercise (a real antagonist superset). `{ same, muscles }`
// (added 2026-08-31) is the other real shape: TWO exercises of the SAME
// movement type, both targeting `muscles` — the only correct way to
// represent a genuinely single-area chest or back request (see
// daySpecFromAreas below for why `{push:m, pull:m}` doesn't work for
// either of those two).
type Slot = { push: Muscle[]; pull: Muscle[] } | { same: Movement; muscles: Muscle[] }
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
//
// Real bug found live, 2026-08-31 (Asa: "give me a back workout" came back
// naming shoulder exercises too; "when creating workouts we have to use
// what the user is giving us"): chest and back are each ENTIRELY one
// movement direction in GYM_POOL (every chest exercise is 'push', every
// back exercise is 'pull') — an EARLIER version of this file paired each
// with itself ({push: m, pull: m}), which asked pickGym for a movement
// that literally does not exist for that muscle, so its fallback quietly
// ignored the muscle filter and returned random unrelated exercises (see
// git history) — worse. That was "fixed" by pairing chest with biceps and
// back with shoulders instead (a real antagonist superset, at least
// on-topic-adjacent) — but that's still not what she asked for: naming
// "back" got real back work with shoulder exercises mixed in, silently
// deciding for her that she wanted a combined session. `same` (Slot's
// other real shape, see its type comment) is the actual correct fix for
// these two specifically — two real chest-push or back-pull exercises,
// genuinely single-area, nothing she didn't ask for riding along.
const AREA_SLOT_MUSCLES: Record<Exclude<FocusArea, 'core' | 'overall'>, { push: Muscle[]; pull: Muscle[] } | { same: Movement; muscles: Muscle[] }> = {
  legs: { push: ['quads'], pull: ['glutes', 'hamstrings'] },
  arms: { push: ['triceps'], pull: ['biceps'] },
  chest: { same: 'push', muscles: ['chest'] },
  back: { same: 'pull', muscles: ['back'] },
  shoulders: { push: ['shoulders'], pull: ['shoulders'] },
}
export function daySpecFromAreas(areas: FocusArea[]): DaySpec {
  const bodyAreas = areas.filter((a): a is Exclude<FocusArea, 'core' | 'overall'> => a !== 'core' && a !== 'overall')
  const slots: Slot[] = bodyAreas.flatMap((area) => {
    const spec = AREA_SLOT_MUSCLES[area]
    return [spec, spec]
  })
  // Real bug found live, 2026-08-31 (Asa: "make me an ab workout only" at
  // the gym came back titled "Core · Full Body" and was, underneath, a
  // genuine full-body day with one bonus ab exercise tacked on — she read
  // "Full Body" and correctly concluded nothing had actually changed).
  // `bodyAreas` deliberately excludes 'core' (it isn't a push/pull slot
  // area), so a real core-ONLY request always produced empty `bodyAreas`/
  // `slots` — indistinguishable, before this fix, from a genuine no-
  // preference request, which is the only case the FULL_BODY_SLOTS
  // fallback and " · Full Body" label were ever meant for. `coreOnly` names
  // that real distinction: an explicit ask for core and nothing else.
  const coreOnly = areas.length > 0 && bodyAreas.length === 0 && areas.includes('core')
  const label = areas.map((a) => a === 'core' ? 'Core' : a === 'overall' ? 'Full Body' : a[0].toUpperCase() + a.slice(1)).join(' + ')
  return {
    // Pre-existing cosmetic bug, noticed and fixed in passing: an empty
    // `areas` (a genuine "overall, no preference" request) left `label`
    // empty too, so the suffix produced a stray leading space (" · Full
    // Body") instead of just "Full Body".
    title: label ? `${label}${slots.length || coreOnly ? '' : ' · Full Body'}` : 'Full Body',
    muscles: bodyAreas.length ? bodyAreas.map((a) => a[0].toUpperCase() + a.slice(1)) : coreOnly ? ['Core'] : ['Full Body'],
    warm: bodyAreas.includes('legs') ? 'legs' : 'upper',
    // A real core-only day skips the full-body push/pull filler outright —
    // generateGym (below) gives it real, substantial ab content instead,
    // rather than quietly building a full-body day regardless of what she
    // actually asked for.
    slots: slots.length ? slots : coreOnly ? [] : FULL_BODY_SLOTS,
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
function pickFocusAccessory(muscles: Muscle[], level: Level, goal: WorkoutInputs['goal'], offset: number, injuries: Injury[], usedNames: Set<string>): { name: string; reps: string; cue: string; imageUrl?: string } | null {
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
  return { name: pick.name, reps: repScheme(level, goal), cue: `${pick.cue} (bonus set — from your chosen focus area)`, imageUrl: pick.imageUrl }
}

// Priority pool (Asa's curated screenshot batch) is the PRIMARY source now — the
// original generic pool is only a fallback for zone/level combos priority doesn't
// cover. Postpartum-flagged entries take priority over priority over generic when
// she's flagged postpartum in intake. Injury filtering was missing here entirely
// before (pre-existing gap, not introduced by the priority-pool work) — pickGym and
// generateHome both already filtered by injuries, this closes the same gap for abs.
//
// `excludeNames` (added 2026-08-31): real bug found chasing a different one — a
// beginner-level gym program has exactly ONE `priority` entry in the 'upper' zone
// ("Weighted Toe Touch (Beginner)"), so `rotate(priority, offset)[0]` returns that
// SAME exercise for every offset, always — the existing bonus-ab dedup retry
// elsewhere in this file (a different offset on a name collision) was silently
// ineffective for any beginner, since a 1-item array rotates to itself regardless
// of offset. Falls through past the priority tier to the full zone/level pool once
// every priority option is excluded, instead of only ever considering priority.
export function pickAb(zone: 'upper' | 'lower', level: Level, offset: number, postpartum = false, injuries: Injury[] = [], excludeNames: string[] = []): AbExercise {
  const base = AB_POOL.filter(a => a.zone === zone && a.minLevel <= level)
  const safe = base.filter(a => !isContraindicated(a.name, injuries))
  const inZoneLevel = safe.length ? safe : base // never end up with nothing just because every option got excluded
  const fresh = (arr: AbExercise[]) => arr.filter((a) => !excludeNames.includes(a.name))
  if (postpartum) {
    const pp = inZoneLevel.filter(a => a.postpartum)
    const ppFresh = fresh(pp)
    if (ppFresh.length) return rotate(ppFresh, offset)[0]
    if (pp.length) return rotate(pp, offset)[0]
  }
  const priority = inZoneLevel.filter(a => a.priority && !a.postpartum)
  const priorityFresh = fresh(priority)
  if (priorityFresh.length) return rotate(priorityFresh, offset)[0]
  const anyFresh = fresh(inZoneLevel)
  if (anyFresh.length) return rotate(anyFresh, offset)[0]
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
  // week keeps its normal rotation assignment, untouched. Checked by
  // presence, not length: an explicit EMPTY array (she said "overall," see
  // the cold-start build in route.ts) still means "override day 0" — real
  // gap found live, a cold-start "overall" request used to fall through to
  // whatever day 0 of the normal weekly rotation happened to be (a female
  // plan's rotation opens on a leg day), so an "overall" ask could still
  // come back looking like a leg-specific session. daySpecFromAreas([])
  // already builds a genuine full-body day for exactly this case — it just
  // never used to get called for it.
  if (inp.overrideAreas !== undefined) split[0] = daySpecFromAreas(inp.overrideAreas)

  return split.map((spec, i) => {
    const dayNum = i + 1
    const off = week + i // vary by week AND day
    // Fill each push/pull slot from its allowed muscles, no repeats within the day.
    const usedPush = new Set<string>()
    const usedPull = new Set<string>()
    const supersets: Superset[] = spec.slots.map((slot, s) => {
      // A `same`-shaped slot (see Slot's type comment) is two exercises of
      // the SAME movement type, both real matches for what was actually
      // asked — used instead of an unrelated push/pull pairing for the two
      // areas (chest, back) that are genuinely one movement direction only.
      if ('same' in slot) {
        const used = slot.same === 'push' ? usedPush : usedPull
        const firstC = pickGym(slot.same, slot.muscles, level, off + s, 6, injuries, targets)
        const first = firstC.find(e => !used.has(e.name)) || firstC[0]
        used.add(first.name)
        const secondC = pickGym(slot.same, slot.muscles, level, off + s + 1, 6, injuries, targets)
        const second = secondC.find(e => e.name !== first.name && !used.has(e.name)) || secondC.find(e => e.name !== first.name) || secondC[0]
        used.add(second.name)
        return { title: `${first.name} + ${second.name}`, push: first, pull: second, reps: repScheme(level, inp.goal) }
      }
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
    const lowerAb = pickAb('lower', level, off + 2, inp.postpartum, injuries)
    // Real gap found live: the bonus ab pick and the regular upper ab pick
    // are both drawn from the same 'upper' zone — a small filtered pool
    // (postpartum/level/injury-narrowed) could land both offsets on the
    // identical exercise, showing the same name twice in one list.
    // `usedAbNames` (extended 2026-08-31 alongside pickAb's own excludeNames
    // fix — see its comment) accumulates every ab name already picked THIS
    // day, so every later pick actively avoids all of them, not just the one
    // immediately before it.
    const usedAbNames = [upperAb.name, lowerAb.name]
    let bonusAb: AbExercise | undefined
    if (coreFocus) {
      bonusAb = pickAb('upper', level, off + 5, inp.postpartum, injuries, usedAbNames)
      usedAbNames.push(bonusAb.name)
    }
    return {
      dayNum,
      title: spec.title,
      muscles: spec.muscles,
      warmup: WARMUPS[spec.warm],
      supersets,
      // Real gap found live (direct question, not a guess): calf/ankle work
      // used to be hardcoded onto EVERY single day regardless of what that
      // day actually trains — a chest or back day would still tack on calf
      // raises, which aren't required by anything that day's supersets
      // actually target. Only include them on a day that genuinely trains
      // legs (or a full-body day, which does too) — a push/pull/upper day
      // gets none, same "is it required for this?" test as everywhere else
      // in this codebase.
      accessory: [
        ...(spec.muscles.some((m) => /quad|hamstring|glute|leg|full body/i.test(m)) ? [
          { name: 'Standing Calf Raise', reps: level === 1 ? '2 × 15–20' : '3 × 15–20', cue: 'Rise onto toes, squeeze at the top, lower slow for a full stretch.', imageUrl: FORM_IMAGES['Standing Calf Raise'] },
          { name: 'Single-Arm Tibialis Raise (wall)', reps: '2 × 15 each', cue: 'Back to wall, lift toes toward shins, squeeze the shin, lower slow.', imageUrl: FORM_IMAGES['Single-Arm Tibialis Raise (wall)'] },
        ] : []),
        ...(focusBonus ? [focusBonus] : []),
        // Real fix, 2026-08-31: a genuine core-only day (spec.slots empty —
        // see daySpecFromAreas' coreOnly branch) has zero supersets by
        // design now, so without this it'd be left with just 2-3 ab
        // exercises total — barely a real session for something she
        // explicitly asked for. Two more real AB_POOL picks make it an
        // actually substantial, genuinely core-focused day — each excludes
        // every ab name already used today (usedAbNames), so a small
        // priority pool (see pickAb's own fix) can't quietly repeat the
        // same exercise three times over.
        ...(spec.slots.length === 0 && coreFocus ? (() => {
          const extraUpper = pickAb('upper', level, off + 8, inp.postpartum, injuries, usedAbNames)
          const extraLower = pickAb('lower', level, off + 9, inp.postpartum, injuries, [...usedAbNames, extraUpper.name])
          return [extraUpper, extraLower].map((a) => ({ name: a.name, reps: AB_SCHEME[level], cue: a.cue, imageUrl: a.imageUrl }))
        })() : []),
      ],
      ab: {
        upper: upperAb,
        lower: lowerAb,
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
  // Home exercises carry a broad 'leg'/'upper'/'core'/'cardio' type — 'upper'
  // covers arms/chest/back/shoulders together, plus an optional `sub` tag
  // (added 2026-08-31) narrowing a subset of them to one specific area; see
  // requestedUpperSubs below for how that gets preferred. On a split that's
  // already Leg-day/Upper-day alternating, every non-core pick on the
  // matching day is already 100% the focus type (nothing to reorder) — the
  // partition below mainly matters on Full Body days (level 1 or a 1-day/week
  // split), where leg/upper/core mix together. The count bump below is what
  // actually adds real extra volume on every split, tested against a real
  // generated program before shipping.
  const overrideUpper = inp.overrideAreas?.some((a) => a === 'arms' || a === 'chest' || a === 'back' || a === 'shoulders')
  // The specific upper-body area(s) named, if any (arms/chest/back/shoulders
  // — never 'legs'/'core'/'overall') — used below to prefer HOME_POOL's real
  // `sub`-tagged exercises for that exact area over the generic 'upper' pool,
  // so "shoulders" and "chest" stop coming back as the identical workout.
  const requestedUpperSubs = (inp.overrideAreas || []).filter((a): a is 'arms' | 'chest' | 'back' | 'shoulders' => a === 'arms' || a === 'chest' || a === 'back' || a === 'shoulders')
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
  // Same fix as generateGym's daySpecFromAreas call: an explicit EMPTY
  // overrideAreas (she said "overall," see the cold-start build in
  // route.ts) still means "override day 0" — without this, an "overall"
  // request could land on day 0 of the normal Leg/Upper alternating split,
  // which opens on "Leg Focus," making a genuinely no-preference ask look
  // leg-specific. Forcing the label routes it into the mixed
  // leg+upper+core branch below, same as any other Full Body day.
  if (inp.overrideAreas?.length === 0) split[0] = 'Full Body'

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
    // Real gap found live: a genuine full-body day (both 'leg' and 'upper' in
    // types, no single focusType bias) used to lump them into ONE combined,
    // rotated pool and just take the first N — since HOME_POOL happens to
    // list several consecutive beginner leg entries before its first upper
    // entry, an "overall" session could come back with ZERO upper-body work,
    // purely from pool-order luck, not by design. Splitting the remaining
    // count evenly between a real leg pool and a real upper pool guarantees
    // an actual mix every time instead of leaving it to chance.
    if (!focusType && types.includes('leg') && types.includes('upper')) {
      const legCount = Math.ceil(remaining / 2)
      const upperCount = remaining - legCount
      const pickType = (type: 'leg' | 'upper', typeOff: number, n: number) => {
        const atLevel = avail.filter(e => e.type === type && e.level === level)
        const lower = avail.filter(e => e.type === type && e.level < level)
        return rotate(atLevel, typeOff).concat(rotate(lower, typeOff)).slice(0, n)
          .map(e => ({ name: e.name, duration: '30 sec', imageUrl: e.imageUrl }))
      }
      return picked.concat(pickType('leg', off, legCount), pickType('upper', off + 3, upperCount))
    }
    // Focus-type moves partitioned to the FRONT before rotating, not sorted-then-rotated —
    // rotating a sorted array can shove the very items we just prioritized to the back,
    // silently undoing the prioritization. Each partition still rotates independently so
    // week-to-week variety is preserved within it.
    // Real gap found live, 2026-08-31: within the 'upper' focus-type bucket,
    // a named specific area (e.g. "shoulders") still pulled from the whole
    // undifferentiated 'upper' pool — since HOME_POOL now tags real exercises
    // with `sub`, split the 'upper' hi-bucket itself: sub-matched entries
    // first, everything else 'upper' after, so a small pool still surfaces
    // the genuinely relevant moves before falling back to generic upper work.
    // hiSub/hiRest kept as SEPARATE tiers (not pre-concatenated) so each can
    // be rotated independently below — rotating a combined array can shove
    // sub-matched entries behind generic ones depending on `off`, silently
    // undoing the exact prioritization this exists for.
    const split2 = (arr: typeof avail) => {
      if (!focusType) return { hiSub: [] as typeof avail, hiRest: [] as typeof avail, lo: arr }
      const focusArr = arr.filter(e => e.type === focusType)
      const useSubs = requestedUpperSubs.length > 0 && focusType === 'upper'
      const hiSub = useSubs ? focusArr.filter(e => e.sub && requestedUpperSubs.includes(e.sub)) : []
      const hiRest = useSubs ? focusArr.filter(e => !e.sub || !requestedUpperSubs.includes(e.sub)) : focusArr
      return { hiSub, hiRest, lo: arr.filter(e => e.type !== focusType) }
    }
    const atLevelSplit = split2(avail.filter(e => types.includes(e.type) && e.type !== 'cardio' && e.level === level))
    const lowerSplit = split2(avail.filter(e => types.includes(e.type) && e.type !== 'cardio' && e.level < level))
    const ordered = rotate(atLevelSplit.hiSub, off).concat(rotate(atLevelSplit.hiRest, off), rotate(atLevelSplit.lo, off), rotate(lowerSplit.hiSub, off), rotate(lowerSplit.hiRest, off), rotate(lowerSplit.lo, off))
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
    // Real bug found live, 2026-08-31: this used to key purely off the day's
    // generic split LABEL ("Leg Focus"/"Upper Body & Core"/"Full Body") —
    // but homeSplit() gives every day the literal label "Full Body" for any
    // beginner-level program (see homeSplit above), so an explicit chat
    // override (focusType, set from overrideAreas — e.g. she asked for an
    // arm workout) never actually narrowed the eligible pool for a beginner.
    // With only 2-3 real 'upper'-type entries in the whole HOME_POOL,
    // byType()'s fallback (below, when the focus-type pool runs dry) fell
    // through to whatever else `types` still allowed — 'leg' exercises,
    // since the label-derived types stayed ['leg','upper','core'] regardless
    // of what she asked for. That's why an "arm workout" request could come
    // back listing Bodyweight Squats and Lunges right alongside real arm
    // moves. An explicit focusType now takes priority over the day's label —
    // 'leg' is never eligible when she asked for an upper-body area, and
    // vice versa, so the fallback can only ever reach for MORE of what she
    // actually asked for (or core), never the type she didn't ask for.
    if (focusType === 'leg') types = ['leg', 'core']
    else if (focusType === 'upper') types = ['upper', 'core']
    else if (focus.startsWith('Leg')) types = ['leg', 'core']
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
