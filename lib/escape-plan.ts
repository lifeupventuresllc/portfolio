// ============================================================
// Life-Up Fitness — The Escape Plan (5-day fast-food alternative)
// Segmented by weight class. Client picks her class → sees the
// exact fast-food orders (+ mods) that hit her calorie/protein target.
// ============================================================

export interface FastFoodMeal {
  slot: 'Breakfast' | 'Lunch' | 'Snack' | 'Dinner'
  restaurant: string
  order: string
  cal: number; protein: number; carbs: number; fat: number
}
export interface EscapeDay { day: number; total: number; meals: FastFoodMeal[] }
export interface WeightClass {
  id: number; name: string; range: string; minLbs: number; maxLbs: number
  calTarget: string; proteinTarget: number; days: EscapeDay[]
  // A wider pool of real, researched restaurant orders that widens WHICH
  // chain can be matched (pickForRestaurant/pickForNow both search this too)
  // without disturbing the 5-day "full day, for reference" view on
  // /plan/eating-out, which only ever reads `days` — added 2026-08-26 per
  // Asa's ask to cover more real restaurants than the original 5-day set.
  extraOptions: FastFoodMeal[]
}

const m = (slot: FastFoodMeal['slot'], restaurant: string, order: string, cal: number, protein: number, carbs: number, fat: number): FastFoodMeal =>
  ({ slot, restaurant, order, cal, protein, carbs, fat })

const WC1: WeightClass = {
  id: 1, name: 'Weight Class 1', range: '120–150 lbs', minLbs: 0, maxLbs: 150, calTarget: '~1,600 cal', proteinTarget: 135,
  days: [
    { day: 1, total: 1335, meals: [
      m('Breakfast', "McDonald's", '1 Egg McMuffin + Apple Slices', 325, 17, 28, 13),
      m('Lunch', 'Chick-fil-A', 'Grilled Chicken Sandwich + Side Salad + Light Italian Dressing', 460, 37, 30, 18),
      m('Snack', 'Grab & go', 'Quest Protein Bar', 190, 21, 20, 9),
      m('Dinner', 'Subway', '6" Oven Roasted Turkey on Wheat, double meat, 1 provolone, free veggies', 300, 34, 15, 12),
    ] },
    { day: 2, total: 1614, meals: [
      m('Breakfast', "McDonald's", '1 Egg McMuffin + 2 sides of Egg Whites', 344, 24, 28, 15),
      m('Lunch', 'Chipotle', 'Bowl: Chicken, ½ white rice, pinto beans, fajita veggies, mild salsa, cheese', 570, 44, 40, 21),
      m('Snack', 'Grab & go', 'Premier Protein Shake', 160, 30, 4, 3),
      m('Dinner', 'Panda Express', 'Grilled Teriyaki Chicken (1.5 servings – extra chicken) + Super Greens', 540, 66, 22, 23),
    ] },
    { day: 3, total: 1510, meals: [
      m('Breakfast', 'Starbucks', 'Turkey Bacon, Cheddar & Egg White Sandwich + Grande Cold Brew', 250, 17, 28, 7),
      m('Lunch', 'Taco Bell', 'Power Bowl with Chicken (no sour cream), double protein', 550, 47, 42, 18),
      m('Snack', 'Grab & go', 'Fairlife Core Power Shake (26g protein)', 170, 26, 5, 4),
      m('Dinner', 'Burger King', 'Whopper Jr. (no mayo) + Garden Salad (light Italian) + grilled chicken patty', 540, 55, 28, 26),
    ] },
    { day: 4, total: 1600, meals: [
      m('Breakfast', 'Chick-fil-A', 'Egg White Grill + small Fruit Cup', 360, 27, 27, 14),
      m('Lunch', "McDonald's", 'McChicken (no mayo) + Side Salad (light Italian) + 1 grilled chicken patty', 500, 42, 34, 18),
      m('Snack', 'Grab & go', 'Premier Protein Shake', 160, 30, 4, 3),
      m('Dinner', 'Chipotle', 'Bowl: Chicken, ½ brown rice, black beans, fajita veggies, corn salsa, cheese', 580, 52, 38, 23),
    ] },
    { day: 5, total: 1640, meals: [
      m('Breakfast', 'Subway', 'Egg White & Cheese Wrap, extra egg whites, double turkey, no sauce, extra veggies', 360, 30, 27, 13),
      m('Lunch', 'Panda Express', 'Grilled Teriyaki Chicken (1.5 servings) + Super Greens + ½ Brown Rice', 540, 50, 39, 18),
      m('Dinner', 'Taco Bell', 'Power Bowl with Chicken, light rice, no sour cream, extra chicken', 450, 45, 20, 16),
    ] },
  ],
  extraOptions: [
    m('Breakfast', "Dunkin'", 'Turkey Sausage Egg White & Cheese on English Muffin', 280, 20, 23, 12),
    m('Breakfast', 'Panera', 'Avocado, Egg White & Spinach Breakfast Sandwich', 320, 15, 33, 15),
    m('Lunch', 'KFC', '2pc Grilled Chicken Breast (skin off) + Green Beans', 350, 55, 10, 8),
    m('Lunch', 'Jimmy John\'s', 'Turkey Tom Unwich (lettuce wrap, no mayo)', 260, 24, 9, 14),
    m('Lunch', "Jersey Mike's", 'Turkey & Provolone Mini, mustard, extra veggies', 290, 22, 32, 8),
    m('Lunch', 'Culver\'s', 'Grilled Chicken Sandwich, no mayo', 380, 34, 40, 9),
    m('Lunch', 'Sweetgreen', 'Chicken + greens bowl, light dressing, no cheese', 420, 34, 32, 16),
    m('Lunch', 'Qdoba', 'Chicken bowl, ½ rice, black beans, salsa, no cheese', 460, 38, 42, 13),
    m('Snack', 'Firehouse Subs', 'Turkey mini sub, no mayo', 220, 16, 26, 6),
    m('Snack', "Wingstop", '3 Lemon Pepper boneless wings, no ranch', 220, 17, 12, 12),
    m('Dinner', 'Popeyes', '2pc Blackened Chicken Tenders + side salad, light dressing', 330, 42, 10, 12),
    m('Dinner', 'Five Guys', 'Little Hamburger, lettuce wrap, no cheese, light fries shared', 420, 24, 20, 27),
    m('Dinner', "Raising Cane's", '2 chicken fingers + coleslaw, sauce on side', 360, 27, 22, 18),
    m('Dinner', 'Shake Shack', 'ShackBurger single, no cheese, no sauce', 340, 20, 26, 17),
    m('Dinner', 'Domino\'s', '2 thin crust slices, grilled chicken topping', 320, 20, 28, 15),
    m('Dinner', "Arby's", 'Roast Turkey Farmhouse Sandwich, no mayo, half', 300, 22, 32, 9),
    m('Dinner', 'Sonic', 'Grilled Chicken Wrap, no ranch', 360, 22, 30, 17),
  ],
}

