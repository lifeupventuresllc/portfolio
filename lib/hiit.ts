// HIIT day (2026-11-17, workout-system step 4). Short, no-equipment
// intervals: each move is one timed screen (work, then a short rest), the
// whole list repeats for a few rounds. Her level sets the work time and the
// moves; injuries are respected. Offered on a rest day in My Plan
// (lib/week-plan.ts) and opened with /plan/workout?hiit=1 — today only, her
// saved plan is never changed.
import { HOME_POOL, isContraindicated, type Injury, type Level } from './workout-exercises'
import { exerciseVideo } from './exercise-videos'
import { rotate, type HomeDay, type GymDay } from './workout'

export const HIIT_WORK_SEC: Record<Level, number> = { 1: 20, 2: 30, 3: 40 }
export const HIIT_REST_SEC = 20
const ROUNDS: Record<Level, number> = { 1: 3, 2: 3, 3: 4 }
const MOVES = 4
export const HIIT_TITLE = 'HIIT Intervals'

export function hiitMinutes(level: Level): number {
  return Math.round((ROUNDS[level] * MOVES * (HIIT_WORK_SEC[level] + HIIT_REST_SEC)) / 60) + 3
}

function hiitMoves(level: Level, injuries: Injury[], offset: number): string[] {
  const ok = (e: { name: string; type: string; level: number }) => e.type === 'cardio' && e.level <= level && !isContraindicated(e.name, injuries)
  const pool = HOME_POOL.filter(ok)
  // Moves with a demo video first, so every screen shows her the move.
  const withVid = pool.filter((e) => exerciseVideo(e.name)), rest = pool.filter((e) => !exerciseVideo(e.name))
  const list = rotate(withVid, offset).concat(rotate(rest, offset)).map((e) => e.name)
  // Too few at her level (beginners have 2): fill with the gentlest next-level moves.
  const next = HOME_POOL.filter((e) => e.type === 'cardio' && e.level === level + 1 && !isContraindicated(e.name, injuries) && /jack|butt|march|running in place/i.test(e.name)).map((e) => e.name)
  const picks = Array.from(new Set([...list, ...next])).slice(0, MOVES)
  return picks.length ? picks : ['Jumping Jacks', 'High Knees', 'Butt Kicks', 'March in Place'].slice(0, MOVES)
}

export function generateHiitSession(track: 'home', level: Level, injuries: Injury[], offset: number): HomeDay
export function generateHiitSession(track: 'gym', level: Level, injuries: Injury[], offset: number): GymDay
export function generateHiitSession(track: 'home' | 'gym', level: Level, injuries: Injury[], offset: number): HomeDay | GymDay {
  const moves = hiitMoves(level, injuries, offset)
  const sec = HIIT_WORK_SEC[level]
  const order = Array.from({ length: ROUNDS[level] }, () => moves).flat()
  if (track === 'home') return { dayNum: 0, title: HIIT_TITLE, exercises: order.map((name) => ({ name, duration: `${sec} sec` })) }
  return {
    dayNum: 0, title: HIIT_TITLE, muscles: ['full body'],
    warmup: ['March in Place – 60 sec', 'Arm Circles – 60 sec', 'Leg Swings / Hip Circles – 60 sec'],
    supersets: [],
    accessory: order.map((name) => ({ name, reps: `${sec} sec`, cue: 'Go hard for the whole time, then breathe on the rest.', kind: 'hiit' as const })),
  }
}
