// Strength over time (2026-11-17, workout-system step 2). Every Done tap
// already saves the weight she used (workout_set_logs.weight_lb, migration
// 052). This reads it back as one number per lift per workout (her heaviest
// set that day), so Progress can draw each lift going up.
//
// "Stuck" = the same top weight three workouts in a row after at least four
// workouts on that lift. Double progression (lib/double-progression.ts)
// already handles it by adding reps first, then weight — the note just tells
// her that's normal and what to push for.
import type { SupabaseClient } from '@supabase/supabase-js'

export interface LiftTrend {
  name: string
  points: { day: string; lb: number }[]   // oldest → newest, one per workout day
  start: number
  now: number
  best: number
  stuck: boolean
}

export function trendsFrom(rows: { exercise_name: string; weight_lb: number | string | null; logged_on: string }[]): LiftTrend[] {
  const by = new Map<string, Map<string, number>>()
  for (const r of rows) {
    const lb = Number(r.weight_lb)
    if (!r.exercise_name || !Number.isFinite(lb) || lb <= 0) continue
    const days = by.get(r.exercise_name) || new Map<string, number>()
    days.set(r.logged_on, Math.max(days.get(r.logged_on) || 0, lb))
    by.set(r.exercise_name, days)
  }
  const out: LiftTrend[] = []
  for (const [name, days] of Array.from(by.entries())) {
    const points = Array.from(days.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([day, lb]) => ({ day, lb }))
    const lbs = points.map((p) => p.lb)
    const last3 = lbs.slice(-3)
    const stuck = lbs.length >= 4 && last3.every((x) => x === last3[0]) && last3[0] <= Math.max(...lbs.slice(0, -3))
    out.push({ name, points: points.slice(-12), start: lbs[0], now: lbs[lbs.length - 1], best: Math.max(...lbs), stuck })
  }
  // Most-trained lifts first; ties → biggest gain.
  return out.sort((a, b) => b.points.length - a.points.length || (b.now - b.start) - (a.now - a.start))
}

export async function getStrength(svc: SupabaseClient, enrollmentId: string): Promise<LiftTrend[]> {
  const { data } = await svc.from('workout_set_logs').select('exercise_name, weight_lb, logged_on')
    .eq('enrollment_id', enrollmentId).not('weight_lb', 'is', null).order('logged_on', { ascending: true }).limit(3000)
  return trendsFrom((data || []) as { exercise_name: string; weight_lb: number | null; logged_on: string }[])
}
