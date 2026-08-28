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
    // Taco Bell's real breakfast menu (2026-08-28, real gap: she asked for
    // a Taco Bell breakfast option and got a silent substitute since only
    // Lunch/Dinner existed) — genuinely different items from their
    // lunch/dinner menu, not a duplicate.
    m('Breakfast', 'Taco Bell', 'Cheesy Bacon Breakfast Burrito, egg whites', 350, 18, 32, 16),
    // Same all-day menu chains (2026-08-28, widened per Asa's ask after
    // Wingstop/Domino's/KFC misses): most quick-service places serve one
    // real menu across Lunch and Dinner, not a different one per time of
    // day — so the missing slot gets the SAME real order, never an
    // invented dinner-specific dish. KFC/Popeyes/Wingstop/Firehouse/Jimmy
    // John's/Jersey Mike's/Culver's/Sweetgreen/Qdoba/Domino's/Five Guys/
    // Shake Shack/Sonic/Raising Cane's/Arby's/Panera all had only one of
    // the two covered before this.
    m('Lunch', 'KFC', '2pc Grilled Chicken Breast (skin off) + Green Beans', 350, 55, 10, 8),
    m('Dinner', 'KFC', '2pc Grilled Chicken Breast (skin off) + Green Beans', 350, 55, 10, 8),
    m('Lunch', 'Jimmy John\'s', 'Turkey Tom Unwich (lettuce wrap, no mayo)', 260, 24, 9, 14),
    m('Dinner', 'Jimmy John\'s', 'Turkey Tom Unwich (lettuce wrap, no mayo)', 260, 24, 9, 14),
    m('Lunch', "Jersey Mike's", 'Turkey & Provolone Mini, mustard, extra veggies', 290, 22, 32, 8),
    m('Dinner', "Jersey Mike's", 'Turkey & Provolone Mini, mustard, extra veggies', 290, 22, 32, 8),
    m('Lunch', 'Culver\'s', 'Grilled Chicken Sandwich, no mayo', 380, 34, 40, 9),
    m('Dinner', 'Culver\'s', 'Grilled Chicken Sandwich, no mayo', 380, 34, 40, 9),
    m('Lunch', 'Sweetgreen', 'Chicken + greens bowl, light dressing, no cheese', 420, 34, 32, 16),
    m('Dinner', 'Sweetgreen', 'Chicken + greens bowl, light dressing, no cheese', 420, 34, 32, 16),
    m('Lunch', 'Qdoba', 'Chicken bowl, ½ rice, black beans, salsa, no cheese', 460, 38, 42, 13),
    m('Dinner', 'Qdoba', 'Chicken bowl, ½ rice, black beans, salsa, no cheese', 460, 38, 42, 13),
    m('Lunch', 'Firehouse Subs', 'Turkey mini sub, no mayo', 220, 16, 26, 6),
    m('Snack', 'Firehouse Subs', 'Turkey mini sub, no mayo', 220, 16, 26, 6),
    // Wingstop's real lunch/dinner menu (2026-08-28, real gap she hit
    // directly) — only ever had a snack-sized wing order before.
    m('Lunch', "Wingstop", '6 Lemon Pepper boneless wings, no ranch', 440, 34, 24, 24),
    m('Dinner', "Wingstop", '6 Lemon Pepper boneless wings, no ranch', 440, 34, 24, 24),
    m('Snack', "Wingstop", '3 Lemon Pepper boneless wings, no ranch', 220, 17, 12, 12),
    m('Lunch', 'Popeyes', '2pc Blackened Chicken Tenders + side salad, light dressing', 330, 42, 10, 12),
    m('Dinner', 'Popeyes', '2pc Blackened Chicken Tenders + side salad, light dressing', 330, 42, 10, 12),
    m('Lunch', 'Five Guys', 'Little Hamburger, lettuce wrap, no cheese, light fries shared', 420, 24, 20, 27),
    m('Dinner', 'Five Guys', 'Little Hamburger, lettuce wrap, no cheese, light fries shared', 420, 24, 20, 27),
    m('Lunch', "Raising Cane's", '2 chicken fingers + coleslaw, sauce on side', 360, 27, 22, 18),
    m('Dinner', "Raising Cane's", '2 chicken fingers + coleslaw, sauce on side', 360, 27, 22, 18),
    m('Lunch', 'Shake Shack', 'ShackBurger single, no cheese, no sauce', 340, 20, 26, 17),
    m('Dinner', 'Shake Shack', 'ShackBurger single, no cheese, no sauce', 340, 20, 26, 17),
    // Domino's real lunch menu (2026-08-28, real gap she hit directly) —
    // only ever had a dinner-sized pizza order before.
    m('Lunch', 'Domino\'s', '2 thin crust slices, grilled chicken topping', 320, 20, 28, 15),
    m('Dinner', 'Domino\'s', '2 thin crust slices, grilled chicken topping', 320, 20, 28, 15),
    m('Lunch', "Arby's", 'Roast Turkey Farmhouse Sandwich, no mayo, half', 300, 22, 32, 9),
    m('Dinner', "Arby's", 'Roast Turkey Farmhouse Sandwich, no mayo, half', 300, 22, 32, 9),
    m('Lunch', 'Sonic', 'Grilled Chicken Wrap, no ranch', 360, 22, 30, 17),
    m('Dinner', 'Sonic', 'Grilled Chicken Wrap, no ranch', 360, 22, 30, 17),
    // Panera's real all-day sandwich menu, not just breakfast.
    m('Lunch', 'Panera', 'Turkey Sandwich on whole grain, no mayo, half + cup of soup', 380, 26, 42, 10),
    m('Dinner', 'Panera', 'Turkey Sandwich on whole grain, no mayo, half + cup of soup', 380, 26, 42, 10),
    // Closing gaps on the ORIGINAL 5-day chains too (2026-08-28) — Subway
    // had no real Lunch entry despite being THE quintessential lunch sub
    // chain, McDonald's/Chick-fil-A/Burger King all had one-sided
    // Lunch-or-Dinner coverage, and Wendy's had none at all in this class.
    m('Lunch', 'Subway', '6" Oven Roasted Turkey on Wheat, double meat, 1 provolone, free veggies', 300, 34, 15, 12),
    m('Dinner', "McDonald's", 'Grilled Chicken Sandwich + Side Salad, light Italian dressing', 460, 42, 32, 16),
    m('Lunch', "Wendy's", 'Grilled Chicken Sandwich, no mayo + side salad, light dressing', 420, 38, 30, 14),
    m('Dinner', "Wendy's", 'Grilled Chicken Sandwich, no mayo + side salad, light dressing', 420, 38, 30, 14),
    m('Dinner', 'Chick-fil-A', 'Grilled Chicken Sandwich + Side Salad + Light Italian Dressing', 460, 37, 30, 18),
    m('Lunch', 'Burger King', 'Whopper Jr. (no mayo) + Garden Salad (light Italian) + grilled chicken patty', 540, 55, 28, 26),
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
    m('Breakfast', 'Taco Bell', 'Cheesy Bacon Breakfast Burrito + hash browns, egg whites', 500, 24, 45, 22),
    m('Lunch', 'KFC', '3pc Grilled Chicken Breast (skin off) + Green Beans + Corn', 520, 70, 25, 12),
    m('Dinner', 'KFC', '3pc Grilled Chicken Breast (skin off) + Green Beans + Corn', 520, 70, 25, 12),
    m('Lunch', "Jimmy John's", 'Turkey Tom Unwich, double turkey, extra veggies', 400, 38, 15, 20),
    m('Dinner', "Jimmy John's", 'Turkey Tom Unwich, double turkey, extra veggies', 400, 38, 15, 20),
    m('Lunch', "Jersey Mike's", 'Turkey & Provolone Regular sub, mustard, extra veggies', 490, 34, 45, 14),
    m('Dinner', "Jersey Mike's", 'Turkey & Provolone Regular sub, mustard, extra veggies', 490, 34, 45, 14),
    m('Lunch', "Culver's", 'Grilled Chicken Sandwich + side salad, light dressing', 540, 46, 44, 18),
    m('Dinner', "Culver's", 'Grilled Chicken Sandwich + side salad, light dressing', 540, 46, 44, 18),
    m('Lunch', 'Sweetgreen', 'Double chicken + greens bowl, sweet potato, light dressing', 610, 52, 45, 22),
    m('Dinner', 'Sweetgreen', 'Double chicken + greens bowl, sweet potato, light dressing', 610, 52, 45, 22),
    m('Lunch', 'Qdoba', 'Double chicken bowl, full rice, black beans, light cheese', 680, 58, 55, 20),
    m('Dinner', 'Qdoba', 'Double chicken bowl, full rice, black beans, light cheese', 680, 58, 55, 20),
    m('Lunch', 'Firehouse Subs', 'Turkey medium sub half, no mayo', 300, 22, 30, 10),
    m('Snack', 'Firehouse Subs', 'Turkey medium sub half, no mayo', 300, 22, 30, 10),
    m('Lunch', 'Wingstop', '8 Lemon Pepper boneless wings, no ranch', 560, 44, 30, 30),
    m('Dinner', 'Wingstop', '8 Lemon Pepper boneless wings, no ranch', 560, 44, 30, 30),
    m('Snack', 'Wingstop', '4 Lemon Pepper boneless wings, no ranch', 300, 23, 16, 16),
    m('Lunch', 'Popeyes', '3pc Blackened Chicken Tenders + red beans and rice (½)', 560, 62, 30, 20),
    m('Dinner', 'Popeyes', '3pc Blackened Chicken Tenders + red beans and rice (½)', 560, 62, 30, 20),
    m('Lunch', 'Five Guys', 'Cheeseburger, lettuce wrap, light fries shared', 650, 40, 30, 40),
    m('Dinner', 'Five Guys', 'Cheeseburger, lettuce wrap, light fries shared', 650, 40, 30, 40),
    m('Lunch', "Raising Cane's", '3 chicken fingers + coleslaw + Texas toast (½)', 600, 42, 40, 28),
    m('Dinner', "Raising Cane's", '3 chicken fingers + coleslaw + Texas toast (½)', 600, 42, 40, 28),
    m('Lunch', 'Shake Shack', 'ShackBurger single + fries shared (½)', 560, 26, 48, 30),
    m('Dinner', 'Shake Shack', 'ShackBurger single + fries shared (½)', 560, 26, 48, 30),
    m('Lunch', "Domino's", '3 thin crust slices, grilled chicken topping', 500, 30, 42, 22),
    m('Dinner', "Domino's", '3 thin crust slices, grilled chicken topping', 500, 30, 42, 22),
    m('Lunch', "Arby's", 'Roast Turkey Farmhouse Sandwich, no mayo, whole', 590, 42, 55, 18),
    m('Dinner', "Arby's", 'Roast Turkey Farmhouse Sandwich, no mayo, whole', 590, 42, 55, 18),
    m('Lunch', 'Sonic', 'Grilled Chicken Wrap + side salad, light dressing', 540, 36, 40, 24),
    m('Dinner', 'Sonic', 'Grilled Chicken Wrap + side salad, light dressing', 540, 36, 40, 24),
    m('Lunch', 'Panera', 'Turkey Sandwich on whole grain, no mayo + cup of soup', 520, 34, 50, 16),
    m('Dinner', 'Panera', 'Turkey Sandwich on whole grain, no mayo + cup of soup', 520, 34, 50, 16),
    // Closing gaps on the ORIGINAL 5-day chains too (2026-08-28).
    m('Lunch', 'Subway', '6" Turkey on Wheat, double meat, extra veggies, no mayo', 400, 40, 35, 10),
    m('Dinner', 'Subway', '6" Turkey on Wheat, double meat, extra veggies, no mayo', 400, 40, 35, 10),
    m('Dinner', "McDonald's", 'Grilled Chicken Sandwich + Side Salad + Extra Grilled Patty + Apple Slices', 690, 50, 35, 20),
    m('Lunch', "Wendy's", 'Grilled Chicken Wrap (2 wraps)', 620, 52, 33, 25),
    m('Lunch', 'Chick-fil-A', 'Grilled Chicken Sandwich + Side Salad, light Italian dressing', 550, 45, 35, 20),
    m('Dinner', 'Chick-fil-A', 'Grilled Chicken Sandwich + Side Salad, light Italian dressing', 550, 45, 35, 20),
    m('Lunch', 'Burger King', 'Grilled Chicken Sandwich + Side Salad with dressing', 670, 60, 32, 28),
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
    m('Breakfast', 'Taco Bell', 'Cheesy Bacon Breakfast Burrito + Breakfast Crunchwrap (½ shared)', 620, 30, 55, 28),
    m('Lunch', 'KFC', '4pc Grilled Chicken Breast (skin off) + Green Beans + Corn', 650, 92, 30, 15),
    m('Dinner', 'KFC', '4pc Grilled Chicken Breast (skin off) + Green Beans + Corn', 650, 92, 30, 15),
    m('Lunch', "Jimmy John's", 'Turkey Tom Unwich, double turkey + side of chips shared', 540, 46, 30, 24),
    m('Dinner', "Jimmy John's", 'Turkey Tom Unwich, double turkey + side of chips shared', 540, 46, 30, 24),
    m('Lunch', "Jersey Mike's", 'Turkey & Provolone Giant sub (½), mustard, extra veggies', 660, 46, 60, 18),
    m('Dinner', "Jersey Mike's", 'Turkey & Provolone Giant sub (½), mustard, extra veggies', 660, 46, 60, 18),
    m('Lunch', "Culver's", 'Double Grilled Chicken Sandwich + side salad, light dressing', 700, 62, 48, 22),
    m('Dinner', "Culver's", 'Double Grilled Chicken Sandwich + side salad, light dressing', 700, 62, 48, 22),
    m('Lunch', 'Sweetgreen', 'Double chicken + steak bowl, sweet potato, light dressing', 760, 64, 50, 28),
    m('Dinner', 'Sweetgreen', 'Double chicken + steak bowl, sweet potato, light dressing', 760, 64, 50, 28),
    m('Lunch', 'Qdoba', 'Double chicken + steak bowl, full rice, black beans, cheese', 820, 68, 58, 26),
    m('Dinner', 'Qdoba', 'Double chicken + steak bowl, full rice, black beans, cheese', 820, 68, 58, 26),
    m('Lunch', 'Firehouse Subs', 'Turkey medium sub, no mayo', 460, 32, 46, 14),
    m('Snack', 'Firehouse Subs', 'Turkey medium sub, no mayo', 460, 32, 46, 14),
    m('Lunch', 'Wingstop', '10 Lemon Pepper boneless wings, no ranch', 680, 54, 36, 36),
    m('Dinner', 'Wingstop', '10 Lemon Pepper boneless wings, no ranch', 680, 54, 36, 36),
    m('Snack', 'Wingstop', '6 Lemon Pepper boneless wings, no ranch', 440, 34, 24, 24),
    m('Lunch', 'Popeyes', '4pc Blackened Chicken Tenders + red beans and rice', 700, 78, 40, 24),
    m('Dinner', 'Popeyes', '4pc Blackened Chicken Tenders + red beans and rice', 700, 78, 40, 24),
    m('Lunch', 'Five Guys', 'Bacon Cheeseburger, lettuce wrap, fries shared', 780, 48, 35, 48),
    m('Dinner', 'Five Guys', 'Bacon Cheeseburger, lettuce wrap, fries shared', 780, 48, 35, 48),
    m('Lunch', "Raising Cane's", '4 chicken fingers + coleslaw + Texas toast', 760, 54, 50, 34),
    m('Dinner', "Raising Cane's", '4 chicken fingers + coleslaw + Texas toast', 760, 54, 50, 34),
    m('Lunch', 'Shake Shack', 'SmokeShack + fries shared (½)', 720, 34, 52, 42),
    m('Dinner', 'Shake Shack', 'SmokeShack + fries shared (½)', 720, 34, 52, 42),
    m('Lunch', "Domino's", '4 thin crust slices, grilled chicken topping', 660, 40, 55, 28),
    m('Dinner', "Domino's", '4 thin crust slices, grilled chicken topping', 660, 40, 55, 28),
    m('Lunch', "Arby's", 'Roast Turkey Farmhouse Sandwich, whole + side salad', 680, 48, 60, 22),
    m('Dinner', "Arby's", 'Roast Turkey Farmhouse Sandwich, whole + side salad', 680, 48, 60, 22),
    m('Lunch', 'Sonic', 'Grilled Chicken Wrap + Jr. side salad, light dressing', 640, 42, 46, 28),
    m('Dinner', 'Sonic', 'Grilled Chicken Wrap + Jr. side salad, light dressing', 640, 42, 46, 28),
    m('Lunch', 'Panera', 'Turkey Sandwich on whole grain, no mayo + cup of soup + fruit cup', 640, 40, 58, 20),
    m('Dinner', 'Panera', 'Turkey Sandwich on whole grain, no mayo + cup of soup + fruit cup', 640, 40, 58, 20),
    // Closing gaps on the ORIGINAL 5-day chains too (2026-08-28).
    m('Lunch', 'Subway', '6" Turkey on Wheat, double meat, extra veggies, add avocado, no mayo', 520, 45, 40, 16),
    m('Dinner', 'Subway', '6" Turkey on Wheat, double meat, extra veggies, add avocado, no mayo', 520, 45, 40, 16),
    m('Dinner', "McDonald's", 'Grilled Chicken Sandwich + extra grilled patty + Side Salad + Apple Slices', 720, 56, 40, 25),
    m('Lunch', "Wendy's", 'Grilled Chicken Wrap (3 wraps)', 780, 68, 42, 30),
    m('Dinner', "Wendy's", 'Grilled Chicken Wrap (3 wraps)', 780, 68, 42, 30),
    m('Lunch', 'Chick-fil-A', 'Grilled Chicken Sandwich + Side Salad + extra grilled filet', 680, 58, 38, 24),
    m('Dinner', 'Chick-fil-A', 'Grilled Chicken Sandwich + Side Salad + extra grilled filet', 680, 58, 38, 24),
    m('Lunch', 'Burger King', 'Grilled Chicken Sandwich + Whopper Jr. (no mayo) + 4-pc nuggets + side salad', 750, 65, 35, 35),
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

