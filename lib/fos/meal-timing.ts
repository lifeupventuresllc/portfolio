import { createServiceClient } from '@/lib/supabase/server'
import { getTimezone } from '@/lib/localdate'
import { usualMealTimes } from '@/lib/nutrition-day'
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

export type LearnedMealTimes = Partial<Record<MealSlot, number>> // slot -> typical local hour (0-23, may be fractional)

// 2026-10-30 (habit memory): one source of truth for "when she usually
// eats" — lib/nutrition-day usualMealTimes, the same numbers the Nutrition
// tab runs on (median of the last 28 days, 3+ days per meal, or a time she
// set herself). Only her real times nudge — never a default.
export async function learnMealTimes(enrollmentId: string, _todayISO?: string): Promise<LearnedMealTimes> {
  void _todayISO
  const usual = await usualMealTimes(enrollmentId, getTimezone())
  const out: LearnedMealTimes = {}
  for (const u of Object.values(usual)) {
    if (u.source === 'default') continue
    out[SLOT_MAP[u.meal]] = u.minute / 60
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
