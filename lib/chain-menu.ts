import type { FastFoodMeal } from '@/lib/escape-plan'

// ============================================================
// Verified chain menu (2026-10-21, Asa: "the vital blocker is accurate meal
// data"). Every number here was read off the chain's OWN website on the date
// below — not typed from memory, not a third-party copy:
//   Sweetgreen  — sweetgreen.com/menu (calories + protein/carbs/fat per item)
//   Chick-fil-A — chick-fil-a.com/menu/<item> (nutrition panel per item)
//   Taco Bell   — tacobell.com/food/<item>, whose nutrition label it links
//                 (Taco Bell's own Nutritionix-hosted label)
//   Chipotle    — chipotle.com/nutrition-calculator (per-ingredient numbers)
//   McDonald's  — mcdonalds.com product pages (their nutrition feed)
//   Starbucks   — starbucks.com/menu (their menu nutrition feed)
// Combos ("+ Fruit Cup") are the sum of the official items, nothing added.
// Exact menu names, so she can order it word for word. Weight-class free:
// lib/meal-pick only ever shows a meal that fits HER calories left.
// Re-check when a chain changes its menu (CHECKED_ON).
// ============================================================

export const CHECKED_ON = '2026-10-21'

export interface ChainItem extends FastFoodMeal { source: string }

type Slot = FastFoodMeal['slot']
const item = (slots: Slot[], restaurant: string, order: string, cal: number, protein: number, carbs: number, fat: number, source: string): ChainItem[] =>
  slots.map((slot) => ({ slot, restaurant, order, cal, protein, carbs, fat, source }))

const LD: Slot[] = ['Lunch', 'Dinner']
const SG = 'https://www.sweetgreen.com/menu'
const CFA = (slug: string) => `https://www.chick-fil-a.com/menu/${slug}`
const TB = (path: string) => `https://www.tacobell.com/food/${path}`
const CMG = 'https://www.chipotle.com/nutrition-calculator/burrito-bowl'
const MCD = (slug: string) => `https://www.mcdonalds.com/us/en-us/product/${slug}.html`
const SBUX = 'https://www.starbucks.com/menu'

