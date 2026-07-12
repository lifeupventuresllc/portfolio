// ============================================================
// Life-Up Fitness — Meal-plan (calories-as-money) engine
// Her calorie target = her BUDGET. Meals "cost" calories.
// Tracks spent/remaining, suggests add-ons to hit target,
// and auto-builds a weekly plan in the 3-doc structure.
// ============================================================
import { RECIPES, byCategory, type Recipe } from './recipes'
import { portionIngredients, buildGrocery, estimateWeeklyCost, type PortionIngredient, type GrocerySection } from './ingredients'
import { weightClassFor } from './escape-plan'

// ---- Live budget status (drives the interactive bar) ----
export interface DayBudget {
  target: number   // calories she can "spend" today
  spent: number    // calories in her chosen meals
  remaining: number
  pct: number      // 0-100+ for the progress bar
  protein: number
  over: boolean
}
export function budgetStatus(target: number, meals: Recipe[]): DayBudget {
  const spent = Math.round(meals.reduce((s, m) => s + m.cal, 0))
  const protein = Math.round(meals.reduce((s, m) => s + m.protein, 0))
  const remaining = target - spent
  return { target, spent, remaining, pct: Math.round((spent / target) * 100), protein, over: spent > target + 50 }
}

// ---- Suggest add-ons (snacks/desserts) to fill the remaining budget ----
export function suggestAddOns(remaining: number, light = false): Recipe[] {
  if (remaining < 90) return []
  let pool = light ? byCategory('snack') : [...byCategory('snack'), ...byCategory('dessert')]
  pool = [...pool].sort((a, b) => Math.abs(a.cal - remaining) - Math.abs(b.cal - remaining))
  const picks: Recipe[] = []
  let left = remaining
  // best single fit first
  const first = pool.find(p => p.cal <= remaining + 70)
  if (first) { picks.push(first); left -= first.cal }
  // add a light second if there's a meaningful gap left (workout days)
  if (!light && left > 180) {
    const second = byCategory('snack').filter(p => !picks.includes(p)).sort((a, b) => Math.abs(a.cal - left) - Math.abs(b.cal - left))[0]
    if (second && second.cal <= left + 70) picks.push(second)
  }
  return picks
}

// ---- Auto-build a full weekly plan (coach-generate / default) ----
export interface MealPlanInputs {
  name?: string
  workoutDayCal: number  // from her Calorie Blueprint (workout-day target)
  restDayCal: number     // rest-day target
  goal?: 'lose' | 'gain' | 'maintain'
  budget?: boolean       // prefer budget-friendly meals
  weekNumber?: number
}
export interface MealSession {
  label: string; days: string; protein: string
  breakfast: Recipe; lunch: Recipe; dinner: Recipe
  baseCal: number; baseProtein: number
}
export interface WeeklyMealPlan {
  name: string; weekNumber: number
  sessions: MealSession[]
  avgBase: number
  portionFactor: number   // <1 = eat a smaller portion of each base meal so it fits the budget
  workout: { target: number; base: number; add: number; addOns: Recipe[] }
  rest: { target: number; base: number; add: number; addOns: Recipe[] }
}

function rot<T>(a: T[], n: number): T[] { if (!a.length) return a; const k = ((n % a.length) + a.length) % a.length; return a.slice(k).concat(a.slice(0, k)) }

export function buildWeeklyPlan(inp: MealPlanInputs): WeeklyMealPlan {
  const wk = inp.weekNumber || 1
  const breakfasts = rot(byCategory('breakfast'), wk)
  let mains = byCategory('main')
  if (inp.budget) mains = [...mains].sort((a, b) => (a.budget === b.budget ? 0 : a.budget ? -1 : 1))
  mains = rot(mains, wk)

  const session = (i: number, days: string, proteinLabel: string): MealSession => {
    const b = breakfasts[i % breakfasts.length]
    const lunch = mains[(i * 2) % mains.length]
    const dinner = mains[(i * 2 + 1) % mains.length]
    return {
      label: i === 0 ? 'Cook Sunday' : 'Cook Wednesday', days, protein: proteinLabel,
      breakfast: b, lunch, dinner,
      baseCal: Math.round(b.cal + lunch.cal + dinner.cal),
      baseProtein: Math.round(b.protein + lunch.protein + dinner.protein),
    }
  }
  const sessions = [
    session(0, 'Mon · Tue · Wed', 'Chicken'),
    session(1, 'Thu · Fri · Sat', 'Ground Turkey'),
  ]
  const rawBase = Math.round((sessions[0].baseCal + sessions[1].baseCal) / 2)
  // Scale the base meals so 3 meals fit the rest-day budget (leave ~5% room for a light add-on).
  // Never scale UP (cap at 1); floor at 0.55 so portions stay realistic.
  const portionFactor = Math.min(1, Math.max(0.55, (inp.restDayCal * 0.95) / rawBase))
  const base = Math.round(rawBase * portionFactor)
  for (const s of sessions) {
    s.baseCal = Math.round(s.baseCal * portionFactor)
    s.baseProtein = Math.round(s.baseProtein * portionFactor)
  }

  const workoutAdd = Math.max(0, inp.workoutDayCal - base)
  const restAdd = Math.max(0, inp.restDayCal - base)
  return {
    name: inp.name || 'Your',
    weekNumber: wk,
    sessions,
    avgBase: base,
    portionFactor: Math.round(portionFactor * 100) / 100,
    workout: { target: inp.workoutDayCal, base, add: workoutAdd, addOns: suggestAddOns(workoutAdd, false) },
    rest: { target: inp.restDayCal, base, add: restAdd, addOns: suggestAddOns(restAdd, true) },
  }
}

