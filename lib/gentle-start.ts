// ============================================================
// Gentle start (2026-11-17, Asa's workout spec: "a new user's first workouts
// feel too hard or confusing, so she quits"). Success = she finishes her
// first workout thinking "I can do this" and starts her second.
//
// Her first 4 workouts are gentle: one set fewer (never under 2), 30 sec
// more rest, no step-up sets — shorter and easier. It counts WORKOUTS SHE
// DID, not calendar weeks, so a missed week never makes it harder.
//
// "How did that feel?" at the end of every workout (Too easy / Just right /
// Too hard, components/EffortTap.tsx) steers the next one:
//   - Too hard  → the next workout is gentle again AND one weight lighter.
//   - Too easy twice in a row (after at least 2 workouts) → gentle ends early.
//   - Nothing tapped → nothing changes; the count alone ends gentle.
//   - Back after 14+ days away → a fresh gentle restart (no catching up).
// Pure: the rows come in, the answer goes out (tested in scratchpad).
// ============================================================
import { createServiceClient } from '@/lib/supabase/server'
import { localDateISO } from '@/lib/localdate'

export const GENTLE_WORKOUTS = 4
/** Stored on the day's row as `effort`: 1 too easy, 2 just right, 3 too hard. */
export type Feel = 1 | 2 | 3

export interface GentleState {
  gentle: boolean   // this workout uses the gentle shape
  lighter: boolean  // last workout felt too hard → one weight lighter today
  done: number      // lifting workouts finished so far
  daysAway: number  // days since her last workout (0 = none yet or today)
}

/** Back after this long → a fresh gentle restart, never a penalty (2026-11-17, spec #9). */
export const WELCOME_BACK_DAYS = 14

const dayNum = (iso: string) => Math.floor(Date.parse(iso + 'T12:00:00Z') / 86400000)

export function gentleFrom(rows: { logged_on: string; measurements: unknown }[], today?: string): GentleState {
  const workouts = rows
    .filter((r) => (r.measurements as { workout?: boolean } | null)?.workout === true)
    .sort((a, b) => a.logged_on.localeCompare(b.logged_on))
  const feels = workouts.map((r) => (r.measurements as { effort?: number }).effort)
  const done = workouts.length
  const last = feels[done - 1]
  const lastTwoEasy = done >= 2 && feels[done - 1] === 1 && feels[done - 2] === 1
  const lighter = last === 3
  const daysAway = today && done ? Math.max(0, dayNum(today) - dayNum(workouts[done - 1].logged_on)) : 0
  const gentle = lighter || daysAway >= WELCOME_BACK_DAYS || (done < GENTLE_WORKOUTS && !lastTwoEasy)
  return { gentle, lighter, done, daysAway }
}

export async function getGentleState(enrollmentId: string): Promise<GentleState> {
  try {
    const svc = createServiceClient()
    const { data } = await svc.from('challenge_progress').select('logged_on, measurements')
      .eq('enrollment_id', enrollmentId).eq('note', '__daily__')
      .order('logged_on', { ascending: false }).limit(60)
    return gentleFrom((data || []) as { logged_on: string; measurements: unknown }[], localDateISO())
  } catch {
    return { gentle: false, lighter: false, done: 0, daysAway: 0 }
  }
}
