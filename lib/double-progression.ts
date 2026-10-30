// Double progression (2026-10-30, Asa's pick — the r/Fitness beginner
// routine / Fierce 5 / PHUL / Caliber standard, ACSM ranges).
//
// Every lift has a rep RANGE. She sees ONE target number per set: it starts
// at the bottom of the range and climbs a rep (two if every set felt Easy)
// each session she finishes every set without the last one feeling Hard.
// At the top of the range the next session says "Go up a weight today" and
// the target drops back to the bottom. Bodyweight moves have no weight to
// add, so at 15 they get slower (3 seconds down) and reset to 8.
//
// Pure functions only — no database, no React — so the workout engine,
// the API and a plain tsx simulation all run the exact same rules. State is
// never stored as its own row: it is REPLAYED from her real logged sets
// (workout_set_logs — one row per set she taps Done on, plus the Easy/Hard
// row when she taps one), so it can never drift from what she actually did.
// ============================================================

export type Effort = 'easy' | 'right' | 'hard'
export type LiftRole = 'compound' | 'accessory'
export type Goal = 'lose' | 'gain' | 'maintain' | 'recomp'

export interface RepRange { lo: number; hi: number; sets: number; bodyweight: boolean }

export const BLOCK_WEEKS = 6
/** Week 6, 12, 18… of training: same moves, half the sets. */
export const isDeloadWeek = (week: number) => week > 0 && week % BLOCK_WEEKS === 0
/** First week of the 6-week block `week` falls in (1, 7, 13…). Exercise picks key off this, so they hold for the block. */
export const blockStartWeek = (week: number) => Math.floor((Math.max(1, week) - 1) / BLOCK_WEEKS) * BLOCK_WEEKS + 1
export const deloadSets = (sets: number) => Math.max(1, Math.ceil(sets / 2))

export const DELOAD_CUE = 'Light week. Same moves, easier.'
export const BODYWEIGHT_LO = 8
export const BODYWEIGHT_HI = 15

/** Rep range + sets by level (1 beginner, 2 intermediate, 3 advanced → intermediate rules), goal and role.
 *  Beginner: compounds 8–12 (lose fat 10–15) × 3, accessories 10–15 (lose fat 12–15) × 2.
 *  Intermediate+: compounds 6–10 (lose fat 10–15) × 3 (4 to build muscle), accessories 10–15 (lose fat 12–15) × 3.
 *  Bodyweight: always 8–15. */
export function repRange(level: number, goal: Goal, role: LiftRole, bodyweight: boolean): RepRange {
  const beginner = level <= 1
  const sets = role === 'compound' ? (beginner ? 3 : goal === 'gain' ? 4 : 3) : (beginner ? 2 : 3)
  if (bodyweight) return { lo: BODYWEIGHT_LO, hi: BODYWEIGHT_HI, sets, bodyweight }
  const lose = goal === 'lose'
  if (role === 'accessory') return lose ? { lo: 12, hi: 15, sets, bodyweight } : { lo: 10, hi: 15, sets, bodyweight }
  if (lose) return { lo: 10, hi: 15, sets, bodyweight }
  return beginner ? { lo: 8, hi: 12, sets, bodyweight } : { lo: 6, hi: 10, sets, bodyweight }
}

export const schemeText = (sets: number, r: RepRange) => `${sets} × ${r.lo}–${r.hi}`

export type Outcome = 'start' | 'up_reps' | 'add_weight' | 'add_two_weights' | 'harder' | 'hold' | 'miss' | 'drop'

export interface ProgressState {
  target: number       // the one rep number on screen next session
  misses: number       // misses in a row
  outcome: Outcome     // what the last counted session did
  bwStage: number      // bodyweight only: 0 normal, 1 slow lowering, 2+ slow + pause
  cue?: string         // short line under the reps next session
}

export const startState = (r: RepRange): ProgressState => ({ target: r.lo, misses: 0, outcome: 'start', bwStage: 0 })

const bwReminder = (stage: number) => stage <= 0 ? undefined : stage === 1 ? 'Keep it slow: 3 seconds down.' : 'Slow down, pause 2 seconds at the bottom.'

/** One finished session → the next session's target + cue.
 *  `efforts` = one entry per set she finished, in order ('right' when she didn't tap Easy/Hard). */