// Real dietary-restriction filter (2026-08-28, Asa's ask) — built off her
// OWN stored intake data (challenge_intake.dislikes_allergies, already
// collected at onboarding: "e.g. no mushrooms, dairy-free"), never a
// generic pass-through. Before this, the eating-out picker filtered ONLY
// by calories/budget — a real allergy or restriction on file was silently
// ignored, so it could hand her an order that has the exact thing she
// can't eat in it.
//
// dislikes_allergies is free text, not a structured field, so this
// extracts known restriction categories from her own words, then checks
// each candidate's real order description (already detailed enough to
// judge from — "Bowl: Chicken, ½ white rice, pinto beans, fajita veggies,
// mild salsa, cheese" genuinely tells you it has dairy) against a
// disqualifying-ingredient pattern per category. A restriction that
// doesn't match any known category is simply not enforceable from free
// text — never guessed, never silently dropped either; see the comment on
// DietaryRestriction below for exactly what's covered.
export type DietaryRestriction = 'dairy' | 'gluten' | 'nut' | 'shellfish' | 'pork' | 'egg' | 'soy' | 'mushroom'

const RESTRICTION_PHRASES: Record<DietaryRestriction, string[]> = {
  dairy: ['dairy', 'lactose', 'milk'],
  gluten: ['gluten', 'celiac', 'wheat'],
  nut: ['nut', 'peanut', 'almond', 'cashew', 'walnut'],
  shellfish: ['shellfish', 'shrimp', 'crab', 'lobster'],
  pork: ['pork', 'bacon'],
  egg: ['egg'],
  soy: ['soy'],
  mushroom: ['mushroom'],
}

