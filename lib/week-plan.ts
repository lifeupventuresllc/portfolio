// My Plan (2026-11-17, Asa: "build it in order of priority" — step 1 of the
// workout-system list). Her week, Monday to Sunday: which days she lifts,
// which she rests, and where she is in her 6-week block. Pure function, no
// database: the caller passes what really happened (days she worked out) and
// what the engine has next (the rotation of her plan's days).
//
// The engine is a rotation, not fixed weekdays: her next workout is always
// the next day of her plan, whatever day she does it. So the week is laid
// out from today forward: today gets today's workout (unless it's a rest
// pick or she's already done), and the rest of this week's goal is spread
// over the days left, rest days in between where they fit.
import { BLOCK_WEEKS } from './double-progression'

export type PlanDayKind = 'done' | 'today' | 'later' | 'rest'
export interface PlanDay {
  label: string        // MON
  date: number         // 17
  iso: string
  kind: PlanDayKind
  title: string        // "Compound · Lower Body" or "Rest day"
  note: string         // short line under the title
  moves: string[]      // tap a day → these
}
export interface PlanBlock { block: number; week: number; total: number; light: boolean }

const REST_NOTES = ['A 20 min walk counts.', 'Stretch for 10 minutes.', 'Rest is part of the plan.', 'Drink water, sleep well.']

export function blockFor(weekNumber: number): PlanBlock {
  const w = Math.max(1, Math.floor(weekNumber) || 1)
  const week = ((w - 1) % BLOCK_WEEKS) + 1
  return { block: Math.floor((w - 1) / BLOCK_WEEKS) + 1, week, total: BLOCK_WEEKS, light: week === BLOCK_WEEKS }
}

/** Spread `n` workouts over `slots` days, as evenly as possible (rest days in between when they fit). */
export function spread(n: number, slots: number): number[] {
  if (n <= 0 || slots <= 0) return []
  if (n >= slots) return Array.from({ length: slots }, (_, i) => i)
  const out: number[] = []
  const step = slots / n
  for (let i = 0; i < n; i++) out.push(Math.min(slots - 1, Math.floor(i * step + step / 2)))
  return Array.from(new Set(out))
}

export function buildWeek(inp: {
  monday: string                     // ISO date of this Monday
  todayIdx: number                   // 0 = Monday … 6 = Sunday
  doneIsos: Set<string>              // days she finished a workout
  goal: number                       // workouts this week
  todayTitle: string | null          // today's workout title (null = rest pick)
  todayMoves: string[]
  next: (j: number) => { title: string; moves: string[] }  // her plan's rotation from today: 0 = today's day, 1 = the one after
  light?: boolean
}): PlanDay[] {
  const LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
  const isoAt = (k: number) => { const d = new Date(inp.monday + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + k); return d.toISOString().slice(0, 10) }
  const days: PlanDay[] = LABELS.map((label, k) => {
    const iso = isoAt(k)
    return { label, date: Number(iso.slice(8)), iso, kind: 'rest' as PlanDayKind, title: 'Rest day', note: REST_NOTES[k % REST_NOTES.length], moves: [] }
  })
  let doneCount = 0
  days.forEach((d, k) => { if (inp.doneIsos.has(d.iso)) { doneCount++; d.kind = 'done'; d.title = 'Workout done'; d.note = k === inp.todayIdx ? 'Today. You did it.' : 'You showed up.' } })
  let left = Math.max(0, inp.goal - doneCount)
  let j = 0
  const today = days[inp.todayIdx]
  if (today && today.kind !== 'done') {
    if (inp.todayTitle && left > 0) {
      today.kind = 'today'; today.title = inp.todayTitle; today.moves = inp.todayMoves
      today.note = inp.light ? 'Today. Light week, easier sets.' : 'Today. Ready when you are.'
      left--; j = 1
    } else {
      today.note = inp.todayTitle ? 'Weekly goal done. Enjoy the rest.' : 'Today is a rest day.'
    }
  }
  const futureStart = inp.todayIdx + 1
  const slots = 7 - futureStart
  for (const p of spread(left, slots)) {
    const d = days[futureStart + p]
    const w = inp.next(j); j++
    d.kind = 'later'; d.title = w.title; d.moves = w.moves; d.note = 'Planned for you.'
  }
  return days
}