const WC2: WeightClass = {
  id: 2, name: 'Weight Class 2', range: '151–190 lbs', minLbs: 151, maxLbs: 190, calTarget: '~2,000 cal', proteinTarget: 170,
  days: [
    { day: 1, total: 2010, meals: [
      m('Breakfast', 'Chick-fil-A', 'Egg White Grill + Greek Yogurt Parfait w/ Granola', 560, 30, 40, 18),
      m('Lunch', 'Chipotle', 'Bowl: Chicken, ½ white rice, pinto beans, fajita veggies, mild salsa, light cheese', 640, 60, 40, 22),
      m('Snack', 'Grab & go', 'Quest Protein Bar', 190, 21, 20, 9),
      m('Dinner', "Wendy's", 'Grilled Chicken Wrap (2 wraps)', 620, 52, 33, 25),
    ] },
    { day: 2, total: 2129, meals: [
      m('Breakfast', "McDonald's", '1 Sausage Egg McMuffin + 2 sides of Egg Whites', 514, 28, 29, 31),
      m('Lunch', 'Chipotle', 'Bowl: Double Chicken, full white rice, pinto beans, fajita veggies, mild salsa, cheese', 800, 62, 45, 30),
      m('Snack', 'Grab & go', 'Quest Protein Bar', 190, 20, 21, 8),
      m('Dinner', 'Panda Express', 'Grilled Teriyaki Chicken (double chicken) + Super Greens', 690, 87, 24, 28),
    ] },
    { day: 3, total: 2060, meals: [
      m('Breakfast', 'Starbucks', 'Double Smoked Bacon, Cheddar & Egg Sandwich + Protein Box', 620, 35, 42, 34),
      m('Lunch', 'Taco Bell', 'Power Bowl, double chicken, no sour cream or cheese', 580, 49, 40, 17),
      m('Snack', 'Grab & go', 'Quest Protein Bar', 190, 21, 20, 9),
      m('Dinner', 'Burger King', 'Grilled Chicken Sandwich + Side Salad with dressing', 670, 60, 32, 28),
    ] },
    { day: 4, total: 2100, meals: [
      m('Breakfast', 'Chick-fil-A', 'Egg White Grill + Greek Yogurt Parfait w/ Granola', 550, 32, 40, 18),
      m('Lunch', "McDonald's", 'Grilled Chicken Sandwich + Side Salad + Extra Grilled Patty + Apple Slices', 690, 50, 35, 20),
      m('Snack', 'Grab & go', 'Quest Bar', 190, 21, 20, 8),
      m('Dinner', 'Chipotle', 'Bowl: Double Chicken, full brown rice, pinto beans, fajita veggies, mild salsa, cheese', 710, 64, 42, 26),
    ] },
    { day: 5, total: 1990, meals: [
      m('Breakfast', 'Subway', 'Egg & Cheese Wrap, double turkey, add avocado & veggies', 460, 35, 30, 20),
      m('Lunch', 'Panda Express', 'Grilled Teriyaki Chicken (2 servings) + full Brown Rice + Super Greens', 606, 65, 45, 21),
      m('Snack', 'Grab & go', 'Quest Bar', 190, 21, 20, 8),
      m('Dinner', 'Taco Bell', 'Power Bowl, double chicken, full rice, no sour cream', 680, 56, 40, 22),
    ] },
  ],
  extraOptions: [
    m('Breakfast', "Dunkin'", 'Turkey Sausage Egg White & Cheese Wrap + Greek Yogurt', 420, 30, 35, 18),
    m('Breakfast', 'Panera', 'Avocado, Egg White & Spinach Sandwich + side of turkey bacon', 460, 28, 40, 20),
    m('Lunch', 'KFC', '3pc Grilled Chicken Breast (skin off) + Green Beans + Corn', 520, 70, 25, 12),
    m('Lunch', "Jimmy John's", 'Turkey Tom Unwich, double turkey, extra veggies', 400, 38, 15, 20),
    m('Lunch', "Jersey Mike's", 'Turkey & Provolone Regular sub, mustard, extra veggies', 490, 34, 45, 14),
    m('Lunch', "Culver's", 'Grilled Chicken Sandwich + side salad, light dressing', 540, 46, 44, 18),
    m('Lunch', 'Sweetgreen', 'Double chicken + greens bowl, sweet potato, light dressing', 610, 52, 45, 22),
    m('Lunch', 'Qdoba', 'Double chicken bowl, full rice, black beans, light cheese', 680, 58, 55, 20),
    m('Snack', 'Firehouse Subs', 'Turkey medium sub half, no mayo', 300, 22, 30, 10),
    m('Snack', 'Wingstop', '4 Lemon Pepper boneless wings, no ranch', 300, 23, 16, 16),
    m('Dinner', 'Popeyes', '3pc Blackened Chicken Tenders + red beans and rice (½)', 560, 62, 30, 20),
    m('Dinner', 'Five Guys', 'Cheeseburger, lettuce wrap, light fries shared', 650, 40, 30, 40),
    m('Dinner', "Raising Cane's", '3 chicken fingers + coleslaw + Texas toast (½)', 600, 42, 40, 28),
    m('Dinner', 'Shake Shack', 'ShackBurger single + fries shared (½)', 560, 26, 48, 30),
    m('Dinner', "Domino's", '3 thin crust slices, grilled chicken topping', 500, 30, 42, 22),
    m('Dinner', "Arby's", 'Roast Turkey Farmhouse Sandwich, no mayo, whole', 590, 42, 55, 18),
    m('Dinner', 'Sonic', 'Grilled Chicken Wrap + side salad, light dressing', 540, 36, 40, 24),
  ],
}

