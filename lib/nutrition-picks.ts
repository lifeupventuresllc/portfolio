import { localMinute, type loadNutritionDay } from '@/lib/nutrition-day'
import { pickMeals, planDay, defaultMealBudget, type EatStyle, type MealMemory, type MealSlot, type MealOption, type OrderApp, type PickResult, type DayPlan } from '@/lib/meal-pick'
import { openChainsNear } from '@/lib/fos/nearby-food'
import { verifiedChains } from '@/lib/chain-menu'
import { partnerMealKeys } from '@/lib/partners'
import { dailyFoodBudget, moneyLeft, fitToMoney } from '@/lib/food-budget'

// The meals for THIS meal, ranked best first — one builder for the Nutrition
// tab (app/plan/nutrition) and the meal-time offer (app/api/cron/meal-offer),
// so a notification can never suggest something the tab wouldn't. Rules
// (moved here unchanged from the Nutrition page, 2026-10-30):
//   - the clock + her food log decide which meal is up (planDay), her own
//     usual meal times outrank the default clock;
//   - calories left today and today's food money are hard rules;
//   - eat-out picks only from chains open near her (when we know where she is);
//   - "a mix" eater gets one eat-out and one home pick, interleaved;
//   - at most one "<Name> had this" card.
export type NutritionDay = NonNullable<Awaited<ReturnType<typeof loadNutritionDay>>>

export interface BuiltPicks {
  eatStyle: EatStyle | null
  result: PickResult | null
  options: MealOption[]       // final ranked list (money + friend rules applied)
  lightOptions: MealOption[]  // hit her number → her lightest meals (money applied)
  moneyOver: boolean
  moneyDaily: number | null
  left: number | null
  day: DayPlan
  slot: MealSlot
  nowMin: number
  loggedToday: number
  remainingCal: number
  orderApp: OrderApp
  nearby: Map<string, number> | undefined
  locFresh: boolean
}

export async function buildPicks(data: NutritionDay, calBudget: number, now: Date = new Date()): Promise<BuiltPicks> {
  const { enrollment, intake, foodRows, weekPlan, mealIdx, todayIso, tz, mealTimes, moneySpent } = data
  const loggedToday = foodRows.reduce((sum, r) => sum + (Number(r.calories) || 0), 0)
  const remainingCal = Math.max(0, Math.round(calBudget - loggedToday))
  const nowMin = localMinute(tz, now)
  const day = planDay(nowMin, foodRows.map((r) => ({ meal: (r.meal as string) || '', minute: localMinute(tz, new Date(r.created_at as string)) })), remainingCal, mealTimes)
  // Every meal done today → the lightest snacks, only if she's still hungry.
  const slot: MealSlot = day.current?.slot ?? 'Snack'

  const formData = (intake?.form_data || {}) as Record<string, unknown>
  // 'mix' (2026-10-25 new intake): she cooks some meals and eats out others —
  // one eat-out pick and one home pick, side by side. Location + nearby work
  // off the eat-out side.
  const mix = formData.eat_style === 'mix'
  const eatStyle: EatStyle | null = (formData.eat_style === 'cook' || formData.eat_style === 'out') ? formData.eat_style as EatStyle : mix ? 'out' : null
  const weekly = Number(intake?.weekly_food_budget) || null
  const mealBudget = eatStyle ? (Number(formData.meal_budget) || defaultMealBudget(eatStyle, weekly)) : 0
  const orderApp: OrderApp = formData.order_app === 'ubereats' ? 'ubereats' : 'doordash'
  // Today's food money (2026-10-30): her weekly budget ÷ 7, minus the meals
  // she accepted today. A hard rule for every pick, like calories.
  const moneyDaily = dailyFoodBudget(weekly)
  const left = moneyDaily != null ? moneyLeft(moneyDaily, moneySpent) : null

  // Where she is (2026-10-23, Google Places): eating out + a known position
  // → only chains open near her right now (lib/fos/nearby-food). 2026-10-26
  // (Asa: late at night it showed closed places): any position from the last
  // day counts for open/closed — what's open near home doesn't need a fresh
  // ping — and "nothing open" stays nothing open, never every chain.
  let nearby: Map<string, number> | undefined
  const lat = enrollment.last_lat as number | null, lng = enrollment.last_lng as number | null
  const locAt = enrollment.last_location_at as string | null
  const locAge = locAt ? now.getTime() - new Date(locAt).getTime() : Infinity
  const locFresh = locAge < 60 * 60000
  if (eatStyle === 'out' && locAge < 24 * 3600000 && lat != null && lng != null && process.env.GOOGLE_PLACES_API_KEY) {
    nearby = await openChainsNear(lat, lng, verifiedChains())
  }

  // "<Name> had this" (Friends): her partner's recent picks, only when her
  // partner shares meals. Each still has to pass every one of her own checks.
  const partner = eatStyle ? await partnerMealKeys(enrollment.id as string) : null

  const base = {
    remainingCal, slot,
    weightLbs: Number(intake?.weight_lbs) || 170,
    dislikesAllergies: intake?.dislikes_allergies as string | null,
    foodPreferences: intake?.food_preferences as string | null,
    weekPlan, todayIdx: mealIdx,
    memory: (formData.meal_memory || {}) as MealMemory,
    todayIso,
    slotCalBudget: day.calBudget,
    partner,
    moneyLeft: left,
  }
  const result = eatStyle ? pickMeals({ ...base, eatStyle, mealBudget, nearby }) : null
  let options = result?.options || []
  // Fewer than two open spots fit her calories (late at night) → fill with
  // home picks, never a closed restaurant.
  // Same when no eat-out meal fits the money left today: home picks cost less.
  const fitsLeft = (o: MealOption) => left == null || o.price == null || o.price <= left
  const fillHome = !mix && eatStyle === 'out' && ((!!nearby && options.length < 2) || (left != null && !options.some(fitsLeft)))
  if ((mix || fillHome) && result) {
    const home = pickMeals({ ...base, eatStyle: 'cook', mealBudget: defaultMealBudget('cook', weekly) }).options
    // Interleave so the two cards on screen are one out, one home — and a
    // swap keeps that rhythm.
    const both: MealOption[] = []
    for (let i = 0; i < Math.max(options.length, home.length); i++) {
      if (options[i]) both.push(options[i])
      if (home[i]) both.push(home[i])
    }
    options = both
  }
  // Only what fits the money left today; nothing fits → the cheapest one,
  // and the screen says so.
  const money = fitToMoney(options, left)
  options = money.options
  // At most one "<Name> had this" card on the whole screen.
  let friendShown = false
  options = options.map((o) => {
    if (!o.friend) return o
    if (!friendShown) { friendShown = true; return o }
    return { ...o, friend: undefined }
  })
  const lightOptions = options.length ? [] : fitToMoney(result?.lightOptions || [], left).options

  return { eatStyle, result, options, lightOptions, moneyOver: money.over, moneyDaily, left, day, slot, nowMin, loggedToday, remainingCal, orderApp, nearby, locFresh }
}
