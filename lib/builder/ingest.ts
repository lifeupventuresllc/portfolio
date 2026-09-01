import { createServiceClient } from '@/lib/supabase/server'
import { computeBadges, type BadgeState } from '@/lib/achievements'
import type { WeekPlan } from '@/lib/meal-plan'

export type BuilderEvent = {
  source_type: string
  source_key: string | null
  source_id: string
  occurred_at: string
}

const iso = (d: Date) => d.toISOString().slice(0, 10)

// Same grace-day streak rule as app/plan/achievements/page.tsx and
// app/api/plan/daily/route.ts — badges must agree with what she sees there.
function streakFrom(dates: Set<string>): number {
  let streak = 0
  const cur = new Date()
  if (!dates.has(iso(cur))) cur.setDate(cur.getDate() - 1)
  let graceUsed = false
  for (;;) {
    if (dates.has(iso(cur))) { streak++; cur.setDate(cur.getDate() - 1); continue }
    if (!graceUsed) { graceUsed = true; cur.setDate(cur.getDate() - 1); continue }
    break
  }
  return streak
}

async function ingestBadges(svc: ReturnType<typeof createServiceClient>, enrollmentId: string): Promise<BuilderEvent[]> {
  const [{ data: enrollment }, { data: alreadyPlaced }, dailyRes, checkinRes, nutritionRes] = await Promise.all([
    svc.from('challenge_enrollments').select('created_at').eq('id', enrollmentId).maybeSingle(),
    svc.from('builder_elements').select('source_id').eq('enrollment_id', enrollmentId).eq('source_type', 'badge'),
    svc.from('challenge_progress').select('logged_on, measurements, note').eq('enrollment_id', enrollmentId),
    svc.from('challenge_checkins').select('id', { count: 'exact', head: true }).eq('enrollment_id', enrollmentId),
    svc.from('challenge_nutrition_plans').select('meals').eq('enrollment_id', enrollmentId).eq('week_number', 1).maybeSingle(),
  ])
  if (!enrollment) return []

  const rows = dailyRes.data || []
  const dailyRows = rows.filter((r) => r.note === '__daily__')
  const dates = new Set<string>(dailyRows.map((r) => r.logged_on as string).filter(Boolean))
  const workoutsDone = dailyRows.filter((r) => (r.measurements as { workout?: boolean } | null)?.workout).length
  const photos = rows.filter((r) => r.note === 'photo').length

  const meals = nutritionRes.data?.meals as WeekPlan | null | undefined
  const mealPlanBuilt = !!(meals && typeof meals === 'object' && 'days' in meals && meals.days?.length)

  const created = new Date(enrollment.created_at as string)
  const daysEnrolled = Math.max(1, Math.floor((Date.now() - created.getTime()) / 86400000) + 1)

  const state: BadgeState = {
    streak: streakFrom(dates),
    daysShowedUp: dates.size,
    workoutsDone,
    checkins: checkinRes.count || 0,
    photos,
    mealPlanBuilt,
    daysEnrolled,
  }

  const placedIds = new Set((alreadyPlaced || []).map((r) => r.source_id as string))
  const now = new Date().toISOString()
  return computeBadges(state)
    .filter((b) => b.earned && !placedIds.has(b.id))
    .map((b) => ({ source_type: 'badge', source_key: null, source_id: b.id, occurred_at: now }))
}

export async function ingestEvents(enrollmentId: string, since: string | null): Promise<BuilderEvent[]> {
  const svc = createServiceClient()

  let nextActionQuery = svc.from('next_action_log').select('id, kind, completed_at').eq('enrollment_id', enrollmentId).not('completed_at', 'is', null)
  let foodLogQuery = svc.from('challenge_food_log').select('id, created_at, logged_on').eq('enrollment_id', enrollmentId)
  let progressQuery = svc.from('challenge_progress').select('id, note, weight_lbs, logged_on, created_at').eq('enrollment_id', enrollmentId)
  let checkinsQuery = svc.from('challenge_checkins').select('id, submitted_at').eq('enrollment_id', enrollmentId).not('submitted_at', 'is', null)

  if (since) {
    nextActionQuery = nextActionQuery.gt('completed_at', since)
    foodLogQuery = foodLogQuery.gt('created_at', since)
    progressQuery = progressQuery.gt('created_at', since)
    checkinsQuery = checkinsQuery.gt('submitted_at', since)
  }

  const [{ data: actions }, { data: foodRows }, { data: progressRows }, { data: checkinRows }, badgeEvents] = await Promise.all([
    nextActionQuery,
    foodLogQuery,
    progressQuery,
    checkinsQuery,
    ingestBadges(svc, enrollmentId),
  ])

  const events: BuilderEvent[] = []

  for (const row of actions || []) {
    events.push({ source_type: 'next_action_log', source_key: row.kind as string, source_id: row.id as string, occurred_at: row.completed_at as string })
  }

  for (const row of foodRows || []) {
    const occurredAt = (row.created_at as string | null) || `${row.logged_on}T00:00:00.000Z`
    events.push({ source_type: 'food_log', source_key: null, source_id: row.id as string, occurred_at: occurredAt })
  }

  for (const row of progressRows || []) {
    const occurredAt = (row.created_at as string | null) || `${row.logged_on}T00:00:00.000Z`
    if (row.note === '__daily__') {
      events.push({ source_type: 'daily_checkin', source_key: null, source_id: row.id as string, occurred_at: occurredAt })
    }
    if (row.weight_lbs !== null && row.weight_lbs !== undefined) {
      events.push({ source_type: 'weigh_in', source_key: null, source_id: `${row.id}:weighin`, occurred_at: occurredAt })
    }
  }

  for (const row of checkinRows || []) {
    events.push({ source_type: 'weekly_checkin', source_key: null, source_id: row.id as string, occurred_at: row.submitted_at as string })
  }

  events.push(...badgeEvents)

  return events
}
