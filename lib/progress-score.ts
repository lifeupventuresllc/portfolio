import { createServiceClient } from '@/lib/supabase/server'
import { getTimezone, localDateISO } from '@/lib/localdate'

export interface ProgressPoint { label: string; value: number }

// Not every completed action moves the needle the same amount (Asa's call,
// 2026-08-26): a full workout counts for more than a planned meal followed,
// which counts for more than a minimum-viable fallback win (water, a
// stretch, a short walk — see lib/next-action/candidates.ts's fallback set).
// Deliberately still > 0 for the smallest wins — the engine's own standing
// rule is that a fallback action is a FULL win, never a lesser one; the
// weight difference here is about magnitude of the win, not whether it
// counts at all. Reward-question answers count the same as a fallback —
// answering it is itself a real "showed up" moment.
const KIND_WEIGHT: Record<string, number> = {
  workout: 3,
  meal: 2,
  location: 2,
  fallback: 1,
  reward_question: 1,
}
const FOOD_LOG_WEIGHT = 1

// A lifetime running total, never decreasing (Asa's pick over a per-day
// score that resets) — matches the app's existing "banked progress" logic
// (streak, milestone moments): a quiet day holds the line flat, it never
// erases what was already earned. Reads two independent, already-existing
// sources of real completions rather than inventing new tracking:
// next_action_log (every Done tap, any kind) and challenge_food_log (every
// real meal logged, whether or not it was the Next Action's own prompt).
export async function getProgressScoreTrend(enrollmentId: string): Promise<ProgressPoint[]> {
  const svc = createServiceClient()
  const tz = getTimezone()

  const [{ data: actions }, { data: foodRows }] = await Promise.all([
    svc.from('next_action_log').select('kind, completed_at').eq('enrollment_id', enrollmentId).not('completed_at', 'is', null),
    svc.from('challenge_food_log').select('logged_on').eq('enrollment_id', enrollmentId),
  ])

  const byDay = new Map<string, number>()
  for (const a of actions || []) {
    const day = localDateISO(tz, new Date(a.completed_at as string))
    const w = KIND_WEIGHT[a.kind as string] ?? 1
    byDay.set(day, (byDay.get(day) || 0) + w)
  }
  for (const f of foodRows || []) {
    const day = f.logged_on as string
    byDay.set(day, (byDay.get(day) || 0) + FOOD_LOG_WEIGHT)
  }

  const days = Array.from(byDay.keys()).sort()
  let running = 0
  return days.map((day) => {
    running += byDay.get(day) as number
    return { label: new Date(`${day}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: running }
  })
}