const WC3: WeightClass = {
  id: 3, name: 'Weight Class 3', range: '191–220 lbs', minLbs: 191, maxLbs: 999, calTarget: '~2,400 cal', proteinTarget: 205,
  days: [
    { day: 1, total: 2220, meals: [
      m('Breakfast', "McDonald's", 'Sausage Egg McMuffin + 1 Hash Brown', 780, 56, 45, 30),
      m('Lunch', 'Chipotle', 'Bowl: Steak, full white rice, black beans, corn salsa, cheese, fajita veggies', 790, 56, 45, 30),
      m('Snack', 'Grab & go', 'Fairlife Core Power Shake (26g protein)', 170, 26, 6, 4),
      m('Dinner', 'Taco Bell', 'Power Bowl (Chicken) + Chips & Guac (½ shared)', 650, 48, 40, 28),
    ] },
    { day: 2, total: 2384, meals: [
      m('Breakfast', "McDonald's", 'Sausage McMuffin with Egg + 2 sides Egg Whites + 1 Hash Brown', 654, 30, 34, 42),
      m('Lunch', 'Chipotle', 'Bowl: Double Chicken, full white rice, pinto beans, fajita veggies, corn salsa, cheese', 800, 62, 50, 30),
      m('Snack', 'Grab & go', 'Core Power Elite Shake (42g protein)', 240, 42, 8, 4),
      m('Dinner', 'Panda Express', 'Grilled Teriyaki Chicken (double chicken) + Super Greens', 690, 87, 24, 28),
    ] },
    { day: 3, total: 2340, meals: [
      m('Breakfast', 'Starbucks', 'Double Smoked Bacon, Cheddar & Egg Sandwich + Protein Box + banana', 700, 38, 45, 38),
      m('Lunch', 'Taco Bell', 'Chicken Power Bowl, double chicken, add black beans, no sour cream', 650, 52, 45, 21),
      m('Snack', 'Grab & go', 'Core Power Elite Shake (42g protein)', 240, 42, 6, 4),
      m('Dinner', 'Burger King', 'Grilled Chicken Sandwich + Whopper Jr. (no mayo) + 4-pc nuggets + side salad', 750, 65, 35, 35),
    ] },
    { day: 4, total: 2390, meals: [
      m('Breakfast', 'Chick-fil-A', 'Egg White Grill + Greek Yogurt Parfait w/ Granola + small Hash Browns', 670, 32, 45, 27),
      m('Lunch', "McDonald's", 'Grilled Chicken Sandwich + extra grilled patty + Side Salad + Apple Slices', 720, 56, 40, 25),
      m('Snack', 'Grab & go', 'Core Power Elite (42g protein)', 240, 42, 8, 4),
      m('Dinner', 'Chipotle', 'Bowl: Double Chicken, full brown rice, pinto beans, fajita veggies, corn salsa, cheese', 760, 65, 48, 30),
    ] },
    { day: 5, total: 2270, meals: [
      m('Breakfast', 'Subway', 'Egg & Cheese Wrap, double turkey, add avocado & extra egg whites', 520, 40, 35, 23),
      m('Lunch', 'Panda Express', 'Grilled Teriyaki Chicken (2 servings) + full Brown Rice + Veggie Spring Roll', 750, 65, 45, 25),
      m('Snack', 'Grab & go', 'Core Power Elite Shake (42g protein)', 240, 42, 6, 4),
      m('Dinner', 'Taco Bell', 'Power Bowl, double chicken, keep cheese, light rice, add black beans', 760, 60, 45, 27),
    ] },
  ],
  extraOptions: [
    m('Breakfast', "Dunkin'", 'Turkey Sausage Egg White & Cheese Wrap + Greek Yogurt + banana', 560, 38, 50, 22),
    m('Breakfast', 'Panera', 'Avocado, Egg White & Spinach Sandwich + turkey bacon + fruit cup', 580, 34, 50, 24),
    m('Lunch', 'KFC', '4pc Grilled Chicken Breast (skin off) + Green Beans + Corn', 650, 92, 30, 15),
    m('Lunch', "Jimmy John's", 'Turkey Tom Unwich, double turkey + side of chips shared', 540, 46, 30, 24),
    m('Lunch', "Jersey Mike's", 'Turkey & Provolone Giant sub (½), mustard, extra veggies', 660, 46, 60, 18),
    m('Lunch', "Culver's", 'Double Grilled Chicken Sandwich + side salad, light dressing', 700, 62, 48, 22),
    m('Lunch', 'Sweetgreen', 'Double chicken + steak bowl, sweet potato, light dressing', 760, 64, 50, 28),
    m('Lunch', 'Qdoba', 'Double chicken + steak bowl, full rice, black beans, cheese', 820, 68, 58, 26),
    m('Snack', 'Firehouse Subs', 'Turkey medium sub, no mayo', 460, 32, 46, 14),
    m('Snack', 'Wingstop', '6 Lemon Pepper boneless wings, no ranch', 440, 34, 24, 24),
    m('Dinner', 'Popeyes', '4pc Blackened Chicken Tenders + red beans and rice', 700, 78, 40, 24),
    m('Dinner', 'Five Guys', 'Bacon Cheeseburger, lettuce wrap, fries shared', 780, 48, 35, 48),
    m('Dinner', "Raising Cane's", '4 chicken fingers + coleslaw + Texas toast', 760, 54, 50, 34),
    m('Dinner', 'Shake Shack', 'SmokeShack + fries shared (½)', 720, 34, 52, 42),
    m('Dinner', "Domino's", '4 thin crust slices, grilled chicken topping', 660, 40, 55, 28),
    m('Dinner', "Arby's", 'Roast Turkey Farmhouse Sandwich, whole + side salad', 680, 48, 60, 22),
    m('Dinner', 'Sonic', 'Grilled Chicken Wrap + Jr. side salad, light dressing', 640, 42, 46, 28),
  ],
}