// ============================================================
// USER-SELECTED weekly plan (The Menu Blueprint rules)
// Week = 6 days Mon–Sat (Sun = cook day). 5 slots/day: BF, LN, SN, DN, DS.
// Cook-day coverage: 1=Sun(all 6) · 2=Sun(1-3)+Wed(4-6) · 3=Sun(1-2)+Tue(3-4)+Thu(5-6).
// Meals rotate across the days; each day's 3 mains scale to hit her day-type target,
// snacks + desserts fill the rest. "Same recipe, different portion."
// ============================================================
export type DayType = 'workout' | 'rest'
export type Slot = 'BF' | 'LN' | 'SN' | 'DN' | 'DS'

export interface SelectedMeals {
  breakfasts: Recipe[]; lunches: Recipe[]; dinners: Recipe[]
  snacks: Recipe[]; desserts: Recipe[]
}
export interface WeekSelectionInputs {
  name?: string
  workoutDayCal: number
  restDayCal: number
  proteinTarget: number
  cookDays: 1 | 2 | 3
  dayTypes: DayType[]        // length 6, Mon..Sat
  selections: SelectedMeals
  eatOutDays?: boolean[]     // length 6 — days she eats fast-food (Escape Plan) instead of cooking
  weightLbs?: number         // picks her Escape Plan weight class
}
export interface PlannedMeal {
  slot: Slot; name: string
  cal: number; protein: number; carbs: number; fat: number
  portion: 'Lighter' | 'Regular' | 'Large'
  ingredients: PortionIngredient[]   // scaled to THIS portion (empty if no cookbook data)
}
export interface PlannedDay {
  dayName: string; dayType: DayType; target: number
  meals: PlannedMeal[]; totalCal: number; totalProtein: number
  eatOut?: boolean            // this day = fast-food from the Escape Plan
}
export interface CookBatch { label: string; covers: string; meals: string[] }
export interface WeekPlan {
  name: string; cookDays: 1 | 2 | 3
  days: PlannedDay[]; batches: CookBatch[]
  grocery: GrocerySection[]
  groceryCost: number   // estimated $ for the week
  avgCal: number; avgProtein: number; proteinTarget: number
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const COOK_CONFIG: Record<1 | 2 | 3, { label: string; covers: string; range: [number, number] }[]> = {
  1: [{ label: 'Cook Sunday', covers: 'Mon–Sat', range: [0, 5] }],
  2: [{ label: 'Cook Sunday', covers: 'Mon–Wed', range: [0, 2] }, { label: 'Cook Wednesday', covers: 'Thu–Sat', range: [3, 5] }],
  3: [{ label: 'Cook Sunday', covers: 'Mon–Tue', range: [0, 1] }, { label: 'Cook Tuesday', covers: 'Wed–Thu', range: [2, 3] }, { label: 'Cook Thursday', covers: 'Fri–Sat', range: [4, 5] }],
}
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const at = <T,>(arr: T[], i: number): T | undefined => (arr.length ? arr[i % arr.length] : undefined)

export function buildWeekFromSelections(inp: WeekSelectionInputs): WeekPlan {
  const { breakfasts, lunches, dinners, snacks, desserts } = inp.selections
  const days: PlannedDay[] = []
  const occurrences: { name: string; factor: number }[] = []  // every meal eaten this week (for grocery)

  const SLOT_FROM_FF: Record<string, Slot> = { Breakfast: 'BF', Lunch: 'LN', Snack: 'SN', Dinner: 'DN' }

  for (let i = 0; i < 6; i++) {
    const dayType: DayType = inp.dayTypes[i] === 'workout' ? 'workout' : 'rest'

    // Eat-out day → pull her weight class's fast-food orders (fixed macros, no cooking, no grocery)
    if (inp.eatOutDays?.[i]) {
      const wc = weightClassFor(inp.weightLbs || 170)
      const eDay = wc.days[i % wc.days.length]
      const meals: PlannedMeal[] = eDay.meals.map((fm) => ({
        slot: SLOT_FROM_FF[fm.slot] || 'SN', name: `${fm.restaurant} — ${fm.order}`,
        cal: fm.cal, protein: fm.protein, carbs: fm.carbs, fat: fm.fat, portion: 'Regular', ingredients: [],
      }))
      days.push({
        dayName: DAY_NAMES[i], dayType, target: eDay.total, meals, eatOut: true,
        totalCal: meals.reduce((s, m) => s + m.cal, 0),
        totalProtein: meals.reduce((s, m) => s + m.protein, 0),
      })
      continue
    }

    const target = dayType === 'workout' ? inp.workoutDayCal : inp.restDayCal
    const bf = at(breakfasts, i), ln = at(lunches, i), dn = at(dinners, i)
    const sn = at(snacks, i), ds = at(desserts, i)

    const mains = [bf, ln, dn].filter(Boolean) as Recipe[]
    const mainsBase = mains.reduce((s, m) => s + m.cal, 0)
    const addOnCal = (sn?.cal || 0) + (ds?.cal || 0)
    // scale the 3 mains so mains + fixed add-ons land on her day target
    const factor = mainsBase > 0 ? clamp((target - addOnCal) / mainsBase, 0.5, 1.6) : 1
    const portion: PlannedMeal['portion'] = factor < 0.9 ? 'Lighter' : factor > 1.15 ? 'Large' : 'Regular'

    const scaleMain = (m: Recipe, slot: Slot): PlannedMeal => {
      occurrences.push({ name: m.name, factor })
      return {
        slot, name: m.name, portion,
        cal: Math.round(m.cal * factor), protein: Math.round(m.protein * factor),
        carbs: Math.round(m.carbs * factor), fat: Math.round(m.fat * factor),
        ingredients: portionIngredients(m.name, factor),
      }
    }
    const fixed = (m: Recipe, slot: Slot): PlannedMeal => {
      occurrences.push({ name: m.name, factor: 1 })
      return { slot, name: m.name, portion: 'Regular', cal: m.cal, protein: m.protein, carbs: m.carbs, fat: m.fat, ingredients: portionIngredients(m.name, 1) }
    }

    const meals: PlannedMeal[] = []
    if (bf) meals.push(scaleMain(bf, 'BF'))
    if (ln) meals.push(scaleMain(ln, 'LN'))
    if (sn) meals.push(fixed(sn, 'SN'))
    if (dn) meals.push(scaleMain(dn, 'DN'))
    if (ds) meals.push(fixed(ds, 'DS'))

    days.push({
      dayName: DAY_NAMES[i], dayType, target, meals,
      totalCal: meals.reduce((s, m) => s + m.cal, 0),
      totalProtein: meals.reduce((s, m) => s + m.protein, 0),
    })
  }

  // Cook batches: unique main meals used within each session's day-range
  const batches: CookBatch[] = COOK_CONFIG[inp.cookDays].map(({ label, covers, range }) => {
    const names = new Set<string>()
    for (let i = range[0]; i <= range[1]; i++) {
      if (days[i].eatOut) continue  // eat-out days aren't cooked
      days[i].meals.filter(m => m.slot === 'BF' || m.slot === 'LN' || m.slot === 'DN').forEach(m => names.add(m.name))
    }
    return { label, covers, meals: Array.from(names) }
  })

  return {
    name: inp.name || 'Your',
    cookDays: inp.cookDays,
    days,
    batches,
    grocery: buildGrocery(occurrences),
    groceryCost: estimateWeeklyCost(occurrences),
    avgCal: Math.round(days.reduce((s, d) => s + d.totalCal, 0) / 6),
    avgProtein: Math.round(days.reduce((s, d) => s + d.totalProtein, 0) / 6),
    proteinTarget: inp.proteinTarget,
  }
}

// How many meals to pick per slot, by cook days (Blueprint guidance for the UI)
export const PICK_GUIDE: Record<1 | 2 | 3, { mains: string; snacks: string; desserts: string }> = {
  1: { mains: '2–3 each', snacks: '2–3', desserts: '2–3' },
  2: { mains: '3 each', snacks: '2–3', desserts: '2–3' },
  3: { mains: '3–6 each', snacks: '2–3', desserts: '3–6' },
}

export { RECIPES }