export function nextState(s: ProgressState, r: RepRange, efforts: Effort[]): ProgressState {
  const complete = efforts.length >= r.sets
  const last = efforts[efforts.length - 1]
  const allEasy = complete && efforts.every((e) => e === 'easy')
  const allHard = efforts.length > 0 && efforts.every((e) => e === 'hard')

  // Miss: fewer sets than planned, or every set Hard at the bottom of the range.
  if (!complete || (allHard && s.target <= r.lo)) {
    const misses = s.misses + 1
    if (misses >= 2) {
      return { target: r.lo, misses: 0, outcome: 'drop', bwStage: r.bodyweight ? Math.max(0, s.bwStage - 1) : s.bwStage,
        cue: r.bodyweight ? 'Make it a little easier today.' : 'Drop a little weight today.' }
    }
    return { ...s, misses, outcome: 'miss', cue: r.bodyweight ? bwReminder(s.bwStage) : undefined }
  }

  // Finished, but the last set was Hard: same number again.
  if (last === 'hard') return { ...s, misses: 0, outcome: 'hold', cue: r.bodyweight ? bwReminder(s.bwStage) : undefined }

  // Finished at the top of the range: heavier (or slower, bodyweight), back to the bottom.
  if (s.target >= r.hi) {
    if (r.bodyweight) {
      const bwStage = s.bwStage + 1
      return { target: r.lo, misses: 0, outcome: 'harder', bwStage,
        cue: bwStage === 1 ? 'Slow it down: 3 seconds down.' : 'Harder now: 3 seconds down, pause at the bottom.' }
    }
    return allEasy
      ? { target: r.lo, misses: 0, outcome: 'add_two_weights', bwStage: 0, cue: 'Go up two weights today.' }
      : { target: r.lo, misses: 0, outcome: 'add_weight', bwStage: 0, cue: 'Go up a weight today.' }
  }

  return { target: Math.min(r.hi, s.target + (allEasy ? 2 : 1)), misses: 0, outcome: 'up_reps', bwStage: s.bwStage,
    cue: r.bodyweight ? bwReminder(s.bwStage) : undefined }
}

export interface ExerciseSession { name: string; week: number; efforts: Effort[] }

/** Replay every counted session (oldest first). Deload-week sessions never move the target. */
export function replay(r: RepRange, sessions: ExerciseSession[]): ProgressState {
  let s = startState(r)
  for (const x of sessions) {
    if (isDeloadWeek(x.week)) continue
    s = nextState(s, r, x.efforts)
  }
  // A range change (new goal/level) keeps the number inside the new range.
  return { ...s, target: Math.max(r.lo, Math.min(r.hi, s.target)) }
}

export interface ExerciseTarget { reps: number; cue?: string; lo: number; hi: number }

/** What the screen shows for one exercise this week. */
export function targetFor(r: RepRange, sessions: ExerciseSession[], week: number): ExerciseTarget {
  const s = replay(r, sessions)
  return { reps: s.target, cue: isDeloadWeek(week) ? DELOAD_CUE : s.cue, lo: r.lo, hi: r.hi }
}

// ---- logged rows → sessions ----
export interface SetLogRow { exercise_name: string; effort: string; set_index: number; created_at: string }

const SESSION_GAP_MS = 3 * 3600 * 1000
const weekOf = (startMs: number, atMs: number) => Math.max(1, Math.floor(Math.floor((atMs - startMs) / 86400000) / 7) + 1)

/** Groups workout_set_logs rows into sessions per exercise. Every set she taps Done on writes a
 *  'right' row; an Easy/Hard tap writes a second row for the same set, and that one wins. A
 *  session with no 'right' row at all is from before Done was logged (only some sets were ever
 *  recorded then), so it's skipped rather than read as a miss. */
export function sessionsFromLogs(rows: SetLogRow[], enrollmentStartISO: string): Record<string, ExerciseSession[]> {
  const startMs = new Date(enrollmentStartISO).getTime() || 0
  const byName = new Map<string, SetLogRow[]>()
  for (const row of rows) {
    if (!row.exercise_name) continue
    const list = byName.get(row.exercise_name) || []
    list.push(row)
    byName.set(row.exercise_name, list)
  }
  const out: Record<string, ExerciseSession[]> = {}
  byName.forEach((list, name) => {
    list.sort((a, b) => a.created_at.localeCompare(b.created_at))
    const groups: SetLogRow[][] = []
    let lastMs = -Infinity
    for (const row of list) {
      const ms = new Date(row.created_at).getTime()
      if (ms - lastMs > SESSION_GAP_MS) groups.push([])
      groups[groups.length - 1].push(row)
      lastMs = ms
    }
    const sessions: ExerciseSession[] = []
    for (const g of groups) {
      if (!g.some((x) => x.effort === 'right')) continue
      const bySet = new Map<number, Effort>()
      for (const x of g) {
        const e = x.effort as Effort
        const prev = bySet.get(x.set_index)
        if (!prev || prev === 'right') bySet.set(x.set_index, e)
      }
      const efforts = Array.from(bySet.entries()).sort((a, b) => a[0] - b[0]).map(([, e]) => e)
      sessions.push({ name, week: weekOf(startMs, new Date(g[0].created_at).getTime()), efforts })
    }
    out[name] = sessions
  })
  return out
}
