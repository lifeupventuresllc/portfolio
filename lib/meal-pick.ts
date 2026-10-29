import { ESCAPE_PLAN, weightClassFor, violatesRestrictions, parseDietaryRestrictions, doordashSearchUrl, type FastFoodMeal, type DietaryRestriction } from '@/lib/escape-plan'
import { RECIPES, type Recipe } from '@/lib/recipes'
import { CHAIN_MENU } from '@/lib/chain-menu'
import { estimateWeeklyCost, portionIngredients } from '@/lib/ingredients'
import type { WeekPlan } from '@/lib/meal-plan'

// ============================================================
// The Nutrition tab's one-tap meal decision (2026-10-19, Asa's builder
// prompt + mockup v3). She never decides — the app hands her exactly two
// meals for THIS meal that already fit:
//   1. her calories left today (same number every other screen uses),
//   2. her money for one meal (Asa: "we MUST take their budget into
//      consideration"),
//   3. her "never" foods (hard rule, never overridden),
//   4. how she eats: a "mostly eat out" person gets two eating-out picks,
//      a "mostly cook" person gets two cooking picks (Asa's correction on
//      mockup v2 — never one of each).
// Then it learns from what she taps and skips (MealMemory below).
//
// Trust rules: every calorie number here is real curated data — chain
// meals from lib/chain-menu.ts (read off each chain's own website),
// cooking meals from The Menu cookbook (lib/recipes.ts). No
// meal without a known calorie number is ever recommended. Prices are
// always "about" — there is no live price feed, so they're shown and
// labeled as estimates, never as exact.
// ============================================================

export type EatStyle = 'cook' | 'out'
export type MealSlot = FastFoodMeal['slot']
export type CalSource = 'published' | 'estimated'

export interface MealOption {
  key: string
  kind: EatStyle
  slot: MealSlot
  name: string
  place: string              // restaurant, or "Your meal plan" / "The Menu cookbook"
  cal: number; protein: number; carbs: number; fat: number
  calSource: CalSource
  price: number | null       // "about $X" — always an estimate
  why: string                // one real reason, never invented
  ingredients?: string[]     // cooking picks only, portioned to her
  friend?: string            // "<Name> had this" — her partner's first name (at most one card)
}

// Per-meal learning signals, stored on her intake row (form_data.meal_memory)
// — o = times she picked it, s = times she skipped it ("Show me two others"),
// last = local date she last picked it (variety penalty), skip = local
// date she last skipped it.
export type MealMemory = Record<string, { o?: number; s?: number; last?: string; skip?: string }>

export interface PickContext {
  eatStyle: EatStyle
  mealBudget: number          // $ for one meal
  remainingCal: number        // calories left today
  slot: MealSlot
  weightLbs: number
  dislikesAllergies?: string | null
  foodPreferences?: string | null
  weekPlan?: WeekPlan | null
  todayIdx?: number           // Mon=0 … Sat=5 (weekPlan day)
  memory?: MealMemory
  todayIso: string
  slotCalBudget?: number      // from planDay(): this meal's share of what's left today
  nearby?: Map<string, number> // chains open near her right now → miles (Google Places); absent = location unknown
  partner?: { name: string; keys: Set<string> } | null // her partner's picked meals, last 3 days (only when shared)
}

export interface PickResult {
  options: MealOption[]       // ranked, best first — the page shows them two at a time
  slotCalBudget: number       // calories this one meal should land under
  light: boolean              // she's close to her number today
  note: string | null         // plain words when we had to relax something
}

// ---- slots + calorie split ---------------------------------------------

export function slotForHour(hour: number): MealSlot {
  return hour < 11 ? 'Breakfast' : hour < 15 ? 'Lunch' : hour < 20 ? 'Dinner' : 'Snack'
}

