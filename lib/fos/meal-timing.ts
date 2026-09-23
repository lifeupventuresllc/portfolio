import { createServiceClient } from '@/lib/supabase/server'
import { getTimezone, localHourNumber, addDaysISO } from '@/lib/localdate'
import type { FastFoodMeal } from '@/lib/escape-plan'

// ============================================================
// Learned meal-time nudge (2026-09-23, Asa's direct ask) — "the app should
// know when I usually eat and reach out a little before, not right at it."
// Reads ONLY real, already-logged food-log timestamps (challenge_food_log's
// own `meal` + `created_at` columns) — asks her nothing new, same standing
// rule every other pattern detector in lib/fos/ already follows. Feeds
// straight into the SAME eating-out next-action path (state.ts's
// eatingOutToday/eatingOutPick) as the location detector — this is a
// second real SOURCE for that one existing signal, never a second engine.
// ============================================================

export type MealSlot = FastFoodMeal['slot']
const SLOT_MAP: Record<string, MealSlot> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' }

// How far ahead of her real typical time to speak up — Asa's own range
// ("30 minutes or less... maybe an hour before"). 45 sits in the middle:
// enough runway to actually decide and act, never so early it reads as
// unrelated to the meal it's about.
const LEAD_MINUTES = 45
// Never trust a slot's timing from fewer than 3 real logs — same "don't
// guess from one data point" floor every other detector here uses.
const MIN_LOGS_PER_SLOT = 3
// Only recent history — her real schedule now, not a shape from months ago.
const LOOKBACK_DAYS = 45

export type LearnedMealTimes = Partial<Record<MealSlot, number>> // slot -> typical local hour (0-23, may be fractional)

export async function learnMealTimes(enrollmentId: string, todayISO: string): Promise<LearnedMealTimes> {
  const svc = createServiceClient()
  const tz = getTimezone()
  const since = addDaysISO(todayISO, -LOOKBACK_DAYS)
  const { data } = await svc.from('challenge_food_log').select('meal, created_at').eq('enrollment_id', enrollmentId).gte('logged_on', since)

  const bySlot: Record<MealSlot, number[]> = { Breakfast: [], Lunch: [], Snack: [], Dinner: [] }
  for (const row of data || []) {
    const slot = SLOT_MAP[String(row.meal || '').toLowerCase()]
    if (!slot) continue
    bySlot[slot].push(localHourNumber(tz, new Date(row.created_at as string)))
  }

  const out: LearnedMealTimes = {}
  for (const slot of Object.keys(bySlot) as MealSlot[]) {
    const hours = bySlot[slot]
    if (hours.length < MIN_LOGS_PER_SLOT) continue
    hours.sort((a, b) => a - b)
    // Median, not mean — one very early/late outlier log (a rare late-night
    // snack, a skipped-then-caught-up entry) shouldn't drag her real usual
    // time around the way an average would.
    const mid = Math.floor(hours.length / 2)
    out[slot] = hours.length % 2 ? hours[mid] : (hours[mid - 1] + hours[mid]) / 2
  }
  return out
}

// Which slot (if any) is worth nudging RIGHT NOW: has a learned time, that
// time is within LEAD_MINUTES ahead of now (never after — this is a
// heads-up, not a late reminder; a slot she's running late on is a
// different, separate conversation), and she hasn't already logged that
// slot today.
export async function slotToNudgeNow(enrollmentId: string, todayISO: string, nowHour: number, learned: LearnedMealTimes): Promise<MealSlot | null> {
  const svc = createServiceClient()
  const { data: loggedToday } = await svc.from('challenge_food_log').select('meal').eq('enrollment_id', enrollmentId).eq('logged_on', todayISO)
  const loggedSlots = new Set((loggedToday || []).map((r) => SLOT_MAP[String(r.meal || '').toLowerCase()]).filter(Boolean))

  const leadHours = LEAD_MINUTES / 60
  for (const slot of Object.keys(learned) as MealSlot[]) {
    if (loggedSlots.has(slot)) continue
    const typical = learned[slot]
    if (typical == null) continue
    const aheadBy = typical - nowHour
    if (aheadBy > 0 && aheadBy <= leadHours) return slot
  }
  return null
}
