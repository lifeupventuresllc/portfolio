import { createServiceClient } from '@/lib/supabase/server'
import type { FosProfile, FosEvent, WorkoutChange, NutritionChange } from './types'

// The context data-layer for the Fitness Operating System (Phase 0 foundation).
// Read/write the living profile + append life events. Server-only (uses the service
// client). Phase 1's operator surface + Phase 2's adaptation engine build on top of this.
const svc = () => createServiceClient()

export async function getProfile(enrollmentId: string): Promise<FosProfile | null> {
  const { data } = await svc().from('fos_profile').select('*').eq('enrollment_id', enrollmentId).maybeSingle()
  if (!data) return null
  return {
    enrollmentId,
    goalSummary: data.goal_summary ?? null,
    workSchedule: data.work_schedule ?? null,
    energyPatterns: data.energy_patterns ?? null,
    foodsLoved: data.foods_loved ?? [],
    foodsAvoided: data.foods_avoided ?? [],
    motivators: data.motivators ?? [],
    discouragers: data.discouragers ?? [],
    barriers: data.barriers ?? [],
    cycleTracking: !!data.cycle_tracking,
    preferences: (data.preferences ?? {}) as Record<string, unknown>,
  }
}

// Upsert a partial patch to the living profile. Keys are snake_case columns.
export async function upsertProfile(enrollmentId: string, userId: string | null, patch: Record<string, unknown>) {
  await svc().from('fos_profile').upsert(
    { enrollment_id: enrollmentId, user_id: userId, ...patch, updated_at: new Date().toISOString() },
    { onConflict: 'enrollment_id' }
  )
}

// Append a life event — the raw material for memory + pattern detection.
export async function logEvent(enrollmentId: string, userId: string | null, ev: FosEvent) {
  await svc().from('fos_events').insert({
    enrollment_id: enrollmentId,
    user_id: userId,
    occurred_on: ev.occurredOn,
    kind: ev.kind,
    summary: ev.summary ?? null,
    payload: ev.payload ?? {},
  })
}

// The adjustment she APPROVED for today (if any) — so the dashboard reflects the
// adapted plan. Newest approved wins if she adjusted more than once.
export async function getApprovedTodayAdjustment(enrollmentId: string, todayISO: string) {
  const { data } = await svc()
    .from('fos_adjustments')
    .select('workout_change, nutrition_change, message')
    .eq('enrollment_id', enrollmentId).eq('for_date', todayISO).eq('status', 'approved')
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!data) return null
  return {
    workoutChange: (data.workout_change as WorkoutChange | null) ?? null,
    nutritionChange: (data.nutrition_change as NutritionChange | null) ?? null,
    message: (data.message as string | null) ?? null,
  }
}

// Recent life events (defaults to on/after `sinceISO`), newest first — the operator's
// short-term memory window.
export async function recentEvents(enrollmentId: string, sinceISO: string): Promise<FosEvent[]> {
  const { data } = await svc()
    .from('fos_events')
    .select('occurred_on, kind, summary, payload')
    .eq('enrollment_id', enrollmentId)
    .gte('occurred_on', sinceISO)
    .order('occurred_on', { ascending: false })
  return (data ?? []).map((r) => ({
    occurredOn: r.occurred_on as string,
    kind: r.kind as FosEvent['kind'],
    summary: (r.summary as string | null) ?? null,
    payload: (r.payload as Record<string, unknown>) ?? {},
  }))
}