const SLOT_ORDER: MealSlot[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack']
const SLOT_SHARE: Record<MealSlot, number> = { Breakfast: 0.25, Lunch: 0.35, Dinner: 0.32, Snack: 0.08 }

/** What THIS meal can spend: her calories left today, split across the
 * meals she still has left (same proportions a normal day uses). */
export function slotCalorieBudget(remainingCal: number, slot: MealSlot): number {
  const left = SLOT_ORDER.slice(SLOT_ORDER.indexOf(slot))
  const share = SLOT_SHARE[slot] / left.reduce((s, x) => s + SLOT_SHARE[x], 0)
  return Math.round(remainingCal * share)
}

// ---- the day's rhythm (v4.1, 2026-10-20) --------------------------------
// Asa: the tab already knows the time and what she's eaten — breakfast
// logged → lunch is waiting; lunch logged → the afternoon snack; then dinner,
// then an evening snack. Calories reflow over the meals she still has left,
// so every pick re-sizes the moment she logs anything. Never stagnant.

export type StopId = 'breakfast' | 'lunch' | 'snack_pm' | 'dinner' | 'snack_eve'
export interface DayStop { id: StopId; slot: MealSlot; label: string; start: number; end: number; share: number }
const H = (h: number, m = 0) => h * 60 + m

// HER meal times beat the clock (Asa, 2026-10-20: "what ranks over that is
// actually user data — late lunches because of work, early dinners"). Each
// main meal has an anchor: the time she usually eats it, learned from her
// own food log (mealTimesFrom below), or a normal default until she's
// logged enough. The windows hang off those anchors.
export interface MealTimes { breakfast: number; lunch: number; dinner: number; learned: StopId[] }
export const DEFAULT_MEAL_TIMES: MealTimes = { breakfast: H(7, 30), lunch: H(12, 30), dinner: H(18, 30), learned: [] }

// A meal's window opens 2h before her usual time (dinner: 1.5h) and stays
// open until the next meal's window opens — a late lunch is still lunch. The
// afternoon snack sits 2h after lunch, the evening snack 1h after dinner;
// a snack only shows once the meal before it is done.
export function dayStops(t: MealTimes = DEFAULT_MEAL_TIMES): DayStop[] {
  const lunchOpen = t.lunch - 120
  const dinnerOpen = t.dinner - 90
  return [
    { id: 'breakfast', slot: 'Breakfast', label: 'breakfast', start: Math.min(H(4), t.breakfast - 120), end: lunchOpen, share: 0.25 },
    { id: 'lunch', slot: 'Lunch', label: 'lunch', start: lunchOpen, end: dinnerOpen, share: 0.33 },
    { id: 'snack_pm', slot: 'Snack', label: 'afternoon snack', start: Math.min(t.lunch + 120, dinnerOpen), end: dinnerOpen, share: 0.07 },
    { id: 'dinner', slot: 'Dinner', label: 'dinner', start: dinnerOpen, end: H(24), share: 0.30 },
    { id: 'snack_eve', slot: 'Snack', label: 'evening snack', start: Math.min(t.dinner + 60, H(23)), end: H(24), share: 0.05 },
  ]
}
export const DAY_STOPS = dayStops()

/** Her usual time for each meal — the middle of the times she's logged it
 * over the past few weeks (needs 3+ days so one odd day doesn't move it).
 * Kept in order with room between meals, so the windows always make sense. */
export function mealTimesFrom(history: { meal: string; minute: number; day: string }[]): MealTimes {
  const out: MealTimes = { ...DEFAULT_MEAL_TIMES, learned: [] }
  for (const meal of ['breakfast', 'lunch', 'dinner'] as const) {
    // first log of that meal each day = when she sat down to eat it
    const perDay = new Map<string, number>()
    for (const h of history) if (h.meal === meal && h.minute >= H(3)) perDay.set(h.day, Math.min(perDay.get(h.day) ?? Infinity, h.minute))
    const times = Array.from(perDay.values()).sort((x, y) => x - y)
    if (times.length >= 3) { out[meal] = times[Math.floor(times.length / 2)]; out.learned.push(meal) }
  }
  // Keep breakfast < lunch < dinner with at least 2.5h between them.
  out.breakfast = clamp(out.breakfast, H(4), H(14))
  out.lunch = clamp(Math.max(out.lunch, out.breakfast + 150), H(9), H(19))
  out.dinner = clamp(Math.max(out.dinner, out.lunch + 150), H(14), H(23))
  return out
}

export interface LoggedMeal { meal: string; minute: number }   // food-log meal + local minute it was logged

function stopDone(s: DayStop, logs: LoggedMeal[], stops: DayStop[]): boolean {
  if (s.slot !== 'Snack') return logs.some((l) => l.meal === s.id)
  // One "snack" tag in the log: from her lunchtime to her dinner time → the
  // afternoon snack (she may pick it right after lunch), after that → the
  // evening one. An early-morning snack counts as neither, and no snack ever
  // skips a meal (planDay only moves forward on real meals).
  const lunchOpen = stops[1].start, dinnerOpen = stops[3].start
  return logs.some((l) => l.meal === 'snack' && (s.id === 'snack_pm' ? l.minute >= lunchOpen && l.minute < dinnerOpen : l.minute >= dinnerOpen))
}

export interface DayPlan {
  current: DayStop | null      // null = every meal today is done
  next: DayStop | null         // what's waiting after this one
  calBudget: number            // calories THIS meal can use
  refreshInMin: number         // when the screen should move on by itself
}

export function planDay(nowMin: number, logs: LoggedMeal[], remainingCal: number, times: MealTimes = DEFAULT_MEAL_TIMES): DayPlan {
  const stops = dayStops(times)
  const doneIdx = stops.map((s) => stopDone(s, logs, stops))
  // Only a real meal moves the day forward — a snack never skips lunch.
  const lastDone = stops.reduce((last, s, i) => (doneIdx[i] && s.slot !== 'Snack' ? i : last), -1)
  // Still ahead: not eaten, its time not passed, and not before a meal she's
  // already had (dinner logged at 4:30 → the afternoon snack is gone).
  const ahead = stops.filter((s, i) => !doneIdx[i] && s.end > nowMin && i > lastDone)
  const current = ahead[0] || null
  const shares = ahead.reduce((t, s) => t + s.share, 0)
  // A snack stays a snack even when she has plenty left.
  const raw = current ? Math.round(remainingCal * (current.share / shares)) : remainingCal
  const calBudget = current?.slot === 'Snack' || !current ? Math.min(raw, 350) : raw
  const refreshInMin = Math.max(1, (current ? current.end : H(24)) - nowMin)
  return { current, next: ahead[1] || null, calBudget, refreshInMin }
}

export function clockLabel(min: number): string {
  const h = Math.floor(min / 60) % 24, m = min % 60
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''}${h < 12 ? 'am' : 'pm'}`
}

// ---- money --------------------------------------------------------------

/** Her money for one meal when she hasn't set it herself — from the weekly
 * food budget she already gave at intake when there is one. */
export function defaultMealBudget(style: EatStyle, weeklyFoodBudget?: number | null): number {
  const w = Number(weeklyFoodBudget) || 0
  if (style === 'cook') return w > 0 ? clamp(Math.round(w / 18), 3, 15) : 6
  return w > 0 ? clamp(Math.round(w / 7), 8, 25) : 12
}

// Typical menu price for one person's order at each chain (US, 2026).
// Estimates only — shown as "about $X", never as an exact price.
const CHAIN_PRICE: Record<string, number> = {
  "McDonald's": 8, 'Taco Bell': 8, 'Subway': 10, 'Burger King': 8, "Wendy's": 9, 'Chick-fil-A': 10,
  'Chipotle': 12, 'Panda Express': 11, 'Starbucks': 8, 'Panera': 12, "Dunkin'": 7, "Culver's": 10,
  "Domino's": 12, 'Five Guys': 14, "Jimmy John's": 10, 'KFC': 10, 'Popeyes': 10, 'Qdoba': 12,
  'Shake Shack': 13, 'Sonic': 9, 'Sweetgreen': 15, 'Wingstop': 13, "Arby's": 10, "Jersey Mike's": 13,
  "Raising Cane's": 11, 'Firehouse Subs': 12, 'Cava': 14, 'Grab & go': 3,
}

export function chainPrice(m: FastFoodMeal): number {
  const base = CHAIN_PRICE[m.restaurant] ?? 11
  const sized = m.slot === 'Breakfast' ? base * 0.75 : m.slot === 'Snack' && m.restaurant !== 'Grab & go' ? base * 0.6 : base
  const upsized = /double|extra (chicken|patty|meat|grilled)|2 servings|\(\d+ wraps\)|\+ .*\+ .*\+/i.test(m.order)
  return Math.round(sized + (upsized ? 3 : 0))
}

function recipeCost(name: string, factor = 1): number | null {
  const c = estimateWeeklyCost([{ name, factor }])
  return c > 0 ? Math.max(1, c) : null
}

// ---- candidates -----------------------------------------------------------

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

// A picked meal in the food log keeps its name + place (brand) but not its
// key — rebuild it exactly the way the candidates below build theirs.
const COOK_PLACES = new Set(['Your meal plan', 'The Menu cookbook'])
export function mealKeyFromLog(name: string, brand: string | null | undefined): string {
  return !brand || COOK_PLACES.has(brand) ? `cook:${slugify(name)}` : `out:${slugify(brand)}:${slugify(name)}`
}

function eatOutCandidates(ctx: PickContext): MealOption[] {
  const wc = weightClassFor(ctx.weightLbs)
  // Lunch and dinner portions are interchangeable; breakfast and snacks stay
  // in their own slot so she's never handed a sandwich at 7am.
  const slotsFor = (s: MealSlot): MealSlot[] => (s === 'Lunch' || s === 'Dinner' ? ['Lunch', 'Dinner'] : [s])
  const want = slotsFor(ctx.slot)
  const seen = new Set<string>()
  const out: MealOption[] = []
  // Verified-only (2026-10-21, Asa chose accuracy over variety): restaurant
  // meals come ONLY from lib/chain-menu (read off each chain's own site). The
  // older escape-plan combos had estimated numbers and some discontinued
  // items, so only their packaged grab & go picks (bars, shakes) stay.
  const grabAndGo = [...wc.days.flatMap((d) => d.meals), ...wc.extraOptions].filter((m) => m.restaurant === 'Grab & go')
  for (const m of [...CHAIN_MENU, ...grabAndGo]) {
    if (!want.includes(m.slot)) continue
    // Where she is (2026-10-23): once we know her location, only chains
    // that are open near her right now — grab & go works anywhere.
    if (ctx.nearby && m.restaurant !== 'Grab & go' && !ctx.nearby.has(m.restaurant)) continue
    const key = `out:${slugify(m.restaurant)}:${slugify(m.order)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      key, kind: 'out', slot: ctx.slot, name: m.order, place: m.restaurant,
      cal: m.cal, protein: m.protein, carbs: m.carbs, fat: m.fat, calSource: 'published',
      price: ('price' in m && typeof m.price === 'number') ? Math.round(m.price) : chainPrice(m), why: '',
    })
  }
  return out
}

