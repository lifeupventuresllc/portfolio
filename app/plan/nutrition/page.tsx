import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NutritionPicks, { EatStyleAsk, type PickCard } from '@/components/NutritionPicks'
import { localHourNumber } from '@/lib/localdate'
import { loadNutritionDay } from '@/lib/nutrition-day'
import { pickMeals, slotForHour, defaultMealBudget, orderDestination, mealPhoto, shortName, type EatStyle, type MealMemory, type MealSlot, type OrderApp } from '@/lib/meal-pick'
import { SHOW_CALORIE_COUNTER } from '@/lib/feature-flags'

export const dynamic = 'force-dynamic'

// The Nutrition tab, v4 (2026-10-20, Asa: "she just taps an option within 5
// seconds, no thinking, everything else can go"). Two big photos for THIS
// meal — already fit to her calories left (hard rule, never over), her money
// for one meal, her "never" foods, and how she eats (cook vs eat out, two of
// the same kind). Nothing else on the screen. Her food log, the camera, and
// the cook/eat-out + money settings live on /plan/nutrition/log (My Day's
// "+ Log food").
const NEXT_SLOT: Record<MealSlot, MealSlot | null> = { Breakfast: 'Lunch', Lunch: 'Dinner', Dinner: 'Snack', Snack: null }

export default async function NutritionPage() {
  if (!SHOW_CALORIE_COUNTER) redirect('/plan')
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/plan/nutrition')

  const day = await loadNutritionDay(user)
  // Her calorie target comes from the plan she already has — never asked
  // again here. No plan yet → send her through the existing plan creation.
  if (!day || !day.calBudget || !day.intake) return <NoPlanYet />
  const { intake, foodRows, calBudget, weekPlan, mealIdx, todayIso, tz } = day

  const loggedToday = foodRows.reduce((sum, r) => sum + (Number(r.calories) || 0), 0)
  const remainingCal = Math.max(0, Math.round(calBudget - loggedToday))
  const loggedMeals = new Set(foodRows.map((r) => (r.meal as string) || ''))

  // Which meal is this? The clock's meal — unless she's already logged it,
  // then the next one, so she's never handed lunch twice.
  let slot: MealSlot = slotForHour(localHourNumber(tz))
  while (loggedMeals.has(slot.toLowerCase()) && NEXT_SLOT[slot]) slot = NEXT_SLOT[slot]!

  const formData = (intake.form_data || {}) as Record<string, unknown>
  const eatStyle = (formData.eat_style === 'cook' || formData.eat_style === 'out') ? formData.eat_style as EatStyle : null
  const mealBudget = eatStyle ? (Number(formData.meal_budget) || defaultMealBudget(eatStyle, Number(intake.weekly_food_budget) || null)) : 0
  const orderApp: OrderApp = formData.order_app === 'ubereats' ? 'ubereats' : 'doordash'

  const result = eatStyle ? pickMeals({
    eatStyle, mealBudget, remainingCal, slot,
    weightLbs: Number(intake.weight_lbs) || 170,
    dislikesAllergies: intake.dislikes_allergies as string | null,
    foodPreferences: intake.food_preferences as string | null,
    weekPlan, todayIdx: mealIdx,
    memory: (formData.meal_memory || {}) as MealMemory,
    todayIso,
  }) : null
  const cards: PickCard[] = (result?.options || []).slice(0, 12).map((o) => ({
    ...o, dest: orderDestination(o, orderApp), photo: mealPhoto(o), short: shortName(o),
  }))

  const heading = loggedMeals.has(slot.toLowerCase()) ? 'Still hungry? Pick a light one.' : `Pick your ${slot.toLowerCase()}.`

  return (
    <div className="px-4 pt-6 flex flex-col" style={{ background: '#021F16', height: 'calc(100dvh - 64px)' }}>
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col min-h-0">
        {eatStyle && result ? (
          <NutritionPicks cards={cards} slot={slot} heading={heading} remainingCal={remainingCal} />
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
