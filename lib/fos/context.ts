import { createServiceClient } from '@/lib/supabase/server'
import type { FosProfile, FosEvent, WorkoutChange, NutritionChange } from './types'
import type { ExtractedFacts } from './memory'

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

const VALID_FOCUS_AREAS = ['core', 'legs', 'arms', 'chest', 'back', 'shoulders']

// focusOverride used to be a single string value before the multi-area rewrite —
// real rows approved before that ship are still sitting in the table in that old
// shape. Reading one as-is and handing it to array-only callers (.some, .includes
// used as an array method, etc.) throws at runtime — this is the actual root
// cause of a live "/plan/workout" server crash right after the rewrite shipped,
// traced back to exactly this: an old approved adjustment from before the
// deploy, read fresh through the new array-typed path. Normalized once here, at
// the one place this ever gets read out of the database, so every downstream
// caller can trust the array invariant without its own defensive check.
function normalizeFocusOverride(v: unknown): WorkoutChange['focusOverride'] {
  if (typeof v === 'string') return VALID_FOCUS_AREAS.includes(v) ? [v as NonNullable<WorkoutChange['focusOverride']>[number]] : undefined
  if (Array.isArray(v)) {
    const cleaned = v.filter((a): a is NonNullable<WorkoutChange['focusOverride']>[number] => VALID_FOCUS_AREAS.includes(a as string))
    return cleaned.length ? cleaned : undefined
  }
  return undefined
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
  const rawWorkoutChange = data.workout_change as (Omit<WorkoutChange, 'focusOverride'> & { focusOverride?: unknown }) | null
  return {
    workoutChange: rawWorkoutChange
      ? { ...rawWorkoutChange, focusOverride: normalizeFocusOverride(rawWorkoutChange.focusOverride) }
      : null,
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

const norm = (s: string) => s.trim().toLowerCase()

// A re-mentioned fact is reinforced (moved to front), not duplicated or discarded —
// this IS the "repeated patterns" handling: no separate frequency-counting needed,
// the thing she keeps bringing up naturally ends up most prominent.
function mergeArray(existing: string[], additions?: string[]): string[] | undefined {
  if (!additions?.length) return undefined
  const next = [...existing]
  for (const raw of additions) {
    const v = raw.trim()
    if (!v) continue
    const i = next.findIndex((e) => norm(e) === norm(v))
    if (i !== -1) next.splice(i, 1)
    next.unshift(v)
  }
  return next.slice(0, 20)
}

// Builds the snake_case patch for upsertProfile() from a fresh extraction —
// returns only keys that actually changed, so a message with nothing new
// (the common case) triggers no DB write at all.
export function mergeProfilePatch(existing: FosProfile | null, extracted: ExtractedFacts): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  if (extracted.goal_summary) patch.goal_summary = extracted.goal_summary

  const foodsLoved = mergeArray(existing?.foodsLoved ?? [], extracted.foods_loved)
  if (foodsLoved) patch.foods_loved = foodsLoved
  const foodsAvoided = mergeArray(existing?.foodsAvoided ?? [], extracted.foods_avoided)
  if (foodsAvoided) patch.foods_avoided = foodsAvoided
  const motivators = mergeArray(existing?.motivators ?? [], extracted.motivators)
  if (motivators) patch.motivators = motivators
  const discouragers = mergeArray(existing?.discouragers ?? [], extracted.discouragers)
  if (discouragers) patch.discouragers = discouragers
  const barriers = mergeArray(existing?.barriers ?? [], extracted.barriers)
  if (barriers) patch.barriers = barriers

  const existingPersonalNotes = Array.isArray(existing?.preferences?.personal_notes) ? (existing!.preferences.personal_notes as string[]) : []
  const personalNotes = mergeArray(existingPersonalNotes, extracted.personal_notes)

  if (extracted.work_schedule_note || extracted.energy_note || personalNotes) {
    const preferences = { ...(existing?.preferences ?? {}) } as Record<string, unknown>
    if (extracted.work_schedule_note) preferences.work_schedule_note = extracted.work_schedule_note
    if (extracted.energy_note) preferences.energy_note = extracted.energy_note
    if (personalNotes) preferences.personal_notes = personalNotes
    patch.preferences = preferences
  }

  return patch
}
