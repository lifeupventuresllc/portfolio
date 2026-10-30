import { createServiceClient } from '@/lib/supabase/server'
import { mealPhoto, shortName, updateMemory, type MealOption, type MealMemory, type OrderApp } from '@/lib/meal-pick'
import { arrivalMinutes, afterNo, stopLine, offerTitle, offerBody, type OfferCard } from '@/lib/meal-offer'
import { yesAction, placeOrder } from '@/lib/order-link'
import type { PushPayload } from '@/lib/push'

// Server side of the meal-time offer (see lib/meal-offer.ts for the rules).
// Table: meal_offers (migration 050), one row per meal shown — attempt 1 is
// the notification, attempt 2 the one different meal after a No.

type Svc = ReturnType<typeof createServiceClient>

export interface OfferRow {
  id: string
  enrollment_id: string
  user_id: string | null
  meal: string
  day: string
  offer_key: string
  attempt: number
  meal_key: string
  card: OfferCard
  backup: OfferCard | null
  answer: 'yes' | 'no' | null
  answered_at: string | null
  shown_at: string | null
}
export const OFFER_COLS = 'id, enrollment_id, user_id, meal, day, offer_key, attempt, meal_key, card, backup, answer, answered_at, shown_at'

/** The offer, only if it's hers (by her user id, or her email on the enrollment). */
export async function ownOffer(svc: Svc, id: string, user: { id: string; email?: string | null }): Promise<OfferRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const { data } = await svc.from('meal_offers').select(OFFER_COLS).eq('id', id).maybeSingle()
  const offer = data as OfferRow | null
  if (!offer) return null
  const { data: enrollment } = await svc.from('challenge_enrollments').select('id, user_id, email').eq('id', offer.enrollment_id).maybeSingle()
  if (!enrollment) return null
  const mine = enrollment.user_id === user.id || (!!user.email && !!enrollment.email && (enrollment.email as string).toLowerCase() === user.email.toLowerCase())
  return mine ? offer : null
}

/** A ranked pick → what the offer saves and shows. */
export function toOfferCard(o: MealOption, app: OrderApp, nearby?: Map<string, number>): OfferCard {
  const out = o.kind === 'out' && o.place !== 'Grab & go'
  const miles = out ? nearby?.get(o.place) ?? null : null
  return {
    key: o.key, kind: o.kind, name: o.name, short: shortName(o), place: o.place, price: o.price,
    cal: o.cal, protein: o.protein, carbs: o.carbs, fat: o.fat, photo: mealPhoto(o),
    app: out ? app : null, miles, arrivalMin: out ? arrivalMinutes(o.kind, miles) : null,
    ingredients: o.ingredients,
  }
}

/** The notification for one offer row. */
export function offerPush(id: string, card: OfferCard): PushPayload {
  return {
    title: offerTitle(card), body: offerBody(card), url: `/plan/offer/${id}`,
    tag: `meal-offer-${id}`, offerId: id,
    actions: [{ action: 'yes', title: 'Yes' }, { action: 'no', title: 'No' }],
  }
}

/** Her latest offer for this meal (attempt 2 when she already said No once). */
export async function latestForKey(svc: Svc, enrollmentId: string, offerKey: string): Promise<OfferRow | null> {
  const { data } = await svc.from('meal_offers').select(OFFER_COLS).eq('enrollment_id', enrollmentId).eq('offer_key', offerKey)
    .order('attempt', { ascending: false }).limit(1).maybeSingle()
  return (data as OfferRow | null) || null
}

async function remember(svc: Svc, enrollmentId: string, key: string, signal: 'picked' | 'skipped', day: string) {
  const { data: intake } = await svc.from('challenge_intake').select('id, form_data').eq('enrollment_id', enrollmentId).maybeSingle()
  if (!intake) return
  const formData = { ...((intake.form_data || {}) as Record<string, unknown>) }
  formData.meal_memory = updateMemory((formData.meal_memory || {}) as MealMemory, key, signal, day)
  await svc.from('challenge_intake').update({ form_data: formData }).eq('id', intake.id as string)
}

export type YesResult = {
  answer: 'yes'
  offerId: string
  card: OfferCard
  placed: boolean               // true only once ordering is connected (lib/order-link ORDERING_LIVE)
  open: string | null           // where the notification's Yes opens (delivery link, or this page for a home pick)
  copy: string | null           // the meal, for her restaurant's menu search
}
export type NoResult =
  | { answer: 'no'; next: { id: string; card: OfferCard; push: PushPayload } }
  | { answer: 'no'; stop: string }