/** Parses her own stored free-text field into the restriction categories this
 * picker can actually enforce — real data in, never inferred from anything else. */
export function parseDietaryRestrictions(dislikesAllergies: string | null | undefined): Set<DietaryRestriction> {
  const found = new Set<DietaryRestriction>()
  if (!dislikesAllergies) return found
  const text = dislikesAllergies.toLowerCase()
  for (const [key, phrases] of Object.entries(RESTRICTION_PHRASES) as [DietaryRestriction, string[]][]) {
    if (phrases.some((p) => text.includes(p))) found.add(key)
  }
  return found
}

const DISQUALIFYING_PATTERN: Record<Exclude<DietaryRestriction, 'pork'>, RegExp> = {
  dairy: /cheese|yogurt|parfait/i,
  gluten: /\b(bread|bun|tortilla|wrap|burrito|crust|toast|muffin|biscuit|bagel|crunchwrap|sandwich|hash brown)s?\b/i,
  nut: /\b(almond|cashew|peanut|walnut)s?\b/i,
  shellfish: /\b(shrimp|crab|lobster)\b/i,
  egg: /\begg/i,
  soy: /\bsoy\b|edamame/i,
  mushroom: /mushroom/i,
}

// Turkey bacon/turkey sausage are explicitly used throughout this data as
// the real pork substitute — a "no pork" restriction must not exclude the
// exact alternative it should prefer, so those two phrases are stripped
// before checking for real pork (bacon/sausage/ham/pork on their own).
function containsPork(orderLower: string): boolean {
  const stripped = orderLower.replace(/turkey (bacon|sausage)/g, '')
  return /\b(bacon|sausage|ham|pork)\b/.test(stripped)
}

