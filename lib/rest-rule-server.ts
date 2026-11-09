// Server half of the rest rule (lib/rest-rule.ts): reads her logged sets
// from the last 4 days and picks today's day. One helper, so the workout
// screen, My Day, Home and My Week always agree.
import { createServiceClient } from '@/lib/supabase/server'
import { lastHardFromLogs, pickRestedDay, type RestPick } from './rest-rule'
import type { WorkoutProgram } from './workout.types'

// `doneToday` false = she may be mid-workout right now: her sets from the last
// 6 hours are this same session, not a past one, so they don't count.
export async function getRestPick(enrollmentId: string, program: WorkoutProgram | null, startDay: number, level: number, doneToday = false): Promise<RestPick | undefined> {
  if (!program) return undefined
  const days = program.track === 'home' ? program.home?.days || [] : program.gymDays || []
  if (!days.length) return undefined
  try {
    const svc = createServiceClient()
    const since = new Date(Date.now() - 4 * 86400000).toISOString()
    const { data } = await svc.from('workout_set_logs').select('exercise_name, set_index, created_at').eq('enrollment_id', enrollmentId).gte('created_at', since)
    const cutoff = doneToday ? Infinity : Date.now() - 6 * 3600e3
    const past = (data || []).filter((r) => Date.parse(r.created_at as string) < cutoff)
    return pickRestedDay(days, startDay % days.length, lastHardFromLogs(past), level)
  } catch {
    return undefined // never block her workout over this check
  }
}

