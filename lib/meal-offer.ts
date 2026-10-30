// ============================================================
// Meal-time offers (Prompt 3, 2026-10-30, Asa: "Auto-send with yes or no").
// At her usual time for a meal, ONE meal ready to go arrives as a
// notification: meal + price, "Here in about 35 min. Want it?", Yes / No.
//   Yes → her delivery app on that meal (lib/order-link yesAction — the one
//         place "Yes places the order" switches on later).
//   No  → one different meal. No twice → nothing more until the next meal.
// Never an order or a charge without her Yes. She can turn it off any time
// (challenge_intake.form_data.meal_offers_off). Every Yes / No is saved
// (meal_offers table, migration 050) and fed to meal_memory so picks learn.
//
// Pure functions only — the "is it her meal time / already logged / already
// offered / No twice" rules can be tested on their own (no database, no clock).
// ============================================================

import type { MealOption, OrderApp } from '@/lib/meal-pick'
import { money } from '@/lib/food-budget'

export type OfferMeal = 'breakfast' | 'lunch' | 'dinner'
export const OFFER_MEALS: OfferMeal[] = ['breakfast', 'lunch', 'dinner']

// Her usual time ± 30 min — the same 1-hour window "When you usually eat"
// shows. The scheduler runs every 15 minutes, so she gets it within the
// first 15 minutes of that window (up to ~30 min before her usual time,
// which is about how long delivery takes).
export const OFFER_BEFORE_MIN = 30
export const OFFER_AFTER_MIN = 30

/** Which main meal's window holds this minute of her day (null = none). */
export function mealDueNow(nowMin: number, anchors: Record<OfferMeal, number>): OfferMeal | null {
  for (const m of OFFER_MEALS) {
    const at = anchors[m]
    if (nowMin >= at - OFFER_BEFORE_MIN && nowMin < at + OFFER_AFTER_MIN) return m
  }
  return null
}

export interface OfferState {
  off: boolean               // she turned meal-time picks off
  loggedMeals: string[]      // today's food-log meal tags ('lunch', 'snack', …)
  offeredMeals: string[]     // meals already offered today (meal_offers, attempt 1)
}
export type OfferDecision =
  | { send: true; meal: OfferMeal }
  | { send: false; reason: 'off' | 'not-time' | 'logged' | 'offered' }

/** Send her an offer right now? One per meal per day, never once she's
 * already logged that meal, never when she's turned it off. */
export function offerToSend(nowMin: number, anchors: Record<OfferMeal, number>, s: OfferState): OfferDecision {
  if (s.off) return { send: false, reason: 'off' }
  const meal = mealDueNow(nowMin, anchors)
  if (!meal) return { send: false, reason: 'not-time' }
  if (s.loggedMeals.includes(meal)) return { send: false, reason: 'logged' }
  if (s.offeredMeals.includes(meal)) return { send: false, reason: 'offered' }
  return { send: true, meal }
}

/** What follows a No: one different meal (attempt 2), or — after a second
 * No, or when there's no other meal that fits — stop until the next meal. */
export type AfterNo = { next: 'backup' } | { next: 'stop'; line: string }
export function afterNo(attempt: number, meal: string, hasBackup: boolean): AfterNo {
  if (attempt < 2 && hasBackup) return { next: 'backup' }
  return { next: 'stop', line: stopLine(meal) }
}

/** "Okay, we'll check back at dinner." */
export function stopLine(meal: string): string {
  const next = meal === 'breakfast' ? 'lunch' : meal === 'lunch' ? 'dinner' : null
  return next ? `Okay, we'll check back at ${next}.` : 'Okay, we\'ll check back tomorrow.'
}

/** The offer and its one backup: the best fit, then the next one that's
 * genuinely different (another restaurant when eating out, another dish
 * when cooking). Options come ranked best-first from pickMeals. */
export function pickPair<T extends Pick<MealOption, 'kind' | 'place' | 'name' | 'key'>>(options: T[]): { first: T | null; backup: T | null } {
  const first = options[0] || null
  if (!first) return { first: null, backup: null }
  const differs = (o: T) => o.key !== first.key && (o.kind === 'out' && first.kind === 'out' ? o.place !== first.place : o.name !== first.name)
  return { first, backup: options.slice(1).find(differs) || null }
}

// ---- arrival estimate -------------------------------------------------------
// There's no live delivery quote, so this is a plain, honest "about": typical
// delivery is 30–40 min; when we know how far the restaurant is, ~5 min a
// mile on top of 25 min to make it. Always shown as "about".
export function arrivalMinutes(kind: MealOption['kind'], miles?: number | null): number | null {
  if (kind !== 'out') return null
  if (miles == null || !Number.isFinite(miles)) return 35
  return Math.min(60, Math.max(25, Math.round((25 + miles * 5) / 5) * 5))
}

// ---- what the notification says -------------------------------------------

/** What's saved on the offer row and shown on the notification + the page. */
export interface OfferCard {
  key: string
  kind: MealOption['kind']
  name: string               // full order ("Chicken Bowl: …")
  short: string              // a few words ("Chicken Bowl")
  place: string
  price: number | null
  cal: number; protein: number; carbs: number; fat: number
  photo: string
  app: OrderApp | null       // delivery app for eat-out picks
  miles: number | null
  arrivalMin: number | null
  ingredients?: string[]
}

/** "Chipotle Chicken Bowl · $12" */
export function offerTitle(c: Pick<OfferCard, 'kind' | 'short' | 'place' | 'price'>): string {
  const named = c.kind === 'out' && !c.short.toLowerCase().startsWith(c.place.toLowerCase()) && c.place !== 'Grab & go' ? `${c.place} ${c.short}` : c.short
  return c.price != null && c.price > 0 ? `${named} · ${money(c.price)}` : named
}

/** "Here in about 35 min. Want it?" — or, for a home pick, what to do next. */
export function offerBody(c: Pick<OfferCard, 'kind' | 'arrivalMin' | 'place'>): string {
  if (c.kind === 'out' && c.place !== 'Grab & go') return `Here in about ${c.arrivalMin ?? 35} min. Want it?`
  if (c.place === 'Grab & go') return 'Grab it at any store. Want it?'
  return 'Your home pick. Tap to see what you need.'
}

// An offer she never answered goes stale after 6 hours (a lunch pick tapped
// at bedtime shouldn't log lunch). Answered ones stay viewable.
export const OFFER_STALE_MS = 6 * 3600000
export function isStale(shownAt: string | null | undefined, now: Date = new Date()): boolean {
  const t = shownAt ? new Date(shownAt).getTime() : NaN
  return Number.isFinite(t) && now.getTime() - t > OFFER_STALE_MS
}

export const offerKey = (day: string, meal: string) => `${day}:${meal}`