export const ESCAPE_PLAN: WeightClass[] = [WC1, WC2, WC3]

/** Pick the weight class for a bodyweight (lbs). */
export function weightClassFor(lbs: number): WeightClass {
  return ESCAPE_PLAN.find(w => lbs >= w.minLbs && lbs <= w.maxLbs) || WC1
}

// ============================================================
// Phase 4 (Layer 1) — budget-aware "pick one, right now" version of the
// Escape Plan. DoorDash has no public API for reading a user's real order
// history or spending (confirmed 2026-08-07 — their developer platform is
// merchant/logistics-only, and even that requires an approved partnership),
// so this derives a budget comfort level from her own stated weekly food
// budget (already collected at intake) instead of fabricated real-time
// pricing. Tiers are deliberately categorical ($/$$/$$$), never invented
// exact dollar amounts — precise prices vary by location/day and we have
// no live source of truth for them.
// ============================================================

export type PriceTier = '$' | '$$' | '$$$'

const RESTAURANT_BASE_TIER: Record<string, PriceTier> = {
  "McDonald's": '$', 'Taco Bell': '$', 'Subway': '$', 'Grab & go': '$', 'Burger King': '$', "Wendy's": '$',
  'Chick-fil-A': '$$', 'Chipotle': '$$', 'Panda Express': '$$', 'Starbucks': '$$',
}
const TIER_RANK: Record<PriceTier, number> = { '$': 0, '$$': 1, '$$$': 2 }
const bumpUp = (t: PriceTier): PriceTier => (t === '$' ? '$$' : '$$$')

