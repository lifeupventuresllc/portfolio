// Her real training numbers, in plain words, for Coach Asa (2026-11-17,
// Asa's spec: "the coach must read her actual calibration, logs, and
// feedback before giving any advice"). Read-only; one short block of text.
import { createServiceClient } from '@/lib/supabase/server'
import { gentleFrom, GENTLE_WORKOUTS, WELCOME_BACK_DAYS } from './gentle-start'
import { trendsFrom } from './strength'
import { localDateISO, addDaysISO } from './localdate'

const FEEL = { 1: 'too easy', 2: 'just right', 3: 'too hard' } as const

export function describeTraining(input: {
  daily: { logged_on: string; measurements: unknown }[]
  sets: { exercise_name: string; weight_lb: number | string | null; logged_on: string; effort?: string | null }[]
  today: string
}): string {
  const { gentle, lighter, done, daysAway } = gentleFrom(input.daily, input.today)
  const lines: string[] = []
  const days = input.daily
    .filter((r) => (r.measurements as { workout?: boolean } | null)?.workout === true)
    .sort((a, b) => b.logged_on.localeCompare(a.logged_on))
  lines.push(`Workouts finished: ${done}.`)
  if (days[0]) {
    let gap = 0
    for (let d = days[0].logged_on; d < input.today && gap < 60; d = addDaysISO(d, 1)) gap++
    lines.push(`Last workout: ${days[0].logged_on} (${gap === 0 ? 'today' : `${gap} day${gap === 1 ? '' : 's'} ago`}).`)
  } else lines.push('She has not finished a workout yet.')
  const feels = days.slice(0, 3).map((r) => FEEL[(r.measurements as { effort?: 1 | 2 | 3 }).effort as 1 | 2 | 3]).filter(Boolean)
  if (feels.length) lines.push(`How her last workouts felt (newest first): ${feels.join(', ')}.`)
  if (gentle) lines.push(lighter
    ? 'Her last workout felt too hard, so today is gentle and every weight is one step lighter.'
    : daysAway >= WELCOME_BACK_DAYS ? `She is coming back after ${daysAway} days: today is a gentle restart (one set fewer, longer rest). No catching up, no guilt.`
    : `She is in the gentle start (first ${GENTLE_WORKOUTS} workouts): one set fewer and longer rest.`)
  const trends = trendsFrom(input.sets).slice(0, 5)
  for (const t of trends) lines.push(`${t.name}: now ${t.now} lb (started ${t.start} lb${t.stuck ? ', same weight 3 workouts in a row' : ''}).`)
  const recent = input.sets.filter((s) => s.effort === 'hard' || s.effort === 'easy').slice(-12)
  const hard = recent.filter((s) => s.effort === 'hard').length, easy = recent.filter((s) => s.effort === 'easy').length
  if (recent.length) lines.push(`Recent sets she tapped: ${easy} easy, ${hard} hard.`)
  return lines.join('\n')
}

export async function getTrainingContext(enrollmentId: string): Promise<string | null> {
  try {
    const svc = createServiceClient()
    const [{ data: daily }, { data: sets }] = await Promise.all([
      svc.from('challenge_progress').select('logged_on, measurements').eq('enrollment_id', enrollmentId).eq('note', '__daily__')
        .order('logged_on', { ascending: false }).limit(60),
      svc.from('workout_set_logs').select('exercise_name, weight_lb, logged_on, effort').eq('enrollment_id', enrollmentId)
        .order('logged_on', { ascending: true }).limit(2000),
    ])
    return describeTraining({ daily: (daily || []) as never, sets: (sets || []) as never, today: localDateISO() })
  } catch { return null }
}
