import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendPush, pushConfigured, type StoredSub } from '@/lib/push'
import { localDateISO } from '@/lib/localdate'
import { loadNutritionDay } from '@/lib/nutrition-day'
import { buildPicks } from '@/lib/nutrition-picks'
import { offerToSend, pickPair, offerKey, OFFER_MEALS, type OfferMeal } from '@/lib/meal-offer'
import { toOfferCard, offerPush, OFFER_COLS } from '@/lib/meal-offer-server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Meal-time offers (Prompt 3, 2026-10-30): every 15 minutes, for each woman
// with notifications on, in HER timezone — is her usual time for a meal here
// right now (lib/meal-offer offerToSend)? Then ONE meal ready to go, from the
// same picks the Nutrition tab shows (lib/nutrition-picks), as a notification
// with Yes / No. Once per meal per day (meal_offers unique offer_key), never
// once she's logged that meal, never when she turned it off.
//
// Scheduled by Supabase pg_cron + pg_net (migration 050) — Vercel's own cron
// here only runs once a day. Auth: Authorization: Bearer CRON_SECRET.
//
// Test hook (same secret): ?enrollment=<id>&force=1 sends her an offer for
// whatever meal is up right now, skipping the time window and the
// once-a-day check (still never when she turned it off).
export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!pushConfigured) return NextResponse.json({ ok: true, note: 'push not configured', sent: 0 })

  const params = request.nextUrl.searchParams
  const onlyEnrollment = params.get('enrollment')
  const force = !!onlyEnrollment && params.get('force') === '1'

  const svc = createServiceClient()
  let subsQ = svc.from('push_subscriptions').select('endpoint, p256dh, auth, enrollment_id, user_id, timezone').not('enrollment_id', 'is', null)
  if (onlyEnrollment) subsQ = subsQ.eq('enrollment_id', onlyEnrollment)
  const { data: subs } = await subsQ

  // One offer per woman, sent to every device she turned notifications on.
  const byEnrollment = new Map<string, { userId: string | null; tz: string; subs: StoredSub[] }>()
  for (const s of subs || []) {
    const id = s.enrollment_id as string
    const cur = byEnrollment.get(id) || { userId: (s.user_id as string) || null, tz: validTz(s.timezone as string | null), subs: [] }
    cur.subs.push(s as StoredSub)
    byEnrollment.set(id, cur)
  }
  const ids = Array.from(byEnrollment.keys())
  if (!ids.length) return NextResponse.json({ ok: true, sent: 0, checked: 0 })

  // Cheap checks first, in bulk: who turned it off, and what she was already
  // offered in the last ~2 days (her "today" is picked out per timezone below).
  const [{ data: intakes }, offersRes] = await Promise.all([
    svc.from('challenge_intake').select('enrollment_id, form_data').in('enrollment_id', ids),
    svc.from('meal_offers').select('enrollment_id, day, meal').in('enrollment_id', ids).eq('attempt', 1)
      .gte('day', localDateISO('UTC', new Date(Date.now() - 2 * 86400000))),
  ])
  if (offersRes.error) return NextResponse.json({ ok: false, note: 'meal_offers table missing — run migration 050', error: offersRes.error.message }, { status: 500 })
  const offMap = new Map((intakes || []).map((r) => [r.enrollment_id as string, (r.form_data as Record<string, unknown> | null)?.meal_offers_off === true]))

  const tally: Record<string, number> = {}
  const bump = (k: string) => { tally[k] = (tally[k] || 0) + 1 }
  let sent = 0, removed = 0

  for (const [enrollmentId, who] of Array.from(byEnrollment)) {
    try {
      const off = offMap.get(enrollmentId) === true
      if (off) { bump('off'); continue }
      const todayIso = localDateISO(who.tz)
      const offeredMeals = (offersRes.data || []).filter((o) => o.enrollment_id === enrollmentId && o.day === todayIso).map((o) => o.meal as string)
      // Quick pre-check before loading her whole day: nothing could be due
      // if every main meal was already offered.
      if (!force && OFFER_MEALS.every((m) => offeredMeals.includes(m))) { bump('offered'); continue }

      const data = await loadNutritionDay({ id: who.userId || '', email: null }, { tz: who.tz, enrollmentId })
      if (!data?.calBudget || !data.intake) { bump('no-plan'); continue }
      const now = new Date()
      const picks = await buildPicks(data, data.calBudget, now)
      if (!picks.eatStyle) { bump('no-eat-style'); continue }

      let meal: string
      if (force) {
        meal = picks.day.current ? (picks.day.current.slot.toLowerCase()) : 'snack'
      } else {
        const anchors: Record<OfferMeal, number> = { breakfast: data.mealTimes.breakfast, lunch: data.mealTimes.lunch, dinner: data.mealTimes.dinner }
        const decision = offerToSend(picks.nowMin, anchors, {
          off, offeredMeals, loggedMeals: data.foodRows.map((r) => (r.meal as string) || ''),
        })
        if (!decision.send) { bump(decision.reason); continue }
        // The Nutrition tab must agree it's this meal's turn (her meal
        // windows, what she's logged) — one truth for both.
        if (picks.day.current?.id !== decision.meal) { bump('not-current'); continue }
        meal = decision.meal
      }

      const { first, backup } = pickPair(picks.options)
      if (!first) { bump('nothing-fits'); continue }
      const card = toOfferCard(first, picks.orderApp, picks.nearby)
      const backupCard = backup ? toOfferCard(backup, picks.orderApp, picks.nearby) : null

      const key = force ? `${offerKey(todayIso, meal)}:test-${now.getTime()}` : offerKey(todayIso, meal)
      const { data: row, error } = await svc.from('meal_offers').insert({
        enrollment_id: enrollmentId, user_id: who.userId, meal, day: todayIso, offer_key: key, attempt: 1,
        meal_key: card.key, card, backup: backupCard,
      }).select(OFFER_COLS).single()
      // 23505 = already offered (another run got there first) — never twice.
      if (error || !row) { bump(error?.code === '23505' ? 'offered' : 'insert-error'); continue }

      const payload = offerPush(row.id as string, card)
      let ok = 0
      for (const sub of who.subs) {
        const r = await sendPush(sub, payload)
        if (r === 'ok') ok++
        else if (r === 'gone') { await svc.from('push_subscriptions').delete().eq('endpoint', sub.endpoint); removed++ }
      }
      await svc.from('meal_offers').update({ pushed: ok > 0 }).eq('id', row.id as string)
      if (ok) { sent++; bump(`sent:${meal}`) } else bump('push-failed')
    } catch {
      bump('error')
    }
  }
  return NextResponse.json({ ok: true, checked: ids.length, sent, removed, tally })
}

function validTz(tz: string | null): string {
  if (tz) { try { new Intl.DateTimeFormat('en-CA', { timeZone: tz }); return tz } catch { /* fall through */ } }
  return 'America/Los_Angeles'
}