/** Estimated comfort tier, not a real price — see the note above. */
export function priceTierFor(restaurant: string, order: string): PriceTier {
  const base = RESTAURANT_BASE_TIER[restaurant] || '$$'
  const upsized = /double|extra (chicken|patty|meat)|2 servings|2 wraps/i.test(order)
  return upsized ? bumpUp(base) : base
}

/** Her weekly grocery budget (already collected at intake) as a proxy for eating-out
 * comfort level — reused rather than asking a new question, so this costs her nothing. */
export function budgetTierFromWeekly(weeklyBudget: number | null | undefined): PriceTier {
  if (!weeklyBudget || weeklyBudget <= 0) return '$$'
  if (weeklyBudget < 75) return '$'
  if (weeklyBudget <= 150) return '$$'
  return '$$$'
}

/** Exactly 2 distinct options for the CURRENT meal slot, within her budget comfort tier
 * when possible, rotating daily so it's not the same 2 every time she checks.
 * remainingCal (her real calorie target for today minus what she's already logged,
 * see app/plan/eating-out/page.tsx) further narrows to picks that actually fit what
 * she has left — a 15% cushion so a normal meal isn't excluded over a handful of
 * calories. When too few options genuinely fit (she has very little left), falls
 * back to the closest matches rather than silently ignoring calories altogether. */