/**
 * Save her Yes / No (once — a second tap on an answered offer just returns
 * the same result, it never logs twice).
 *   Yes → the meal + price go in her food log (same row a Nutrition-tab pick
 *         makes), meal_memory "picked", and the order link to open. Nothing
 *         is ever ordered or charged here unless ordering is connected AND
 *         this is her Yes (yesAction / placeOrder in lib/order-link).
 *   No  → meal_memory "skipped", then one different meal (attempt 2), or
 *         after a second No: stop until her next meal.
 */
export async function answerOffer(svc: Svc, offer: OfferRow, answer: 'yes' | 'no', via: 'page' | 'notification'): Promise<YesResult | NoResult> {
  if (answer === 'yes') {
    const first = !offer.answer
    if (offer.answer === 'no') {
      // A late Yes on a meal she already passed on — count it as her Yes now.
      await svc.from('meal_offers').update({ answer: 'yes', answered_at: new Date().toISOString(), answered_via: via }).eq('id', offer.id)
    } else if (first) {
      const { data: claimed } = await svc.from('meal_offers').update({ answer: 'yes', answered_at: new Date().toISOString(), answered_via: via })
        .eq('id', offer.id).is('answer', null).select('id')
      if (!claimed?.length) return answerOffer(svc, { ...offer, answer: 'yes' }, 'yes', via) // another tap won the race
    }
    const c = offer.card
    if (offer.answer !== 'yes') {
      const row = {
        enrollment_id: offer.enrollment_id, user_id: offer.user_id, logged_on: offer.day, meal: offer.meal,
        name: c.name, brand: c.place, servings: 1, calories: Math.round(c.cal), protein_g: Math.round(c.protein),
        carbs_g: Math.round(c.carbs), fats_g: Math.round(c.fat), source: 'meal_pick',
      }
      const price = c.price && c.price > 0 ? Math.min(999, Math.round(c.price * 100) / 100) : 0
      const { error } = price > 0 ? await svc.from('challenge_food_log').insert({ ...row, price }) : { error: null }
      if (!price || error) await svc.from('challenge_food_log').insert(row)
      await remember(svc, offer.enrollment_id, c.key, 'picked', offer.day)
    }
    let placed = false, open: string | null = null, copy: string | null = null
    if (c.kind === 'out' && c.app && c.place !== 'Grab & go') {
      const act = yesAction({ place: c.place, name: c.name, key: c.key }, c.app)
      copy = act.link.copy
      if (act.kind === 'place' && offer.answer !== 'yes') placed = (await placeOrder({ place: c.place, name: c.name, key: c.key }, c.app)).placed
      open = placed ? null : act.link.web
    } else {
      open = `/plan/offer/${offer.id}`
    }
    return { answer: 'yes', offerId: offer.id, card: c, placed, open, copy }
  }

  // No
  if (!offer.answer) {
    const { data: claimed } = await svc.from('meal_offers').update({ answer: 'no', answered_at: new Date().toISOString(), answered_via: via })
      .eq('id', offer.id).is('answer', null).select('id')
    if (claimed?.length) await remember(svc, offer.enrollment_id, offer.card.key, 'skipped', offer.day)
  } else if (offer.answer === 'yes') {
    return { answer: 'no', stop: 'You already said yes to this one.' }
  }
  const step = afterNo(offer.attempt, offer.meal, !!offer.backup)
  if (step.next === 'stop') return { answer: 'no', stop: step.line }
  // attempt 2: the one different meal, saved at send time. Already made by
  // an earlier tap → hand that one back, never a third meal.
  const { data: existing } = await svc.from('meal_offers').select(OFFER_COLS)
    .eq('enrollment_id', offer.enrollment_id).eq('offer_key', offer.offer_key).eq('attempt', 2).maybeSingle()
  let second = existing as OfferRow | null
  if (!second) {
    const { data: made, error } = await svc.from('meal_offers').insert({
      enrollment_id: offer.enrollment_id, user_id: offer.user_id, meal: offer.meal, day: offer.day,
      offer_key: offer.offer_key, attempt: 2, meal_key: offer.backup!.key, card: offer.backup, backup: null,
    }).select(OFFER_COLS).single()
    if (error || !made) {
      const { data: again } = await svc.from('meal_offers').select(OFFER_COLS)
        .eq('enrollment_id', offer.enrollment_id).eq('offer_key', offer.offer_key).eq('attempt', 2).maybeSingle()
      second = again as OfferRow | null
    } else second = made as OfferRow
  }
  if (!second || second.answer === 'no') return { answer: 'no', stop: stopLine(offer.meal) }
  return { answer: 'no', next: { id: second.id, card: second.card, push: offerPush(second.id, second.card) } }
}
