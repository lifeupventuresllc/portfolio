// ============================================================
// Life-Up Fitness — Recipe database (The Menu cookbook + budget meals)
// Per-serving macros. Powers the calories-as-money meal-plan builder.
// (snacks: cookbook lists cal+protein only → carbs/fat 0)
// ============================================================

export type MealCategory = 'breakfast' | 'main' | 'snack' | 'dessert'

export interface Recipe {
  name: string
  category: MealCategory
  cal: number
  protein: number
  carbs: number
  fat: number
  budget?: boolean
  servings?: string
}

const r = (name: string, category: MealCategory, cal: number, protein: number, carbs: number, fat: number, extra: Partial<Recipe> = {}): Recipe =>
  ({ name, category, cal, protein, carbs, fat, ...extra })

export const RECIPES: Recipe[] = [
  // ---------- BREAKFAST ----------
  r('Chicken Nugget Hash Brown Bake', 'breakfast', 354, 46, 23, 7),
  r('Beef & Egg Breakfast Power Bowl', 'breakfast', 552, 51, 40, 20),
  r('Steak, Egg & Cheese Breakfast Bagels', 'breakfast', 495, 71, 36, 21),
  r('Turkey Sausage Sweet Potato Hash', 'breakfast', 475, 39, 43, 10),
  r('Protein Overnight Oats', 'breakfast', 540, 34, 58, 20),

  // ---------- MAINS (lunch / dinner) ----------
  r('BBQ Chicken Pizza', 'main', 280, 32, 22, 10),
  r('Chicken Pineapple Fried Rice', 'main', 613, 66, 56, 12),
  r('Chicken Teriyaki Rice Bowl', 'main', 380, 36, 42, 5),
  r("Chicken & Fries with Cane's Sauce", 'main', 603, 57, 47, 18),
  r('Macro Friendly Big Mac', 'main', 539, 56, 44, 12),
  r('BBQ Beef Burritos', 'main', 270, 32, 43, 7),
  r('Ground Turkey Taco Bowl', 'main', 400, 34, 40, 9),
  r('Dump-and-Bake Taco Bowls', 'main', 501, 41, 34, 19),
  r('Honey Chili Chicken & Cauliflower Rice', 'main', 649, 61, 32, 30),
  r('High-Protein Pizza Pasta Bake', 'main', 487, 52, 12, 18),
  r('Creamy Lemon Chicken Orzo', 'main', 540, 43, 44, 21),
  r('Steak & Onion Stir Fry', 'main', 372, 45, 8, 18),
  r('Protein Mac & Cheese Bake', 'main', 480, 45, 35, 15),
  r('Fully Loaded Fried Cabbage', 'main', 320, 33, 15, 10),
  // budget mains
  r('Buffalo Chicken Bowls with Cauliflower Garlic Rice', 'main', 480, 42, 38, 14, { budget: true }),
  r('Creamy Lobster Bisque Pasta', 'main', 690, 35, 86, 13, { budget: true }),
  r('Creamy Gochujang Noodles with Sesame Beef', 'main', 500, 40, 69, 8, { budget: true }),
  r('Marry Me Chicken Pasta', 'main', 660, 55, 60, 25, { budget: true }),
  r('Chicken Bacon Ranch Pasta Salad', 'main', 570, 45, 42, 24, { budget: true }),
  r('Garlic Butter Chicken Meatballs with Cauliflower Rice', 'main', 380, 32, 24, 9, { budget: true }),
  r('Marry Me Shrimp Pasta', 'main', 580, 33, 47, 26, { budget: true }),
  r('Crispy Honey-Garlic Chicken with Rice', 'main', 420, 26, 52, 12, { budget: true }),

  // ---------- SNACKS (add-ons; cal + protein only in source) ----------
  r('Yoplait Protein + Mixed Berries', 'snack', 175, 16, 0, 0),
  r('Banana + Nut Butter (Regular)', 'snack', 200, 5, 0, 0),
  r('Banana + Nut Butter (Large)', 'snack', 290, 9, 0, 0),
  r('Rice Cakes + PB (Regular)', 'snack', 165, 6, 0, 0),
  r('Rice Cakes + PB (Large)', 'snack', 210, 7, 0, 0),
  r('Pepperoni Protein Box', 'snack', 410, 28, 0, 0),
  r('Raspberry Chocolate Protein Bar', 'snack', 210, 20, 0, 0),
  r('Matcha Strawberry Yogurt Protein Clusters', 'snack', 210, 12, 0, 0),

  // ---------- DESSERTS (add-ons) ----------
  r('Chocolate Chip Skillet Cookie', 'dessert', 432, 40, 48, 9),
  r('Dubai Chocolate Skillet Cookie', 'dessert', 421, 36, 46, 9),
  r('Brookie Skillet', 'dessert', 482, 26, 38, 31),
  r('Cookies & Cream Cheesecake Bowl', 'dessert', 424, 40, 33, 14),
  r('Biscoff Cheesecake Bowl', 'dessert', 425, 29, 31, 15),
  r('Strawberry Shortcake Cheesecake', 'dessert', 415, 40, 28, 15),
  r('Sugar Cookie Dough', 'dessert', 395, 37, 42, 10),
  r('Red Velvet Cookie Dough', 'dessert', 385, 37, 40, 9),
  r('Mini Pumpkin Pie', 'dessert', 359, 25, 37, 14),
  r('Biscoff Tiramisu', 'dessert', 506, 42, 48, 18),
]

export const byCategory = (c: MealCategory) => RECIPES.filter(x => x.category === c)
export const findRecipe = (name: string) => RECIPES.find(x => x.name === name)