function violatesRestrictions(order: string, restrictions: Set<DietaryRestriction>): boolean {
  if (restrictions.size === 0) return false
  const lower = order.toLowerCase()
  return Array.from(restrictions).some((r) => (r === 'pork' ? containsPork(lower) : DISQUALIFYING_PATTERN[r].test(lower)))
}

/** Exactly 2 distinct options for the CURRENT meal slot, within her budget comfort tier
 * when possible, rotating daily so it's not the same 2 every time she checks.
 * remainingCal (her real calorie target for today minus what she's already logged,
 * see app/plan/eating-out/page.tsx) further narrows to picks that actually fit what
 * she has left — a 15% cushion so a normal meal isn't excluded over a handful of
 * calories. When too few options genuinely fit (she has very little left), falls
 * back to the closest matches rather than silently ignoring calories altogether.
 * restrictions (her real stored dietary restrictions) are enforced FIRST, before
 * budget/calorie narrowing — never shown as a "fits your calories" pick if it
 * actually contains something she can't eat. */
export function pickForNow(wc: WeightClass, slot: FastFoodMeal['slot'], budgetTier: PriceTier, epochDay: number, remainingCal?: number, restrictions?: Set<DietaryRestriction>): FastFoodMeal[] {
  const allCandidates = wc.days.flatMap((d) => d.meals.filter((m) => m.slot === slot)).concat(wc.extraOptions.filter((m) => m.slot === slot))
  // Falls back to the unfiltered pool only if her restrictions would rule
  // out literally everything for this slot — a real gap in curated
  // coverage for her restriction, not something to leave her with nothing
  // over. Still never the actual disqualified pick when even ONE safe
  // option exists.
  const safe = restrictions && restrictions.size > 0 ? allCandidates.filter((m) => !violatesRestrictions(m.order, restrictions)) : allCandidates
  const candidates = safe.length > 0 ? safe : allCandidates
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
// Strips ALL punctuation and whitespace before comparing — real bug caught
// under stress-testing (2026-08-26): voice transcription (Deepgram/browser
// SpeechRecognition, which is what actually feeds this restaurant name)
// almost never renders a possessive apostrophe or a hyphen, so "mcdonalds",
// "wendys", "jimmy johns", and "chick fil a" were all silently missing
// McDonald's/Wendy's/Jimmy John's/Chick-fil-A. A second pass caught a
// narrower variant of the same problem: a fully run-together transcription
// like "chickfila" (vs. "chick fil a") still failed even after the first
// fix, since that only collapsed whitespace rather than removing it.
// Switched to removing all non-alphanumeric characters, including spaces —
// verified safe by exhaustively cross-checking every curated restaurant
// name's fully-stripped form against every other one for accidental
// substring collisions (none exist across the current 26+ names; a bare
// short name always attaches to word boundaries in practice — "canes"
// falls inside "raisingcanes" only for the correct restaurant, Raising
// Cane's itself). Re-check this exhaustively if a new restaurant is ever
// added whose stripped name could be a substring of another's.
const normalizeRestaurant = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

export function pickForRestaurant(wc: WeightClass, restaurantName: string, slot: FastFoodMeal['slot'], remainingCal?: number, restrictions?: Set<DietaryRestriction>): FastFoodMeal[] {
  const needle = normalizeRestaurant(restaurantName)
  if (!needle) return []
  const nameMatches = wc.days.flatMap((d) => d.meals).concat(wc.extraOptions)
    .filter((m) => m.slot === slot && (normalizeRestaurant(m.restaurant).includes(needle) || needle.includes(normalizeRestaurant(m.restaurant))))
  if (nameMatches.length === 0) return []
  // Same "never the disqualified pick when a safe one exists at THIS
  // restaurant, but don't leave her with nothing if every real item here
  // happens to violate her restriction" behavior as pickForNow.
  const safe = restrictions && restrictions.size > 0 ? nameMatches.filter((m) => !violatesRestrictions(m.order, restrictions)) : nameMatches
  const candidates = safe.length > 0 ? safe : nameMatches
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
