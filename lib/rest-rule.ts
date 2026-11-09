// ============================================================
// Life-Up Fitness — the rest rule (2026-11-09, Asa's #1 fix)
//
// A body group (legs, chest, back, shoulders, arms) worked HARD can't be
// worked hard again until it has rested. Combo moves count for every muscle
// they use (lib/muscle-tags.ts), so "Squat + Curl" is leg work too.
//
// Today's workout = the next day in her rotation whose hard groups have all
// rested. If none has, today is a rest day (easy cardio + core).
// ============================================================
import { groupsWorked, BODY_GROUP_LABEL, type BodyGroup } from './muscle-tags'
import { ATOMIC_LIBRARY } from './exercise-library'
import type { GymDay, HomeDay } from './workout.types'

// ---- SETTINGS (change these numbers to change the rule) ----
/** Hours a body group rests after a hard session, by level (1 Beginner, 2 Intermediate, 3 Advanced). */
export const REST_HOURS: Record<1 | 2 | 3, number> = { 1: 72, 2: 48, 3: 48 }
/** "About" 48 hours: a session this many hours early still counts as rested (Mon 6pm → Wed 5pm is fine). */
export const REST_SLACK_HOURS = 4
/** A body group is worked HARD when it gets this many sets or more in one session. */
export const HARD_SETS = 5

/** Sets in a reps line: "3 × 8–12" → 3, "2 sets × 8–12" → 2, "30 sec" → 1. */
export function setsIn(reps: string | undefined): number {
  const m = (reps || '').match(/^\s*(\d+)\s*(?:×|x|sets?)/i)
  if (m) return Number(m[1])
  return /sec|min/i.test(reps || '') ? 1 : 3
}

const notLifting = (name: string) => {
  const e = ATOMIC_LIBRARY.find((x) => x.name === name)
  return !!e && (e.movementPattern === 'cardio' || e.movementPattern.startsWith('core_'))
}

/** The body groups a day works hard (core, cardio and warm-up don't count). */
export function dayHardGroups(day: GymDay | HomeDay | undefined): BodyGroup[] {
  if (!day) return []
  const sets = new Map<BodyGroup, number>()
  const add = (name: string, n: number) => { if (notLifting(name)) return; for (const g of groupsWorked(name)) sets.set(g, (sets.get(g) || 0) + n) }
  if ('exercises' in day) for (const x of day.exercises) add(x.name, setsIn(x.duration))
  else {
    for (const s of day.supersets || []) { const n = setsIn(s.reps); add(s.push.name, n); add(s.pull.name, n) }
    for (const a of day.accessory || []) add(a.name, setsIn(a.reps))
  }
  return Array.from(sets.entries()).filter(([, n]) => n >= HARD_SETS).map(([g]) => g)
}

export interface SetLogRow { exercise_name: string; set_index: number | null; created_at: string; muscle_groups?: string[] | null }

/** When each body group was last worked hard, from her logged sets.
 *  Sets within 3 hours of each other are one session. */
export function lastHardFromLogs(rows: SetLogRow[]): Partial<Record<BodyGroup, number>> {
  const sorted = [...rows].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
  const out: Partial<Record<BodyGroup, number>> = {}
  let session: SetLogRow[] = []
  const close = () => {
    if (!session.length) return
    const seen = new Set<string>()
    const sets = new Map<BodyGroup, number>()
    for (const r of session) {
      const key = `${r.exercise_name}#${r.set_index ?? 0}`
      if (seen.has(key) || notLifting(r.exercise_name)) continue
      seen.add(key)
      for (const g of groupsWorked(r.exercise_name)) sets.set(g, (sets.get(g) || 0) + 1)
    }
    const end = Date.parse(session[session.length - 1].created_at)
    sets.forEach((n, g) => { if (n >= HARD_SETS) out[g] = Math.max(out[g] || 0, end) })
    session = []
  }
  for (const r of sorted) {
    if (session.length && Date.parse(r.created_at) - Date.parse(session[session.length - 1].created_at) > 3 * 3600e3) close()
    session.push(r)
  }
  close()
  return out
}

export interface RestPick {
  index: number          // the day to show (on a rest day, her next due day)
  rest: boolean          // true = nothing is rested enough, today is a rest day
  tired: BodyGroup[]     // groups still resting
  readyAt?: number       // rest day: when her next due day is rested
}

/** First day from `startDay` on (in rotation order) whose hard groups have all rested. */
export function pickRestedDay(days: (GymDay | HomeDay)[], startDay: number, lastHard: Partial<Record<BodyGroup, number>>, level: number, now = Date.now()): RestPick {
  const restMs = (REST_HOURS[(Math.min(3, Math.max(1, Math.round(level))) as 1 | 2 | 3)] - REST_SLACK_HOURS) * 3600e3
  const tired = (Object.entries(lastHard) as [BodyGroup, number][]).filter(([, t]) => now - t < restMs).map(([g]) => g)
  const n = days.length
  if (!n || !tired.length) return { index: startDay, rest: false, tired }
  for (let k = 0; k < n; k++) {
    const i = (startDay + k) % n
    if (!dayHardGroups(days[i]).some((g) => tired.includes(g))) return { index: i, rest: false, tired }
  }
  const due = dayHardGroups(days[startDay]).filter((g) => tired.includes(g))
  const readyAt = Math.max(...due.map((g) => (lastHard[g] || 0) + restMs))
  return { index: startDay, rest: true, tired, readyAt }
}

export const REST_DAY_TITLE = 'Rest Day · Easy Cardio + Core'

/** "Your legs & glutes are resting until Thursday. Easy cardio and core today." */
export function restDayLine(pick: RestPick, timeZone?: string): string {
  const names = pick.tired.map((g) => BODY_GROUP_LABEL[g].toLowerCase())
  const list = names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
  const day = pick.readyAt ? new Date(pick.readyAt).toLocaleDateString('en-US', { weekday: 'long', timeZone }) : ''
  return `Your ${list || 'muscles'} ${names.length === 1 ? 'is' : 'are'} resting${day ? ` until ${day}` : ''}. Easy cardio and core today.`
}