export const CHAIN_MENU: ChainItem[] = [
  // ---- Sweetgreen (bowls and plates, as listed) ----
  ...item(LD, 'Sweetgreen', 'Kale Caesar', 545, 41, 18, 35, SG),
  ...item(LD, 'Sweetgreen', 'Chicken Pesto Parm', 525, 35, 38, 23, SG),
  ...item(LD, 'Sweetgreen', 'Buffalo Chicken', 555, 31, 32, 34, SG),
  ...item(LD, 'Sweetgreen', 'Guacamole Greens', 555, 29, 35, 32, SG),
  ...item(LD, 'Sweetgreen', 'Chicken Sesame Crunch', 615, 35, 54, 29, SG),
  ...item(LD, 'Sweetgreen', 'Steak Honey Crunch', 625, 33, 48, 33, SG),
  ...item(LD, 'Sweetgreen', 'Crispy Rice Bowl', 640, 28, 61, 30, SG),
  ...item(LD, 'Sweetgreen', "Molly's Pickle Caesar Sal", 665, 33, 36, 45, SG),
  ...item(LD, 'Sweetgreen', 'Harvest Bowl', 740, 32, 60, 41, SG),
  ...item(LD, 'Sweetgreen', 'Omega Glow', 750, 32, 52, 45, SG),
  ...item(LD, 'Sweetgreen', 'Chicken Avocado Ranch', 765, 29, 59, 44, SG),
  ...item(LD, 'Sweetgreen', 'Caramelized Garlic Steak', 770, 34, 82, 31, SG),
  ...item(LD, 'Sweetgreen', 'Steak Mezze', 835, 36, 84, 42, SG),
  ...item(LD, 'Sweetgreen', 'Hot Honey Chicken', 875, 49, 68, 41, SG),
  ...item(LD, 'Sweetgreen', 'Little Harvest', 410, 18, 23, 27, SG),
  ...item(['Lunch', 'Snack'], 'Sweetgreen', 'Mini Mezze', 295, 30, 26, 8, SG),
  ...item(['Lunch', 'Snack'], 'Sweetgreen', "Molly's Double Chick Scoop", 385, 34, 3, 26, SG),

  // ---- Chick-fil-A ----
  ...item(['Breakfast'], 'Chick-fil-A', 'Egg White Grill', 300, 27, 29, 8, CFA('egg-white-grill')),
  ...item(['Breakfast'], 'Chick-fil-A', 'Egg White Grill + Fruit Cup', 370, 28, 45, 8, CFA('egg-white-grill')),
  ...item(['Snack'], 'Chick-fil-A', 'Grilled Nuggets (8 ct)', 130, 25, 1, 3, CFA('grilled-nuggets')),
  ...item(['Snack', 'Lunch'], 'Chick-fil-A', 'Grilled Nuggets (8 ct) + Fruit Cup', 200, 26, 17, 3, CFA('grilled-nuggets')),
  ...item(LD, 'Chick-fil-A', 'Grilled Nuggets (8 ct) + Kale Crunch Side', 300, 29, 14, 15, CFA('kale-crunch-side')),
  ...item(LD, 'Chick-fil-A', 'Grilled Chicken Sandwich', 390, 28, 45, 11, CFA('grilled-chicken-sandwich')),
  ...item(LD, 'Chick-fil-A', 'Grilled Chicken Sandwich + Fruit Cup', 460, 29, 61, 11, CFA('grilled-chicken-sandwich')),
  ...item(LD, 'Chick-fil-A', 'Grilled Chicken Sandwich + Grilled Nuggets (8 ct)', 520, 53, 46, 14, CFA('grilled-chicken-sandwich')),
  ...item(LD, 'Chick-fil-A', 'Chicken Tortilla Soup', 350, 25, 39, 11, CFA('chicken-tortilla-soup')),
  ...item(LD, 'Chick-fil-A', 'Chick-fil-A Nuggets (8 ct) + Fruit Cup', 320, 28, 27, 11, CFA('chick-fil-a-nuggets')),
  ...item(LD, 'Chick-fil-A', 'Chick-fil-A Chicken Sandwich', 420, 29, 41, 16, CFA('chick-fil-a-chicken-sandwich')),
  ...item(LD, 'Chick-fil-A', 'Spicy Chicken Sandwich', 450, 28, 44, 18, CFA('spicy-chicken-sandwich')),

  // ---- Taco Bell ----
  ...item(['Breakfast'], 'Taco Bell', 'Grande Toasted Breakfast Burrito - Steak', 563, 26, 53, 27, TB('breakfast/grande-toasted-breakfast-burrito-steak')),
  ...item(['Breakfast'], 'Taco Bell', 'Cheesy Toasted Breakfast Burrito - Sausage', 349, 10, 38, 17, TB('breakfast/cheesy-toasted-breakfast-burrito')),
  ...item(LD, 'Taco Bell', 'Cantina Chicken Bowl', 628, 26, 56, 34, TB('cantina-chicken/cantina-chicken-bowl')),
  ...item(LD, 'Taco Bell', 'Crunchwrap Supreme', 535, 15, 74, 20, TB('specialties/crunchwrap-supreme')),
  ...item(LD, 'Taco Bell', 'Mexican Pizza', 527, 19, 51, 27, TB('specialties/mexican-pizza')),
  ...item(LD, 'Taco Bell', 'Cheesy Gordita Crunch', 484, 20, 44, 26, TB('specialties/cheesy-gordita-crunch')),
  ...item(LD, 'Taco Bell', 'Bean Burrito', 360, 13, 54, 10, TB('burritos/bean-burrito')),

  // ---- Chipotle (each bowl = the sum of Chipotle's official per-ingredient
  // numbers, standard servings: chicken 180/32p, steak 150/21p, barbacoa
  // 170/24p, white or brown rice 210, black or pinto beans 130, fajita veggies
  // 20, mild salsa 25, green salsa 15, cheese 110, romaine 5) ----
  ...item(LD, 'Chipotle', 'Chicken Bowl: white rice, black beans, fajita veggies, fresh tomato salsa, cheese', 675, 51, 72, 21, CMG),
  ...item(LD, 'Chipotle', 'Chicken Bowl (no rice): black beans, fajita veggies, fresh tomato salsa, cheese, romaine', 470, 47, 33, 17, CMG),
  ...item(LD, 'Chipotle', 'Chicken Bowl (brown rice, no cheese): black beans, fajita veggies, fresh tomato salsa', 565, 45, 67, 15, CMG),
  ...item(LD, 'Chipotle', 'Double Chicken Bowl (no rice): black beans, fajita veggies, fresh tomato salsa, romaine', 540, 73, 32, 16, CMG),
  ...item(LD, 'Chipotle', 'Steak Bowl: white rice, pinto beans, fajita veggies, fresh tomato salsa, cheese', 645, 40, 72, 20, CMG),
  ...item(LD, 'Chipotle', 'Barbacoa Bowl: brown rice, black beans, tomatillo-green chili salsa, romaine', 530, 36, 65, 15, CMG),

  // ---- McDonald's ----
  ...item(['Breakfast'], "McDonald's", 'Egg McMuffin', 310, 17, 30, 13, MCD('egg-mcmuffin')),
  ...item(['Breakfast'], "McDonald's", 'Egg McMuffin + Apple Slices', 325, 17, 34, 13, MCD('egg-mcmuffin')),
  ...item(['Breakfast'], "McDonald's", 'Sausage Burrito', 310, 13, 25, 17, MCD('sausage-burrito')),
  ...item(['Breakfast'], "McDonald's", 'Fruit & Maple Oatmeal', 320, 6, 64, 5, MCD('fruit-maple-oatmeal')),
  ...item(LD, "McDonald's", 'McCrispy Strips (3 piece)', 400, 31, 24, 20, MCD('mccrispy-strips-3-piece')),
  ...item(LD, "McDonald's", 'Quarter Pounder with Cheese', 520, 30, 42, 26, MCD('quarter-pounder-with-cheese')),
  ...item(LD, "McDonald's", 'McDouble + Apple Slices', 405, 22, 36, 20, MCD('mcdouble')),
  ...item(LD, "McDonald's", 'Chicken McNuggets (6 piece) + Apple Slices', 265, 14, 19, 15, MCD('chicken-mcnuggets-6-piece')),
  ...item(LD, "McDonald's", 'McCrispy', 470, 26, 46, 20, MCD('mccrispy-chicken-sandwich')),
  ...item(['Lunch', 'Snack'], "McDonald's", 'Hamburger', 250, 12, 30, 9, MCD('hamburger')),

  // ---- Starbucks ----
  ...item(['Breakfast'], 'Starbucks', 'Turkey Bacon, Cheddar & Egg White Sandwich', 260, 17, 30, 9, SBUX),
  ...item(['Breakfast'], 'Starbucks', 'Spinach, Feta & Egg White Wrap', 290, 20, 34, 8, SBUX),
  ...item(['Breakfast'], 'Starbucks', 'Spinach, Feta & Egg White Wrap + Egg White & Roasted Red Pepper Egg Bites', 460, 32, 45, 16, SBUX),
  ...item(['Breakfast'], 'Starbucks', 'Egg, Pesto & Mozzarella Sandwich', 390, 21, 36, 16, SBUX),
  ...item(['Breakfast'], 'Starbucks', 'Bacon, Gouda & Egg Sandwich', 360, 18, 35, 18, SBUX),
  ...item(['Breakfast', 'Snack'], 'Starbucks', 'Bacon & Gruyère Egg Bites', 300, 19, 9, 20, SBUX),
  ...item(['Breakfast', 'Snack'], 'Starbucks', 'Egg White & Roasted Red Pepper Egg Bites', 170, 12, 11, 8, SBUX),
  ...item(['Breakfast', 'Lunch', 'Snack'], 'Starbucks', 'Chicken Bacon Protein Pocket', 310, 20, 29, 13, SBUX),
  ...item(['Lunch'], 'Starbucks', 'Ham & Swiss on Baguette', 510, 25, 43, 25, SBUX),
  ...item(['Lunch'], 'Starbucks', 'Apples & Cheese Trio Protein Box', 470, 22, 36, 27, SBUX),
]

/** Chains in the verified list — same honest-data rule as lib/escape-plan's
 * knownRestaurants(): never suggest a place we'd have to invent numbers for. */
export function verifiedChains(): Set<string> {
  return new Set(CHAIN_MENU.map((m) => m.restaurant))
}
