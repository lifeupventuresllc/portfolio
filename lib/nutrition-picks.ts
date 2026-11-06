import { localMinute, type loadNutritionDay } from '@/lib/nutrition-day'
import { pickMeals, planDay, defaultMealBudget, type EatStyle, type MealMemory, type MealSlot, type MealOption, type OrderApp, type PickResult, type DayPlan } from '@/lib/meal-pick'
import { openChainsNear } from '@/lib/fos/nearby-food'
import { verifiedChains } from '@/lib/chain-menu'
import { partnerMealKeys } from '@/lib/partners'
import { dailyFoodBudget, moneyLeft, fitToMoney } from '@/lib/food-budget'
import { PLAN_STOPS, EXTRA_SNACKS, readPlan, planFromForm, nextDayISO, type PlanStopId, type SavedDayPlan } from '@/lib/day-plan'

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
    priceFactors: (formData.price_factors || {}) as Record<string, number>,
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

// ---- her whole day, picked up front (2026-11-05) ----------------------------
// Asa's first real user test: she plans breakfast → lunch → snack → dinner in
// one go, confirms, and sees her day. Every meal gets its own ranked list of
// eat-out AND cook-at-home picks, so she can switch any meal between the two.
// Same hard rules as buildPicks: never over her calories (each meal gets its
// share of what's left today), never her "never" foods, today's food money,
// eat-out only from places open near her when we know where she is.
export interface DayStopPicks {
  id: PlanStopId
  label: string
  calBudget: number
  out: MealOption[]
  cook: MealOption[]
}
export interface BuiltDay {
  eatStyle: EatStyle | null
  mix: boolean
  stops: DayStopPicks[]          // breakfast, lunch, snack, dinner, extra snacks
  avail: number                  // calories for her planned meals (target minus food she logged outside the plan)
  plan: SavedDayPlan
  orderApp: OrderApp
  moneyDaily: number | null
  locFresh: boolean
  hasPlaces: boolean             // the "near me" lookup is switched on for this app
}

export async function buildDayPicks(data: NutritionDay, calBudget: number, now: Date = new Date(), day: 'today' | 'tomorrow' = 'today'): Promise<BuiltDay> {
  const { enrollment, intake, weekPlan, mealIdx, todayIso } = data
  // Tomorrow ("Plan tomorrow" on the Day done screen): a full, fresh day —
  // nothing logged or spent yet.
  const ahead = day === 'tomorrow'
  const foodRows = ahead ? [] : data.foodRows
  const moneySpent = ahead ? 0 : data.moneySpent
  const formData = (intake?.form_data || {}) as Record<string, unknown>
  const plan = ahead ? readPlan(formData.day_plan_next, nextDayISO(todayIso)) : planFromForm(formData, todayIso)
  const mix = formData.eat_style === 'mix'
  const eatStyle: EatStyle | null = (formData.eat_style === 'cook' || formData.eat_style === 'out') ? formData.eat_style as EatStyle : mix ? 'out' : null
  const weekly = Number(intake?.weekly_food_budget) || null
  const outBudget = Number(formData.meal_budget) && eatStyle === 'out' ? Number(formData.meal_budget) : defaultMealBudget('out', weekly)
  const cookBudget = Number(formData.meal_budget) && eatStyle === 'cook' ? Number(formData.meal_budget) : defaultMealBudget('cook', weekly)
  const orderApp: OrderApp = formData.order_app === 'ubereats' ? 'ubereats' : 'doordash'
  const moneyDaily = dailyFoodBudget(weekly)
  const left = moneyDaily != null ? moneyLeft(moneyDaily, moneySpent) : null

  // Food she logged today that ISN'T one of her planned meals (camera, typed
  // in) already used some of today's calories.
  const planIds = new Set(Object.values(plan.picks).map((p) => p?.eatenId).filter(Boolean))
  const outside = foodRows.filter((r) => !planIds.has(r.id as string)).reduce((s, r) => s + (Number(r.calories) || 0), 0)
  const avail = Math.max(0, Math.round(calBudget - outside))

  let nearby: Map<string, number> | undefined
  const lat = enrollment.last_lat as number | null, lng = enrollment.last_lng as number | null
  const locAt = enrollment.last_location_at as string | null
  const locAge = locAt ? now.getTime() - new Date(locAt).getTime() : Infinity
  const locFresh = locAge < 24 * 3600000
  const hasPlaces = !!process.env.GOOGLE_PLACES_API_KEY
  if (locFresh && lat != null && lng != null && hasPlaces) nearby = await openChainsNear(lat, lng, verifiedChains())
  const partner = eatStyle ? await partnerMealKeys(enrollment.id as string) : null

  const base = {
    remainingCal: avail,
    weightLbs: Number(intake?.weight_lbs) || 170,
    dislikesAllergies: intake?.dislikes_allergies as string | null,
    foodPreferences: intake?.food_preferences as string | null,
    weekPlan, todayIdx: mealIdx,
    memory: (formData.meal_memory || {}) as MealMemory,
    todayIso, partner,
    moneyLeft: left,
    priceFactors: (formData.price_factors || {}) as Record<string, number>,
  }
  const stopPicks = (def: { id: PlanStopId; slot: MealSlot; label: string; share: number }): DayStopPicks => {
    // Extra snacks: up to a normal snack's size; the phone hides any that
    // don't fit what's left once her day is planned.
    const raw = def.share ? Math.round(avail * def.share) : 350
    const budget = def.slot === 'Snack' ? Math.max(120, Math.min(raw, 350)) : raw
    const ctx = { ...base, slot: def.slot, slotCalBudget: budget }
    const out = pickMeals({ ...ctx, eatStyle: 'out', mealBudget: outBudget, nearby }).options
    const cook = pickMeals({ ...ctx, eatStyle: 'cook', mealBudget: cookBudget }).options
    const once = (list: MealOption[]) => {
      let friendShown = false
      return fitToMoney(list, left).options.slice(0, 12).map((o) => {
        if (!o.friend) return o
        if (!friendShown) { friendShown = true; return o }
        return { ...o, friend: undefined }
      })
    }
    return { id: def.id, label: def.label, calBudget: budget, out: once(out), cook: once(cook) }
  }
  const stops = [...PLAN_STOPS, ...EXTRA_SNACKS].map(stopPicks)
  return { eatStyle, mix, stops, avail, plan, orderApp, moneyDaily, locFresh, hasPlaces }
}
