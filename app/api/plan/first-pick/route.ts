import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadNutritionDay, localMinute } from '@/lib/nutrition-day'
import { openChainsNear } from '@/lib/fos/nearby-food'
import { verifiedChains } from '@/lib/chain-menu'
import { pickMeals, planDay, defaultMealBudget, mealPhoto, shortName, type EatStyle, type MealMemory, type MealSlot } from '@/lib/meal-pick'

export const dynamic = 'force-dynamic'

// The plan reveal's "Your lunch today · already picked" card (new intake,
// 2026-10-25). Same picker and same day logic as the Nutrition tab, just the
// top pick — so the meal she sees at the reveal is the one waiting for her
// on the tab. 2026-10-26: same open-near-her filter as the tab once her
// location is known, so Home's lunch chip never names a closed place.
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ pick: null })
  const data = await loadNutritionDay(user)
  if (!data || !data.calBudget || !data.intake) return NextResponse.json({ pick: null })
  const { enrollment, intake, foodRows, calBudget, weekPlan, mealIdx, todayIso, tz, mealTimes } = data

  const formData = (intake.form_data || {}) as Record<string, unknown>
  const style = formData.eat_style
  const eatStyle: EatStyle | null = style === 'cook' ? 'cook' : style === 'out' || style === 'mix' ? 'out' : null
  if (!eatStyle) return NextResponse.json({ pick: null })

  const loggedToday = foodRows.reduce((sum, r) => sum + (Number(r.calories) || 0), 0)
  const remainingCal = Math.max(0, Math.round(calBudget - loggedToday))
  const nowMin = localMinute(tz, new Date())
  const day = planDay(nowMin, foodRows.map((r) => ({ meal: (r.meal as string) || '', minute: localMinute(tz, new Date(r.created_at as string)) })), remainingCal, mealTimes)
  const slot: MealSlot = day.current?.slot ?? 'Snack'

  const lat = enrollment.last_lat as number | null, lng = enrollment.last_lng as number | null
  const locAt = enrollment.last_location_at as string | null
  const nearby = eatStyle === 'out' && locAt && Date.now() - new Date(locAt).getTime() < 24 * 3600000 && lat != null && lng != null && process.env.GOOGLE_PLACES_API_KEY
    ? await openChainsNear(lat, lng, verifiedChains()) : undefined

  const pickFor = (style: EatStyle) => pickMeals({
    eatStyle: style, slot, remainingCal, nearby: style === 'out' ? nearby : undefined,
    mealBudget: style === eatStyle && Number(formData.meal_budget) ? Number(formData.meal_budget) : defaultMealBudget(style, Number(intake.weekly_food_budget) || null),
    weightLbs: Number(intake.weight_lbs) || 170,
    dislikesAllergies: intake.dislikes_allergies as string | null,
    foodPreferences: intake.food_preferences as string | null,
    weekPlan, todayIdx: mealIdx,
    memory: (formData.meal_memory || {}) as MealMemory,
    todayIso,
    slotCalBudget: day.calBudget,
  })
  // Nothing open near her that fits → her home pick, never a closed place.
  const o = pickFor(eatStyle).options[0] || (eatStyle === 'out' && nearby ? pickFor('cook').options[0] : undefined)
  if (!o) return NextResponse.json({ pick: null })
  return NextResponse.json({
    pick: {
      label: day.current?.label || 'snack',
      name: shortName(o), place: o.place, kind: o.kind,
      cal: o.cal, protein: o.protein, price: o.price, photo: mealPhoto(o),
    },
  })
}