const RECIPE_CATEGORY: Record<MealSlot, Recipe['category'][]> = {
  Breakfast: ['breakfast'], Lunch: ['main'], Dinner: ['main'], Snack: ['snack'],
}
const PLAN_SLOT: Record<MealSlot, string> = { Breakfast: 'BF', Lunch: 'LN', Dinner: 'DN', Snack: 'SN' }

function cookCandidates(ctx: PickContext): MealOption[] {
  const out: MealOption[] = []
  const seen = new Set<string>()
  // Her own plan's meal for this slot today comes first — already portioned
  // to her calories, already on her grocery list.
  const today = ctx.weekPlan && ctx.todayIdx != null && ctx.todayIdx <= 5 ? ctx.weekPlan.days[ctx.todayIdx] : null
  const planned = today && !today.eatOut ? today.meals.find((m) => m.slot === PLAN_SLOT[ctx.slot]) : null
  if (planned) {
    const base = RECIPES.find((r) => r.name === planned.name)
    const factor = base && base.cal > 0 ? planned.cal / base.cal : 1
    const key = `cook:${slugify(planned.name)}`
    seen.add(key)
    out.push({
      key, kind: 'cook', slot: ctx.slot, name: planned.name, place: 'Your meal plan',
      cal: planned.cal, protein: planned.protein, carbs: planned.carbs, fat: planned.fat, calSource: 'published',
      price: recipeCost(planned.name, factor), why: '',
      ingredients: (planned.ingredients || []).map((i) => i.amount),
    })
  }
  for (const r of RECIPES) {
    if (!RECIPE_CATEGORY[ctx.slot].includes(r.category) || r.earlyAccess) continue
    const key = `cook:${slugify(r.name)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      key, kind: 'cook', slot: ctx.slot, name: r.name, place: 'The Menu cookbook',
      cal: r.cal, protein: r.protein, carbs: r.carbs, fat: r.fat, calSource: 'published',
      price: recipeCost(r.name), why: '',
      ingredients: portionIngredients(r.name, 1).map((i) => i.amount),
    })
  }
  return out
}

// Cooking picks list real ingredients, so dairy-free also has to catch the
// milk/butter/cream the chain-order pattern never needed to (plant milks
// and nut butters are fine).
const RECIPE_DAIRY = /\b(milk|butter|cream|parmesan|mozzarella|cheddar|ricotta|whey|ghee)\b/i
const NOT_DAIRY = /\b(peanut|nut|almond|cashew|sunflower|coconut|oat|soy|apple)\s+(milk|butter|cream)\b/gi

function violates(o: MealOption, restrictions: Set<DietaryRestriction>, dislikeWords: string[]): boolean {
  const text = `${o.name} ${(o.ingredients || []).join(' ')}`
  if (restrictions.size > 0 && violatesRestrictions(text, restrictions)) return true
  if (o.kind === 'cook' && restrictions.has('dairy') && RECIPE_DAIRY.test(text.replace(NOT_DAIRY, ''))) return true
  const lower = text.toLowerCase()
  return dislikeWords.some((w) => lower.includes(w))
}

// "no onions, hate olives, never mushrooms" → ['onion', 'olive', 'mushroom'].
// Only plain food words she actually typed; allergy categories are handled
// by parseDietaryRestrictions above.
function dislikeWordsFrom(text?: string | null): string[] {
  if (!text) return []
  const STOP = new Set(['no', 'not', 'dont', 'don', 't', 'like', 'hate', 'never', 'free', 'allergy', 'allergic', 'to', 'and', 'or', 'any', 'i', 'the', 'a', 'of', 'dairy', 'gluten', 'nuts', 'nut'])
  return text.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 4 && !STOP.has(w)).map((w) => w.replace(/(es|s)$/, ''))
}

function loveWordsFrom(text?: string | null): string[] {
  if (!text) return []
  return text.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 4 && !['love', 'like', 'with', 'food', 'foods', 'anything'].includes(w)).map((w) => w.replace(/(es|s)$/, ''))
}

// ---- the pick -------------------------------------------------------------

export function pickMeals(ctx: PickContext): PickResult {
  const restrictions = parseDietaryRestrictions(ctx.dislikesAllergies)
  const dislikeWords = dislikeWordsFrom(ctx.dislikesAllergies)
  const loveWords = loveWordsFrom(ctx.foodPreferences)
  const memory = ctx.memory || {}
  const remaining = Math.max(0, ctx.remainingCal)
  const slotBudget = ctx.slotCalBudget ?? slotCalorieBudget(remaining, ctx.slot)
  const light = remaining > 0 && remaining < 350

  // Hard rules first: her "never" foods and a known calorie number. Never relaxed.
  const all = (ctx.eatStyle === 'out' ? eatOutCandidates(ctx) : cookCandidates(ctx))
    .filter((o) => o.cal > 0 && !violates(o, restrictions, dislikeWords))

  // Calories: under this meal's share (15% cushion), and never over what she
  // has left for the whole day.
  const calCap = Math.min(remaining, Math.round(slotBudget * 1.15))
  const fitsCal = (o: MealOption) => o.cal <= calCap
  const fitsMoney = (o: MealOption) => o.price == null || o.price <= ctx.mealBudget

  let pool = all.filter((o) => fitsCal(o) && fitsMoney(o))
  let note: string | null = null
  if (pool.length < 2) {
    // Money is the soft rule — calories stay a must. Tell her plainly.
    const calOnly = all.filter(fitsCal)
    if (calOnly.length >= 2) {
      pool = calOnly
      note = `Nothing came in under $${ctx.mealBudget} right now, so these are the closest.`
    } else {
      // She has very little left today: only this meal's share is relaxed —
      // what's left for the WHOLE day is never passed (2026-10-29 audit: this
      // used to fall back to the 6 lightest meals with no calorie check, so
      // 150 left showed 200 and 250 cal cards). Nothing under that → no
      // cards; the screen says she's hit her number.
      const dayFit = all.filter((o) => o.cal <= remaining)
      if (dayFit.length > calOnly.length) {
        pool = dayFit
        note = 'You’re close to your number today, so these are the lightest picks.'
      } else if (calOnly.length) pool = calOnly
      else pool = []
    }
  }

  const scored = pool.map((o) => {
    const mem = memory[o.key] || {}
    let score = 0
    // calorie fit: close to (just under) this meal's share
    score += 30 - Math.min(30, Math.abs(slotBudget - o.cal) / 15)
    // money fit: comfortably under her budget scores higher
    if (o.price != null) score += o.price <= ctx.mealBudget ? 10 + Math.min(8, (ctx.mealBudget - o.price) * 1.5) : -10
    // her own plan's meal for today
    if (o.place === 'Your meal plan') score += 18
    // tastes she told us
    const text = `${o.name} ${o.place}`.toLowerCase()
    const loved = loveWords.find((w) => text.includes(w))
    if (loved) score += 12
    // learning: picked before = up, skipped = down
    score += Math.min(3, mem.o || 0) * 8
    score -= Math.min(4, mem.s || 0) * 7
    // variety: something she picked in the last 2 days drops back
    if (mem.last && daysBetween(mem.last, ctx.todayIso) < 2) score -= 25
    // skipped earlier today: don't hand it straight back at the next meal
    if (mem.skip === ctx.todayIso) score -= 30
    if (light) score += Math.max(0, 15 - o.cal / 40)
    // closer is faster: up to +10 for a place right next to her
    const miles = ctx.nearby?.get(o.place)
    if (miles != null) score += Math.max(0, 10 - miles * 6)
    // protein keeps her full and on plan: grams per 100 calories, up to +10
    if (o.cal > 0) score += Math.min(10, (o.protein / o.cal) * 100 * 1.2)
    // Fresh every meal, every day: a small shuffle seeded by today + this
    // meal, so the same top pair doesn't greet her day after day (and stays
    // put while she's looking at it).
    score += (hash(`${ctx.todayIso}:${ctx.slot}:${o.key}`) % 13) - 6
    return { o: { ...o, why: whyFor(o, ctx, mem, loved) }, score }
  })

  // "<Name> had this" (2026-10-26, friends-plan.md §4): at most ONE of her
  // partner's recent picks, and only when it already passed every one of her
  // own checks above (never-foods, eat style, meal time, open near her) AND
  // fits her calories and money outright — never through a relaxed rule. It
  // gets a small boost; her own plan still leads.
  if (ctx.partner && ctx.partner.keys.size) {
    const best = scored
      .filter((s) => ctx.partner!.keys.has(s.o.key) && fitsCal(s.o) && fitsMoney(s.o))
      .sort((a, b) => b.score - a.score)[0]
    if (best) {
      best.score += 14
      best.o = { ...best.o, friend: ctx.partner.name, why: `${ctx.partner.name} had this. Fits your ${ctx.slot.toLowerCase()}.` }
    }
  }
  scored.sort((a, b) => b.score - a.score)

  // Order the list so every consecutive pair is two genuinely different meals
  // (different restaurant when eating out, different dish when cooking).
  const ranked: MealOption[] = []
  const rest = scored.map((s) => s.o)
  while (rest.length) {
    const first = rest.shift()!
    ranked.push(first)
    const idx = rest.findIndex((o) => (o.kind === 'out' ? o.place !== first.place : o.name !== first.name))
    if (idx >= 0) ranked.push(rest.splice(idx, 1)[0])
  }

  return { options: ranked, slotCalBudget: slotBudget, light, note }
}

function whyFor(o: MealOption, ctx: PickContext, mem: { o?: number }, loved?: string): string {
  const parts: string[] = []
  if (o.place === 'Your meal plan') parts.push('It’s in your plan today.')
  else if (o.price != null && o.price <= ctx.mealBudget) parts.push(o.kind === 'cook' && ctx.mealBudget - o.price >= 3 ? `Saves you about $${ctx.mealBudget - o.price}.` : `Under your $${ctx.mealBudget}.`)
  if ((mem.o || 0) > 0) parts.push('You picked it before.')
  else if (loved) parts.push(`You said you love ${loved}.`)
  else if (o.protein >= 35) parts.push(`${o.protein}g protein keeps you full.`)
  return parts.slice(0, 2).join(' ') || 'Fits what you have left today.'
}

// ---- ordering handoff -------------------------------------------------------
// One function: given a meal, the best place to send her. Version 1 links out
// (no payments, no delivery). Swap this for a deeper integration later
// without touching the Nutrition tab.
//
// kind:
//   'restaurant' — the chain's own online ordering page
//   'delivery'   — a delivery-app search for that chain (lands on a results
//                  page, can't skip straight to the item) — FLAGGED for review
//   'recipe'     — cooking pick; no ordering, she just makes it
export interface OrderDestination { url: string | null; label: string; kind: 'delivery' | 'recipe'; app: OrderApp | null }
export type OrderApp = 'doordash' | 'ubereats'
export const ORDER_APP_NAME: Record<OrderApp, string> = { doordash: 'DoorDash', ubereats: 'Uber Eats' }

// v4 (2026-10-20, Asa: "reduce the click… a link to DoorDash or Uber Eats"):
// every eat-out pick goes straight to her delivery app's search for that
// restaurant — no chain website in between. Neither app offers a public way
// to fill her cart, so she adds the item there. In-app ordering (tap → confirm
// → ordered, never leaving) needs an ordering API (MealMe) — not wired yet.
export function orderDestination(o: MealOption, app: OrderApp = 'doordash'): OrderDestination {
  if (o.kind === 'cook') return { url: null, label: 'What you need', kind: 'recipe', app: null }
  if (o.place === 'Grab & go') return { url: null, label: 'Grab it at any store', kind: 'recipe', app: null }
  const url = app === 'ubereats'
    ? `/api/go?app=ubereats&q=${encodeURIComponent(o.place)}`
    : doordashSearchUrl(o.place)
  return { url, label: `Order on ${ORDER_APP_NAME[app]}`, kind: 'delivery', app }
}

// ---- card face: a photo + a short name ------------------------------------

// Her own cookbook photos first (public/images/meals), then a photo of that
// KIND of food (public/images/meals/food, credits in lib/meal-photo-credits).
const RECIPE_PHOTOS = new Set(['buffalo-chicken-bowls', 'crispy-honey-garlic-chicken', 'garlic-butter-chicken-meatballs', 'marry-me-chicken-pasta', 'protein-overnight-oats', 'turkey-sausage-sweet-potato-hash'])
const FOOD_PHOTO: [RegExp, string][] = [
  [/cheesecake/i, 'cheesecake'], [/cookie|brookie|skillet cookie/i, 'cookie'], [/tiramisu|shortcake|pumpkin pie|dough/i, 'cheesecake'],
  [/egg bites/i, 'egg-bites'], [/core power|premier|fairlife|protein shake|muscle milk|ready.to.drink/i, 'protein-shake'], [/shake/i, 'shake'], [/protein bar|quest|bar\b/i, 'protein-bar'], [/parfait|yogurt|yoplait|clusters/i, 'parfait'],
  [/oats|oatmeal/i, 'oats'], [/banana|rice cakes|nut butter|\bpb\b/i, 'banana-pb'], [/protein box/i, 'banana-pb'],
  [/breakfast burrito|crunchwrap/i, 'breakfast-burrito'], [/mcmuffin|egg white grill|egg.*sandwich|bagel|breakfast sandwich|steak & wake/i, 'breakfast-sandwich'],
  [/burger|whopper|big mac|shackburger|smokeshack|quarter pounder|mcdouble/i, 'burger'],
  [/egg.*wrap|wrap|pocket|pita/i, 'wrap'], [/wings?\b/i, 'wings'], [/tenders|nugget|strips|chicken fingers/i, 'tenders'],
  [/soup.*(sandwich|panini|grilled cheese|baguette)|(sandwich|panini|grilled cheese).*soup/i, 'soup-sandwich'], [/soup/i, 'soup'], [/\bsalad\b/i, 'salad'], [/bravo|dipper|\bblt\b|fiesta chicken|smokehouse/i, 'sub'], [/\bsub\b|6"|footlong|turkey sandwich|baguette/i, 'sub'],
  [/chicken sandwich|mcchicken|^mccrispy$/i, 'chicken-sandwich'], [/gordita|chalupa/i, 'taco-bowl'],
  [/teriyaki/i, 'teriyaki'], [/fried rice/i, 'fried-rice'], [/stir fry/i, 'stir-fry'], [/noodle|gochujang/i, 'noodles'],
  [/mac (&|and) cheese/i, 'mac'], [/pizza/i, 'pizza'], [/pasta|orzo|bisque/i, 'pasta'],
  [/taco/i, 'taco-bowl'], [/burrito/i, 'burrito'], [/greens|salad bowl|sweetgreen|cabbage/i, 'salad'],
  [/bowl|rice/i, 'bowl'], [/grilled chicken|chicken breast|meatball|chicken/i, 'grilled-chicken'], [/salad/i, 'salad'],
]

const PHOTO_ALT = new Set(['breakfast-sandwich', 'burger', 'chicken-sandwich', 'wrap', 'wings', 'sub', 'breakfast-burrito', 'bowl'])

function slug(s: string): string { return s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }

export function mealPhoto(o: MealOption): string {
  if (o.kind === 'cook') {
    const sl = slug(o.name)
    const own = Array.from(RECIPE_PHOTOS).find((p) => sl === p || sl.startsWith(p) || p.startsWith(sl))
    if (own) return `/images/meals/${own}.jpg`
  }
  // The main item decides the photo ("Egg White Grill + parfait" is a
  // sandwich, not a parfait); the full order is the fallback.
  const head = o.name.replace(/^([^,+]+?) \+ ([^,+]*bowl)/i, '$1 & $2').split(/\s\+\s/)[0]
  if (o.place === 'Panda Express') return `/images/meals/food/${/teriyaki/i.test(o.name) ? 'teriyaki' : 'stir-fry'}.jpg`
  const extra = o.place === 'Sweetgreen' ? ' sweetgreen' : ''
  const hit = FOOD_PHOTO.find(([re]) => re.test(head + extra)) || FOOD_PHOTO.find(([re]) => re.test(o.name + extra))
  const base = hit ? hit[1] : 'bowl'
  // A second photo for the foods that come up most, so two sandwiches
  // side by side still look like two different meals. Same meal → same photo.
  const alt = PHOTO_ALT.has(base) && o.key.split("").reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % 2 === 1
  return `/images/meals/food/${base}${alt ? '-2' : ''}.jpg`
}

/** The few words on the photo — the full order still shows after she taps. */
export function shortName(o: MealOption): string {
  if (o.kind === 'cook') return o.name.replace(/\s*\((Regular|Large)\)/i, '')
  // "Chicken Bowl (no rice): black beans, …" → "Chicken Bowl, no rice"
  const head = o.name.match(/^([^:(]+?)\s*(?:\(([^)]*)\))?:/)
  if (head && !/^bowl$/i.test(head[1].trim())) return head[2] ? `${head[1].trim()}, ${head[2]}` : head[1].trim()
  let n = o.name.replace(/\([^)]*\)/g, '').replace(/\s{2,}/g, ' ').trim()
  const bowl = n.match(/^bowl:\s*([^,]+)/i)
  if (bowl) return `${bowl[1].trim()} bowl`.replace(/^(\w)(.*)$/, (_m, a, b) => a + b.toLowerCase())
  if (/^(chicken )?power bowl/i.test(n)) return 'Chicken power bowl'
  n = n.replace(/^([^,+]+?) \+ ([^,+]*bowl)/i, '$1 & $2')   // "Double chicken + steak bowl"
  // A two-part verified combo keeps both parts ("Egg White Grill + Fruit
  // Cup") — the calories on the card are for both, so the name must be too.
  const combo = n.split(/\s\+\s/)
  if (combo.length === 2 && !/,/.test(n) && n.length <= 44) return n
  // Longer two-part combo: keep a short tail ("+ Egg Bites") so it never
  // reads like the single item at a different calorie number.
  const tail = combo.length === 2 ? ` + ${combo[1].length > 20 ? combo[1].split(' ').slice(-2).join(' ') : combo[1]}` : ''
  n = combo[0]
  // Drop the how-to-order bits after a comma ("no mayo", "light rice"), keep
  // real parts of the name ("Avocado, Egg White & Spinach Sandwich").
  const parts = n.split(/,\s*/)
  const MOD = /^(no|light|extra|double|add|half|keep|full|½|with|lettuce|fries|sweet|black|pinto|salsa|cheese|free)\b/i
  n = parts.reduce((acc, part, i) => (i === 0 || (acc.ok && !MOD.test(part)) ? { t: i ? `${acc.t}, ${part}` : part, ok: true } : { t: acc.t, ok: false }), { t: '', ok: true }).t
  return (n.replace(/\s+(no|light|with)\s(?!cheese\b|chicken\b).*$/i, '').trim() || o.name) + tail
}

// ---- helpers ----------------------------------------------------------------

function hash(s: string): number { return s.split('').reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) }
function clamp(n: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, n)) }
function daysBetween(a: string, b: string): number {
  return Math.abs(Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86400000))
}

/** Folds one tap into her memory (keeps the 150 most recent meals). */
export function updateMemory(memory: MealMemory, key: string, signal: 'picked' | 'skipped', todayIso: string): MealMemory {
  const next: MealMemory = { ...memory }
  const cur = { ...(next[key] || {}) }
  if (signal === 'picked') { cur.o = (cur.o || 0) + 1; cur.last = todayIso } else { cur.s = (cur.s || 0) + 1; cur.skip = todayIso }
  delete next[key]
  next[key] = cur
  const keys = Object.keys(next)
  if (keys.length > 150) for (const k of keys.slice(0, keys.length - 150)) delete next[k]
  return next
}

export { ESCAPE_PLAN }
