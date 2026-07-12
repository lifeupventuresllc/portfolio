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
}

export const ESCAPE_PLAN: WeightClass[] = [WC1, WC2, WC3]

/** Pick the weight class for a bodyweight (lbs). */
export function weightClassFor(lbs: number): WeightClass {
  return ESCAPE_PLAN.find(w => lbs >= w.minLbs && lbs <= w.maxLbs) || WC1
}