export function pickForNow(wc: WeightClass, slot: FastFoodMeal['slot'], budgetTier: PriceTier, epochDay: number, remainingCal?: number): FastFoodMeal[] {
  const candidates = wc.days.flatMap((d) => d.meals.filter((m) => m.slot === slot)).concat(wc.extraOptions.filter((m) => m.slot === slot))
  if (candidates.length === 0) return []
  const withinBudget = candidates.filter((m) => TIER_RANK[priceTierFor(m.restaurant, m.order)] <= TIER_RANK[budgetTier])
  let pool = withinBudget.length >= 2 ? withinBudget : candidates
  // >= 0, not > 0 — see pickForRestaurant's comment: remainingCal===0 (she's
  // already at budget) must still bias toward the smallest real option,
  // not skip the whole calorie-fit step and return an arbitrary one.
  if (remainingCal != null && remainingCal >= 0) {
    const fitsCalories = pool.filter((m) => m.cal <= remainingCal * 1.15)
    pool = fitsCalories.length >= 2 ? fitsCalories : [...pool].sort((a, b) => Math.abs(a.cal - remainingCal) - Math.abs(b.cal - remainingCal))
  }
  const start = epochDay % pool.length
  const first = pool[start]
  const second = pool.find((c, i) => i !== start && (c.restaurant !== first.restaurant || c.order !== first.order)) || pool[(start + 1) % pool.length]
  return second ? [first, second] : [first]
}

/** The Next Action engine's restaurant-aware pick (2026-08-26) — Asa's
 * explicit call: no AI-estimated calories driving this decision, real
 * curated data only. Searches this weight class's REAL curated orders
 * (both the 5-day set AND the wider extraOptions pool, 2026-08-26) for ones
 * matching the restaurant she actually named, narrowed to the current meal
 * slot so sizing is automatically realistic (a curated breakfast entry is
 * already a breakfast-appropriate portion — never "use up the whole day's
 * calories in one sitting," which an ungrounded target-calories request
 * could do). Returns up to 2 distinct real orders for that exact restaurant
 * — same "never a bare single pick when a second real one exists" shape as
 * pickForNow, so the /plan/eating-out expansion screen can show her a real
 * choice even when she named a specific place. Empty array (not a guess)
 * when that restaurant isn't in the curated set for this slot — the caller
 * falls back to pickForNow's real-but-generic picks rather than
 * fabricating one. */
// Strips apostrophes/hyphens and collapses whitespace before comparing —
// real bug caught under stress-testing (2026-08-26): voice transcription
// (Deepgram/browser SpeechRecognition, which is what actually feeds this
// restaurant name) almost never renders a possessive apostrophe or a
// hyphen, so "mcdonalds", "wendys", "jimmy johns", and "chick fil a" were
// all silently missing McDonald's/Wendy's/Jimmy John's/Chick-fil-A — 7 of
// the curated restaurants use an apostrophe or hyphen in their stored name
// — and falling back to the generic pick instead of the exact place she
// said, defeating the point of this feature for those chains specifically.
const normalizeRestaurant = (s: string) => s.toLowerCase().replace(/['’]/g, '').replace(/-/g, ' ').replace(/\s+/g, ' ').trim()

export function pickForRestaurant(wc: WeightClass, restaurantName: string, slot: FastFoodMeal['slot'], remainingCal?: number): FastFoodMeal[] {
  const needle = normalizeRestaurant(restaurantName)
  if (!needle) return []
  const candidates = wc.days.flatMap((d) => d.meals).concat(wc.extraOptions)
    .filter((m) => m.slot === slot && (normalizeRestaurant(m.restaurant).includes(needle) || needle.includes(normalizeRestaurant(m.restaurant))))
  if (candidates.length === 0) return []
  // >= 0, not > 0 (real gap caught under stress-testing) — when she's
  // already at (or over) her calorie budget, remainingCal is exactly 0
  // (state.ts clamps it there), and skipping the sort entirely returned
  // whatever happened to be first in the data instead of genuinely
  // steering toward the smallest real option available.
  const ranked = remainingCal != null && remainingCal >= 0
    ? [...candidates].sort((a, b) => Math.abs(a.cal - remainingCal) - Math.abs(b.cal - remainingCal))
    : candidates
  const first = ranked[0]
  const second = ranked.find((c) => c.order !== first.order)
  return second ? [first, second] : [first]
}

/** No API/OAuth needed — DoorDash's public search URL, not order automation. */
export function doordashSearchUrl(restaurant: string): string {
  return `https://www.doordash.com/search/store/${encodeURIComponent(restaurant)}/`
}
