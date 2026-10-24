import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NutritionPicks, { EatStyleAsk, type PickCard } from '@/components/NutritionPicks'
import { loadNutritionDay, localMinute } from '@/lib/nutrition-day'
import { pickMeals, planDay, clockLabel, defaultMealBudget, orderDestination, mealPhoto, shortName, type EatStyle, type MealMemory, type MealSlot, type OrderApp } from '@/lib/meal-pick'
import { SHOW_CALORIE_COUNTER } from '@/lib/feature-flags'
import { placesNear, chainsNear } from '@/lib/fos/nearby-food'
import { verifiedChains } from '@/lib/chain-menu'
import LocationOptIn from '@/components/LocationOptIn'

export const dynamic = 'force-dynamic'

// The Nutrition tab, v4 (2026-10-20, Asa: "she just taps an option within 5
// seconds, no thinking, everything else can go"). Two big photos for THIS
// meal — already fit to her calories left (hard rule, never over), her money
// for one meal, her "never" foods, and how she eats (cook vs eat out, two of
// the same kind). Nothing else on the screen. Her food log, the camera, and
// the cook/eat-out + money settings live on /plan/nutrition/log (My Day's
// "+ Log food").
// v4.1 (same day): the clock + her food log decide which meal is up
// (lib/meal-pick planDay) — breakfast logged → lunch is waiting, then the
// afternoon snack, dinner, the evening snack — and the screen moves on by
// itself when that meal's time passes. Her own usual meal times (learned
// from her log, lib/meal-pick mealTimesFrom) outrank the default clock.

export default async function NutritionPage() {
  if (!SHOW_CALORIE_COUNTER) redirect('/plan')
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/plan/nutrition')

  const data = await loadNutritionDay(user)
  // Her calorie target comes from the plan she already has — never asked
  // again here. No plan yet → send her through the existing plan creation.
  if (!data || !data.calBudget || !data.intake) return <NoPlanYet />
  const { enrollment, intake, foodRows, calBudget, weekPlan, mealIdx, todayIso, tz, mealTimes } = data

  const loggedToday = foodRows.reduce((sum, r) => sum + (Number(r.calories) || 0), 0)
  const remainingCal = Math.max(0, Math.round(calBudget - loggedToday))
  const nowMin = localMinute(tz, new Date())
  const day = planDay(nowMin, foodRows.map((r) => ({ meal: (r.meal as string) || '', minute: localMinute(tz, new Date(r.created_at as string)) })), remainingCal, mealTimes)
  // Every meal done today → the lightest snacks, only if she's still hungry.
  const slot: MealSlot = day.current?.slot ?? 'Snack'

  const formData = (intake.form_data || {}) as Record<string, unknown>
  const eatStyle = (formData.eat_style === 'cook' || formData.eat_style === 'out') ? formData.eat_style as EatStyle : null
  const mealBudget = eatStyle ? (Number(formData.meal_budget) || defaultMealBudget(eatStyle, Number(intake.weekly_food_budget) || null)) : 0
  const orderApp: OrderApp = formData.order_app === 'ubereats' ? 'ubereats' : 'doordash'

  // Where she is (2026-10-23, Google Places): eating out + a position from the
  // last hour → only chains open within a mile of her (3 miles if fewer than
  // two are). She never sees the distance — it just decides the two picks.
  let nearby: Map<string, number> | undefined
  const lat = enrollment.last_lat as number | null, lng = enrollment.last_lng as number | null
  const locAt = enrollment.last_location_at as string | null
  const locFresh = !!locAt && Date.now() - new Date(locAt).getTime() < 60 * 60000
  if (eatStyle === 'out' && locFresh && lat != null && lng != null && process.env.GOOGLE_PLACES_API_KEY) {
    nearby = chainsNear(await placesNear(lat, lng, 1609), verifiedChains(), lat, lng)
    if (nearby.size < 2) {
      const wider = chainsNear(await placesNear(lat, lng, 4828), verifiedChains(), lat, lng)
      // Nothing we know is open within 3 miles (or Google had trouble):
      // fall back to every pick rather than an empty screen.
      nearby = wider.size >= 1 ? wider : undefined
    }
  }

  const pick = (near: typeof nearby) => eatStyle ? pickMeals({
    eatStyle, mealBudget, remainingCal, slot,
    weightLbs: Number(intake.weight_lbs) || 170,
    dislikesAllergies: intake.dislikes_allergies as string | null,
    foodPreferences: intake.food_preferences as string | null,
    weekPlan, todayIdx: mealIdx,
    memory: (formData.meal_memory || {}) as MealMemory,
    todayIso,
    slotCalBudget: day.calBudget,
    nearby: near,
  }) : null
  let result = pick(nearby)
  // Fewer than two nearby meals fit her calories → every pick, never one card.
  if (nearby && result && result.options.length < 2) result = pick(undefined)
  const cards: PickCard[] = (result?.options || []).slice(0, 12).map((o) => ({
    ...o, dest: orderDestination(o, orderApp), photo: mealPhoto(o), short: shortName(o),
  }))

  const heading = day.current ? `Pick your ${day.current.label}.` : 'Still hungry? Pick a light one.'
  // What's waiting after this one — said once she's picked.
  const next = day.next ? `Next up: your ${day.next.label}${day.next.start > nowMin + 30 ? `, around ${clockLabel(day.next.start)}` : ''}.` : null

  return (
    <div className="px-4 pt-6 flex flex-col" style={{ background: '#021F16', height: 'calc(100dvh - 64px)' }}>
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col min-h-0">
        {eatStyle === 'out' && !locFresh && <LocationOptIn prompt="Show meals open near you right now?" refreshOnPing />}
        {eatStyle && result ? (
          <NutritionPicks key={`${day.current?.id ?? 'done'}:${cards.map((c) => c.key).join('|')}`} cards={cards} slot={slot} heading={heading} remainingCal={remainingCal} nextUp={next} refreshInMin={day.refreshInMin} />
        ) : (
          <EatStyleAsk />
        )}
      </div>
    </div>
  )
}

function NoPlanYet() {
  return (
    <div className="min-h-[100dvh] px-6 pt-16 pb-28" style={{ background: '#021F16' }}>
      <div className="max-w-sm mx-auto text-center">
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#EDE7DA' }}>Let&apos;s get your numbers first</h1>
        <p className="text-sm mb-6" style={{ color: 'rgba(237,231,218,0.55)' }}>Once your plan is set, this tab picks every meal for you.</p>
        <Link href="/plan/intake" className="inline-block rounded-2xl px-8 py-3.5 font-bold text-sm" style={{ background: '#E5A93C', color: '#0A0A0F' }}>Start my plan</Link>
      </div>
    </div>
  )
}
