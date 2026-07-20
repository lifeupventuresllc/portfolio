// AUTO-GENERATED from The-Menu.html cookbook. Per-recipe ingredient lists with amounts.
// basis: "total" = amounts make `servings` servings; "per_serving" = amounts are for ONE serving.
export type Aisle = "Proteins" | "Produce" | "Dairy" | "Grains/Carbs" | "Sauces & Condiments" | "Pantry"
export interface RawIngredient { item: string; qty: number | null; unit: string; aisle: Aisle }
export interface RawRecipeIngredients { name: string; servings: number; basis: "total" | "per_serving"; ingredients: RawIngredient[] }

export const COOKBOOK_INGREDIENTS: RawRecipeIngredients[] = [
  {
    "name": "Chicken Nugget Hash Brown Bake",
    "servings": 1,
    "basis": "per_serving",
    "ingredients": [
      {
        "item": "shredded hash browns",
        "qty": 0.5,
        "unit": "cup",
        "aisle": "Grains/Carbs"
      },
      {
        "item": "whole egg",
        "qty": 1,
        "unit": "each",
        "aisle": "Proteins"
      },
      {
        "item": "egg whites",
        "qty": 0.25,
        "unit": "cup",
        "aisle": "Proteins"
      },
      {
        "item": "lightly breaded chicken nuggets",
        "qty": 4,
        "unit": "oz",
        "aisle": "Proteins"
      },
      {
        "item": "fat-free cheese",
        "qty": 1,
        "unit": "oz",
        "aisle": "Dairy"
      },
      {
        "item": "salt + pepper",
        "qty": null,
        "unit": "to taste",
        "aisle": "Pantry"
      },
      {
        "item": "pico de gallo",
        "qty": 1.5,
        "unit": "tbsp",
        "aisle": "Produce"
      }
    ]
  },
  {
    "name": "Beef & Egg Breakfast Power Bowl",
    "servings": 10,
    "basis": "total",
    "ingredients": [
      {
        "item": "96/4 ground beef",
        "qty": 3,
        "unit": "lb",
        "aisle": "Proteins"
      },
      {
        "item": "beef bacon",
        "qty": 20,
        "unit": "slice",
        "aisle": "Proteins"
      },
      {
        "item": "eggs",
        "qty": 20,
        "unit": "each",
        "aisle": "Proteins"
      },
      {
        "item": "frozen south style potatoes",
        "qty": 64,
        "unit": "oz",
        "aisle": "Grains/Carbs"
      },
      {
        "item": "paprika",
        "qty": 1.5,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "garlic powder",
        "qty": 1.5,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "onion powder",
        "qty": 1.25,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "black pepper",
        "qty": 1.25,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "salt",
        "qty": 0.75,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "all-purpose seasoning",
        "qty": 0.75,
        "unit": "tsp",
        "aisle": "Pantry"
      }
    ]
  },
  {
    "name": "Steak, Egg & Cheese Breakfast Bagels",
    "servings": 6,
    "basis": "total",
    "ingredients": [
      {
        "item": "top sirloin steak",
        "qty": 35,
        "unit": "oz",
        "aisle": "Proteins"
      },
      {
        "item": "beef bacon",
        "qty": 6,
        "unit": "slice",
        "aisle": "Proteins"
      },
      {
        "item": "eggs",
        "qty": 6,
        "unit": "each",
        "aisle": "Proteins"
      },
      {
        "item": "fat-free cheese",
        "qty": 6,
        "unit": "slice",
        "aisle": "Dairy"
      },
      {
        "item": "sola protein bagels",
        "qty": 6,
        "unit": "each",
        "aisle": "Grains/Carbs"
      }
    ]
  },
  {
    "name": "Turkey Sausage Sweet Potato Hash",
    "servings": 4,
    "basis": "total",
    "ingredients": [
      {
        "item": "93/7 ground turkey",
        "qty": 1.5,
        "unit": "lb",
        "aisle": "Proteins"
      },
      {
        "item": "sweet potatoes",
        "qty": 24,
        "unit": "oz",
        "aisle": "Grains/Carbs"
      },
      {
        "item": "bell peppers",
        "qty": 8,
        "unit": "oz",
        "aisle": "Produce"
      },
      {
        "item": "onion",
        "qty": 4,
        "unit": "oz",
        "aisle": "Produce"
      },
      {
        "item": "beef bacon",
        "qty": 4,
        "unit": "slice",
        "aisle": "Proteins"
      },
      {
        "item": "paprika",
        "qty": 1.5,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "garlic powder",
        "qty": 1.25,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "salt",
        "qty": 0.75,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "black pepper",
        "qty": 0.75,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "cooking spray",
        "qty": null,
        "unit": "to taste",
        "aisle": "Sauces & Condiments"
      }
    ]
  },
  {
    "name": "Southwest Bacon Breakfast Burritos",
    "servings": 7,
    "basis": "total",
    "ingredients": [
      {
        "item": "burrito-sized tortillas",
        "qty": 7,
        "unit": "each",
        "aisle": "Grains/Carbs"
      },
      {
        "item": "whole eggs",
        "qty": 7,
        "unit": "each",
        "aisle": "Proteins"
      },
      {
        "item": "96/4 ground beef",
        "qty": 1,
        "unit": "lb",
        "aisle": "Proteins"
      },
      {
        "item": "center-cut bacon",
        "qty": 10,
        "unit": "slice",
        "aisle": "Proteins"
      },
      {
        "item": "reduced-fat Mexican-style cheese",
        "qty": 4,
        "unit": "oz",
        "aisle": "Dairy"
      },
      {
        "item": "southwestern burrito bowl mix",
        "qty": 10,
        "unit": "oz",
        "aisle": "Produce"
      }
    ]
  },
  {
    "name": "Turkey Stuffed Bagel Meal Prep",
    "servings": 4,
    "basis": "total",
    "ingredients": [
      {
        "item": "97/3 ground turkey",
        "qty": 1,
        "unit": "lb",
        "aisle": "Proteins"
      },
      {
        "item": "avocado oil",
        "qty": 1,
        "unit": "tbsp",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "white onion",
        "qty": 1,
        "unit": "each",
        "aisle": "Produce"
      },
      {
        "item": "green pepper",
        "qty": 1,
        "unit": "each",
        "aisle": "Produce"
      },
      {
        "item": "crimini mushrooms",
        "qty": 1.5,
        "unit": "cup",
        "aisle": "Produce"
      },
      {
        "item": "minced garlic",
        "qty": 1,
        "unit": "tbsp",
        "aisle": "Produce"
      },
      {
        "item": "plain Dave's Killer Bagels",
        "qty": 4,
        "unit": "each",
        "aisle": "Grains/Carbs"
      },
      {
        "item": "reduced fat provolone",
        "qty": 8,
        "unit": "slice",
        "aisle": "Dairy"
      },
      {
        "item": "black pepper, garlic powder, onion powder, smoked paprika, chili powder",
        "qty": null,
        "unit": "to taste",
        "aisle": "Pantry"
      }
    ]
  },
  {
    "name": "Protein Banana Bread",
    "servings": 8,
    "basis": "total",
    "ingredients": [
      {
        "item": "ripe bananas",
        "qty": null,
        "unit": "to taste",
        "aisle": "Produce"
      },
      {
        "item": "egg whites",
        "qty": null,
        "unit": "to taste",
        "aisle": "Proteins"
      },
      {
        "item": "nonfat Greek yogurt",
        "qty": null,
        "unit": "to taste",
        "aisle": "Dairy"
      },
      {
        "item": "vanilla protein powder",
        "qty": null,
        "unit": "to taste",
        "aisle": "Pantry"
      },
      {
        "item": "oat flour",
        "qty": null,
        "unit": "to taste",
        "aisle": "Grains/Carbs"
      },
      {
        "item": "baking powder",
        "qty": null,
        "unit": "to taste",
        "aisle": "Pantry"
      },
      {
        "item": "baking soda",
        "qty": null,
        "unit": "to taste",
        "aisle": "Pantry"
      },
      {
        "item": "monkfruit sweetener",
        "qty": null,
        "unit": "to taste",
        "aisle": "Pantry"
      },
      {
        "item": "salt",
        "qty": null,
        "unit": "to taste",
        "aisle": "Pantry"
      },
      {
        "item": "mini chocolate chips",
        "qty": null,
        "unit": "to taste",
        "aisle": "Pantry"
      }
    ]
  },
  {
    "name": "Protein Pancake Bake",
    "servings": 12,
    "basis": "total",
    "ingredients": [
      {
        "item": "Kodiak buttermilk pancake mix",
        "qty": 4,
        "unit": "cup",
        "aisle": "Grains/Carbs"
      },
      {
        "item": "unsweetened almond milk",
        "qty": 3,
        "unit": "cup",
        "aisle": "Dairy"
      },
      {
        "item": "large eggs",
        "qty": 4,
        "unit": "each",
        "aisle": "Proteins"
      },
      {
        "item": "calorie-free sweetener",
        "qty": 2.5,
        "unit": "tbsp",
        "aisle": "Pantry"
      },
      {
        "item": "turkey breakfast sausage",
        "qty": 1,
        "unit": "lb",
        "aisle": "Proteins"
      },
      {
        "item": "turkey bacon",
        "qty": 8,
        "unit": "slice",
        "aisle": "Proteins"
      },
      {
        "item": "lite shredded cheese",
        "qty": 1.5,
        "unit": "cup",
        "aisle": "Dairy"
      },
      {
        "item": "lite syrup",
        "qty": null,
        "unit": "to taste",
        "aisle": "Sauces & Condiments"
      }
    ]
  },
  {
    "name": "BBQ Chicken Pizza",
    "servings": 4,
    "basis": "total",
    "ingredients": [
      {
        "item": "chicken breast",
        "qty": 10,
        "unit": "oz",
        "aisle": "Proteins"
      },
      {
        "item": "thin pizza crust",
        "qty": 1,
        "unit": "each",
        "aisle": "Grains/Carbs"
      },
      {
        "item": "BBQ sauce",
        "qty": 2.5,
        "unit": "tbsp",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "shredded cheese",
        "qty": 2,
        "unit": "oz",
        "aisle": "Dairy"
      },
      {
        "item": "onion",
        "qty": 1,
        "unit": "oz",
        "aisle": "Produce"
      },
      {
        "item": "jalapeno",
        "qty": 2,
        "unit": "oz",
        "aisle": "Produce"
      },
      {
        "item": "Italian seasoning, salt, red pepper flakes",
        "qty": null,
        "unit": "to taste",
        "aisle": "Pantry"
      }
    ]
  },
  {
    "name": "Chicken Pineapple Fried Rice",
    "servings": 5,
    "basis": "total",
    "ingredients": [
      {
        "item": "chicken breast",
        "qty": 2,
        "unit": "lb",
        "aisle": "Proteins"
      },
      {
        "item": "cooked jasmine rice",
        "qty": 2.667,
        "unit": "cup",
        "aisle": "Grains/Carbs"
      },
      {
        "item": "mixed vegetables",
        "qty": 1,
        "unit": "cup",
        "aisle": "Produce"
      },
      {
        "item": "pineapple",
        "qty": 1.5,
        "unit": "cup",
        "aisle": "Produce"
      },
      {
        "item": "soy sauce",
        "qty": 6,
        "unit": "tbsp",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "diced bell peppers",
        "qty": 1.5,
        "unit": "cup",
        "aisle": "Produce"
      },
      {
        "item": "diced onion",
        "qty": 0.75,
        "unit": "cup",
        "aisle": "Produce"
      },
      {
        "item": "eggs",
        "qty": 3,
        "unit": "each",
        "aisle": "Proteins"
      },
      {
        "item": "sugar-free ketchup",
        "qty": 6,
        "unit": "tbsp",
        "aisle": "Sauces & Condiments"
      }
    ]
  },
  {
    "name": "Chicken Teriyaki Rice Bowl",
    "servings": 4,
    "basis": "total",
    "ingredients": [
      {
        "item": "chicken breast",
        "qty": 1.5,
        "unit": "lb",
        "aisle": "Proteins"
      },
      {
        "item": "cooked jasmine rice",
        "qty": 18,
        "unit": "oz",
        "aisle": "Grains/Carbs"
      },
      {
        "item": "broccoli florets",
        "qty": 14,
        "unit": "oz",
        "aisle": "Produce"
      },
      {
        "item": "low-sodium teriyaki sauce",
        "qty": 4,
        "unit": "tbsp",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "sesame oil",
        "qty": 1,
        "unit": "tbsp",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "garlic powder",
        "qty": 1.25,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "ground ginger",
        "qty": 0.75,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "black pepper",
        "qty": 0.75,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "sesame seeds, green onion (optional)",
        "qty": null,
        "unit": "to taste",
        "aisle": "Produce"
      }
    ]
  },
  {
    "name": "Chicken & Fries with Cane's Sauce",
    "servings": 4,
    "basis": "total",
    "ingredients": [
      {
        "item": "chicken breast",
        "qty": 2,
        "unit": "lb",
        "aisle": "Proteins"
      },
      {
        "item": "hot honey",
        "qty": 2,
        "unit": "tbsp",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "Alexia sweet potato fries",
        "qty": 1,
        "unit": "each",
        "aisle": "Grains/Carbs"
      },
      {
        "item": "salt, pepper, paprika, garlic powder, sea salt",
        "qty": null,
        "unit": "to taste",
        "aisle": "Pantry"
      },
      {
        "item": "fat-free Greek yogurt",
        "qty": 0.5,
        "unit": "cup",
        "aisle": "Dairy"
      },
      {
        "item": "light mayo",
        "qty": 0.25,
        "unit": "cup",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "sugar-free ketchup",
        "qty": 2,
        "unit": "tbsp",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "honey mustard",
        "qty": 1,
        "unit": "tsp",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "Worcestershire sauce",
        "qty": 1,
        "unit": "tsp",
        "aisle": "Sauces & Condiments"
      }
    ]
  },
  {
    "name": "Macro Friendly Big Mac",
    "servings": 1,
    "basis": "total",
    "ingredients": [
      {
        "item": "96% lean ground beef",
        "qty": 7,
        "unit": "oz",
        "aisle": "Proteins"
      },
      {
        "item": "Nature's Own brioche bun",
        "qty": 1,
        "unit": "each",
        "aisle": "Grains/Carbs"
      },
      {
        "item": "fat-free American cheese",
        "qty": 2,
        "unit": "slice",
        "aisle": "Dairy"
      },
      {
        "item": "light mayo",
        "qty": 2,
        "unit": "tsp",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "sugar-free ketchup",
        "qty": 2,
        "unit": "tsp",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "sweet pickle relish",
        "qty": 1,
        "unit": "tsp",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "mustard",
        "qty": 1,
        "unit": "tsp",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "Worcestershire sauce",
        "qty": 1,
        "unit": "tsp",
        "aisle": "Sauces & Condiments"
      }
    ]
  },
  {
    "name": "BBQ Beef Burritos",
    "servings": 11,
    "basis": "total",
    "ingredients": [
      {
        "item": "96/4 ground beef",
        "qty": 3,
        "unit": "lb",
        "aisle": "Proteins"
      },
      {
        "item": "diced bell peppers",
        "qty": 10,
        "unit": "oz",
        "aisle": "Produce"
      },
      {
        "item": "jalapeno peppers",
        "qty": 10,
        "unit": "each",
        "aisle": "Produce"
      },
      {
        "item": "red kidney beans",
        "qty": 1,
        "unit": "can",
        "aisle": "Pantry"
      },
      {
        "item": "sugar-free BBQ sauce",
        "qty": 6,
        "unit": "tbsp",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "Extreme Bonus wraps",
        "qty": 11,
        "unit": "each",
        "aisle": "Grains/Carbs"
      },
      {
        "item": "salt",
        "qty": 1.5,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "black pepper",
        "qty": 0.75,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "honey BBQ seasoning",
        "qty": 2,
        "unit": "tsp",
        "aisle": "Pantry"
      }
    ]
  },
  {
    "name": "Ground Turkey Taco Bowl",
    "servings": 4,
    "basis": "total",
    "ingredients": [
      {
        "item": "93/7 ground turkey",
        "qty": 1.5,
        "unit": "lb",
        "aisle": "Proteins"
      },
      {
        "item": "cooked jasmine rice",
        "qty": 14,
        "unit": "oz",
        "aisle": "Grains/Carbs"
      },
      {
        "item": "black beans",
        "qty": 1,
        "unit": "can",
        "aisle": "Pantry"
      },
      {
        "item": "salsa",
        "qty": 8,
        "unit": "tbsp",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "fat-free shredded cheese",
        "qty": 4,
        "unit": "oz",
        "aisle": "Dairy"
      },
      {
        "item": "romaine lettuce",
        "qty": 4,
        "unit": "oz",
        "aisle": "Produce"
      },
      {
        "item": "cumin",
        "qty": 1.25,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "chili powder",
        "qty": 1.25,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "garlic powder",
        "qty": 0.75,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "onion powder",
        "qty": 0.75,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "paprika",
        "qty": 0.75,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "salt",
        "qty": 0.75,
        "unit": "tsp",
        "aisle": "Pantry"
      }
    ]
  },
  {
    "name": "Dump-and-Bake Taco Bowls",
    "servings": 5,
    "basis": "total",
    "ingredients": [
      {
        "item": "lean ground turkey",
        "qty": null,
        "unit": "to taste",
        "aisle": "Proteins"
      },
      {
        "item": "red bell peppers, diced",
        "qty": 2,
        "unit": "each",
        "aisle": "Produce"
      },
      {
        "item": "Trader Joe's diced onions",
        "qty": 1,
        "unit": "each",
        "aisle": "Produce"
      },
      {
        "item": "taco seasoning packet",
        "qty": 1,
        "unit": "each",
        "aisle": "Pantry"
      },
      {
        "item": "turkey bone broth",
        "qty": 0.667,
        "unit": "cup",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "uncooked brown rice",
        "qty": 5,
        "unit": "tbsp",
        "aisle": "Grains/Carbs"
      },
      {
        "item": "diced onions",
        "qty": 10,
        "unit": "tbsp",
        "aisle": "Produce"
      },
      {
        "item": "black beans",
        "qty": 1.25,
        "unit": "cup",
        "aisle": "Pantry"
      },
      {
        "item": "sliced black olives",
        "qty": 6.25,
        "unit": "tbsp",
        "aisle": "Pantry"
      },
      {
        "item": "cooked turkey mixture",
        "qty": 7.5,
        "unit": "cup",
        "aisle": "Proteins"
      },
      {
        "item": "turkey bone broth (per-container)",
        "qty": 15,
        "unit": "tbsp",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "lite shredded cheese",
        "qty": 1.25,
        "unit": "cup",
        "aisle": "Dairy"
      }
    ]
  },
  {
    "name": "Honey Chili Chicken & Cauliflower Rice",
    "servings": 4,
    "basis": "total",
    "ingredients": [
      {
        "item": "boneless skinless chicken thighs",
        "qty": 3,
        "unit": "lb",
        "aisle": "Proteins"
      },
      {
        "item": "coconut aminos",
        "qty": 0.25,
        "unit": "cup",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "chicken broth",
        "qty": 0.5,
        "unit": "cup",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "raw honey",
        "qty": 0.25,
        "unit": "cup",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "minced garlic",
        "qty": 2,
        "unit": "tbsp",
        "aisle": "Produce"
      },
      {
        "item": "onion powder",
        "qty": 1,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "paprika",
        "qty": 1,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "black pepper",
        "qty": 1,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "ground ginger",
        "qty": 1,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "chili flakes",
        "qty": 1,
        "unit": "tbsp",
        "aisle": "Pantry"
      },
      {
        "item": "green onions",
        "qty": 2,
        "unit": "each",
        "aisle": "Produce"
      },
      {
        "item": "cauliflower rice",
        "qty": 2,
        "unit": "each",
        "aisle": "Produce"
      },
      {
        "item": "olive or avocado oil",
        "qty": null,
        "unit": "to taste",
        "aisle": "Sauces & Condiments"
      }
    ]
  },
  {
    "name": "High-Protein Pizza Pasta Bake",
    "servings": 6,
    "basis": "total",
    "ingredients": [
      {
        "item": "protein pasta",
        "qty": null,
        "unit": "to taste",
        "aisle": "Grains/Carbs"
      },
      {
        "item": "turkey pepperoni",
        "qty": null,
        "unit": "to taste",
        "aisle": "Proteins"
      },
      {
        "item": "mozzarella cheese",
        "qty": null,
        "unit": "to taste",
        "aisle": "Dairy"
      },
      {
        "item": "string cheese",
        "qty": null,
        "unit": "to taste",
        "aisle": "Dairy"
      },
      {
        "item": "marinara sauce",
        "qty": null,
        "unit": "to taste",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "Italian seasoning, salt, pepper, garlic powder",
        "qty": null,
        "unit": "to taste",
        "aisle": "Pantry"
      }
    ]
  },
  {
    "name": "Creamy Lemon Chicken Orzo",
    "servings": 4,
    "basis": "total",
    "ingredients": [
      {
        "item": "boneless skinless chicken thighs",
        "qty": 1.75,
        "unit": "lb",
        "aisle": "Proteins"
      },
      {
        "item": "salt",
        "qty": 1,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "black pepper",
        "qty": 1,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "garlic powder",
        "qty": 1,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "dried oregano or Italian seasoning",
        "qty": 1,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "olive oil",
        "qty": 1,
        "unit": "tbsp",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "dry orzo pasta",
        "qty": 1.5,
        "unit": "cup",
        "aisle": "Grains/Carbs"
      },
      {
        "item": "yellow onion",
        "qty": 1,
        "unit": "each",
        "aisle": "Produce"
      },
      {
        "item": "garlic",
        "qty": 3,
        "unit": "clove",
        "aisle": "Produce"
      },
      {
        "item": "low-sodium chicken broth",
        "qty": 3,
        "unit": "cup",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "nonfat Greek yogurt or light cream",
        "qty": 0.5,
        "unit": "cup",
        "aisle": "Dairy"
      },
      {
        "item": "lemon (for zest)",
        "qty": 1,
        "unit": "each",
        "aisle": "Produce"
      },
      {
        "item": "lemon (for juice)",
        "qty": 1,
        "unit": "each",
        "aisle": "Produce"
      },
      {
        "item": "fresh spinach",
        "qty": 3,
        "unit": "cup",
        "aisle": "Produce"
      },
      {
        "item": "grated Parmesan cheese",
        "qty": 0.25,
        "unit": "cup",
        "aisle": "Dairy"
      }
    ]
  },
  {
    "name": "Steak & Onion Stir Fry",
    "servings": 6,
    "basis": "total",
    "ingredients": [
      {
        "item": "flank steak",
        "qty": 2,
        "unit": "lb",
        "aisle": "Proteins"
      },
      {
        "item": "light soy sauce",
        "qty": 1.5,
        "unit": "tbsp",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "dark soy sauce",
        "qty": 1.5,
        "unit": "tbsp",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "oyster sauce",
        "qty": 1.5,
        "unit": "tbsp",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "stevia",
        "qty": 1,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "baking soda",
        "qty": 0.75,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "arrowroot powder",
        "qty": 2,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "sesame oil",
        "qty": 2,
        "unit": "tsp",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "avocado oil",
        "qty": 1,
        "unit": "tbsp",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "white onions",
        "qty": 1.5,
        "unit": "each",
        "aisle": "Produce"
      },
      {
        "item": "green onions",
        "qty": 1,
        "unit": "each",
        "aisle": "Produce"
      },
      {
        "item": "garlic",
        "qty": 7,
        "unit": "clove",
        "aisle": "Produce"
      },
      {
        "item": "cremini mushrooms",
        "qty": 2,
        "unit": "cup",
        "aisle": "Produce"
      },
      {
        "item": "rice wine",
        "qty": 1,
        "unit": "tbsp",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "dark soy sauce",
        "qty": 1.5,
        "unit": "tbsp",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "oyster sauce",
        "qty": 1,
        "unit": "tbsp",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "water",
        "qty": 0.667,
        "unit": "cup",
        "aisle": "Pantry"
      },
      {
        "item": "black pepper",
        "qty": null,
        "unit": "to taste",
        "aisle": "Pantry"
      }
    ]
  },
  {
    "name": "Protein Mac & Cheese Bake",
    "servings": 6,
    "basis": "total",
    "ingredients": [
      {
        "item": "93/7 ground turkey",
        "qty": 1,
        "unit": "lb",
        "aisle": "Proteins"
      },
      {
        "item": "olive or avocado oil",
        "qty": 1,
        "unit": "tbsp",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "minced garlic",
        "qty": 1,
        "unit": "tbsp",
        "aisle": "Produce"
      },
      {
        "item": "baby bella mushrooms",
        "qty": 8,
        "unit": "oz",
        "aisle": "Produce"
      },
      {
        "item": "onion powder, garlic powder, black pepper, paprika",
        "qty": null,
        "unit": "to taste",
        "aisle": "Pantry"
      },
      {
        "item": "diced tomatoes",
        "qty": 16,
        "unit": "oz",
        "aisle": "Pantry"
      },
      {
        "item": "sun-dried tomatoes",
        "qty": null,
        "unit": "to taste",
        "aisle": "Pantry"
      },
      {
        "item": "Rao's Marinara",
        "qty": 2,
        "unit": "cup",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "fresh basil",
        "qty": 2,
        "unit": "tbsp",
        "aisle": "Produce"
      },
      {
        "item": "protein pasta",
        "qty": 1.5,
        "unit": "cup",
        "aisle": "Grains/Carbs"
      },
      {
        "item": "low-fat cottage cheese",
        "qty": 16,
        "unit": "oz",
        "aisle": "Dairy"
      },
      {
        "item": "low-fat shredded cheese",
        "qty": 1.5,
        "unit": "cup",
        "aisle": "Dairy"
      },
      {
        "item": "lite string cheese",
        "qty": 1,
        "unit": "each",
        "aisle": "Dairy"
      },
      {
        "item": "almond milk",
        "qty": 0.5,
        "unit": "cup",
        "aisle": "Dairy"
      },
      {
        "item": "lite mozzarella",
        "qty": 6,
        "unit": "slice",
        "aisle": "Dairy"
      },
      {
        "item": "garlic powder",
        "qty": 0.5,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "onion powder",
        "qty": 0.5,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "pepper",
        "qty": 0.25,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "arrowroot powder",
        "qty": 1,
        "unit": "tbsp",
        "aisle": "Pantry"
      },
      {
        "item": "water",
        "qty": 2,
        "unit": "tbsp",
        "aisle": "Pantry"
      }
    ]
  },
  {
    "name": "Fully Loaded Fried Cabbage",
    "servings": 5,
    "basis": "total",
    "ingredients": [
      {
        "item": "raw shrimp",
        "qty": 1,
        "unit": "lb",
        "aisle": "Proteins"
      },
      {
        "item": "chicken sausage",
        "qty": 1,
        "unit": "lb",
        "aisle": "Proteins"
      },
      {
        "item": "nitrate-free turkey bacon",
        "qty": 5,
        "unit": "slice",
        "aisle": "Proteins"
      },
      {
        "item": "green cabbage",
        "qty": 1,
        "unit": "each",
        "aisle": "Produce"
      },
      {
        "item": "red bell peppers",
        "qty": 2,
        "unit": "each",
        "aisle": "Produce"
      },
      {
        "item": "red onion",
        "qty": 1,
        "unit": "each",
        "aisle": "Produce"
      },
      {
        "item": "minced garlic",
        "qty": 1,
        "unit": "tbsp",
        "aisle": "Produce"
      },
      {
        "item": "avocado or olive oil",
        "qty": 2.5,
        "unit": "tbsp",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "garlic powder, onion powder, black pepper, Cajun seasoning",
        "qty": null,
        "unit": "to taste",
        "aisle": "Pantry"
      }
    ]
  },
  {
    "name": "Sourdough Pizza Toast",
    "servings": 1,
    "basis": "total",
    "ingredients": [
      {
        "item": "sourdough bread",
        "qty": 2,
        "unit": "slice",
        "aisle": "Grains/Carbs"
      },
      {
        "item": "marinara or pizza sauce",
        "qty": 0.25,
        "unit": "cup",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "low-fat cottage cheese",
        "qty": 0.5,
        "unit": "cup",
        "aisle": "Dairy"
      },
      {
        "item": "low-fat shredded mozzarella cheese",
        "qty": 0.25,
        "unit": "cup",
        "aisle": "Dairy"
      },
      {
        "item": "turkey pepperoni",
        "qty": 14,
        "unit": "slice",
        "aisle": "Proteins"
      },
      {
        "item": "Italian seasoning",
        "qty": 1,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "garlic powder",
        "qty": 0.5,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "red pepper flakes",
        "qty": 0.5,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "hot honey",
        "qty": 1,
        "unit": "tbsp",
        "aisle": "Sauces & Condiments"
      },
      {
        "item": "fresh parsley or basil",
        "qty": null,
        "unit": "to taste",
        "aisle": "Produce"
      }
    ]
  },
  {
    "name": "High-Protein Flatbread",
    "servings": 6,
    "basis": "total",
    "ingredients": [
      {
        "item": "high-protein flour blend (oat flour + protein powder)",
        "qty": null,
        "unit": "to taste",
        "aisle": "Grains/Carbs"
      },
      {
        "item": "water",
        "qty": null,
        "unit": "to taste",
        "aisle": "Pantry"
      },
      {
        "item": "salt",
        "qty": null,
        "unit": "to taste",
        "aisle": "Pantry"
      },
      {
        "item": "baking powder",
        "qty": null,
        "unit": "to taste",
        "aisle": "Pantry"
      },
      {
        "item": "ghee",
        "qty": null,
        "unit": "to taste",
        "aisle": "Dairy"
      },
      {
        "item": "Parmesan cheese",
        "qty": null,
        "unit": "to taste",
        "aisle": "Dairy"
      },
      {
        "item": "fresh parsley",
        "qty": null,
        "unit": "to taste",
        "aisle": "Produce"
      }
    ]
  },
  {
    "name": "Chocolate Chip Skillet Cookie",
    "servings": 1,
    "basis": "total",
    "ingredients": [
      {
        "item": "all purpose flour",
        "qty": 3,
        "unit": "tbsp",
        "aisle": "Grains/Carbs"
      },
      {
        "item": "vanilla protein powder",
        "qty": 3,
        "unit": "tbsp",
        "aisle": "Pantry"
      },
      {
        "item": "coconut flour",
        "qty": 1,
        "unit": "tbsp",
        "aisle": "Grains/Carbs"
      },
      {
        "item": "powdered peanut butter",
        "qty": 2,
        "unit": "tbsp",
        "aisle": "Pantry"
      },
      {
        "item": "monkfruit sweetener",
        "qty": 1,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "baking soda",
        "qty": 0.5,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "egg whites",
        "qty": 3,
        "unit": "tbsp",
        "aisle": "Proteins"
      },
      {
        "item": "unsweetened applesauce",
        "qty": 3,
        "unit": "tbsp",
        "aisle": "Pantry"
      },
      {
        "item": "nonfat Greek yogurt",
        "qty": 3,
        "unit": "tbsp",
        "aisle": "Dairy"
      },
      {
        "item": "mini chocolate chips",
        "qty": 1,
        "unit": "tbsp",
        "aisle": "Pantry"
      }
    ]
  },
  {
    "name": "Dubai Chocolate Skillet Cookie",
    "servings": 1,
    "basis": "total",
    "ingredients": [
      {
        "item": "all purpose flour",
        "qty": 3,
        "unit": "tbsp",
        "aisle": "Grains/Carbs"
      },
      {
        "item": "chocolate protein powder",
        "qty": 3,
        "unit": "tbsp",
        "aisle": "Pantry"
      },
      {
        "item": "coconut flour",
        "qty": 1,
        "unit": "tbsp",
        "aisle": "Grains/Carbs"
      },
      {
        "item": "powdered peanut butter",
        "qty": 1.5,
        "unit": "tbsp",
        "aisle": "Pantry"
      },
      {
        "item": "cocoa powder",
        "qty": 1,
        "unit": "tbsp",
        "aisle": "Pantry"
      },
      {
        "item": "monkfruit",
        "qty": 1,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "baking soda",
        "qty": 0.5,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "egg whites",
        "qty": 3,
        "unit": "tbsp",
        "aisle": "Proteins"
      },
      {
        "item": "unsweetened applesauce",
        "qty": 3,
        "unit": "tbsp",
        "aisle": "Pantry"
      },
      {
        "item": "nonfat Greek yogurt",
        "qty": 3,
        "unit": "tbsp",
        "aisle": "Dairy"
      },
      {
        "item": "melted chocolate",
        "qty": 1.5,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "pistachio crème",
        "qty": 1.5,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "shredded puff pastry",
        "qty": 1,
        "unit": "tsp",
        "aisle": "Grains/Carbs"
      }
    ]
  },
  {
    "name": "Brookie Skillet",
    "servings": 1,
    "basis": "total",
    "ingredients": [
      {
        "item": "chocolate truffle protein powder",
        "qty": 2.5,
        "unit": "tbsp",
        "aisle": "Pantry"
      },
      {
        "item": "all purpose flour",
        "qty": 2.5,
        "unit": "tbsp",
        "aisle": "Grains/Carbs"
      },
      {
        "item": "coconut flour",
        "qty": 2,
        "unit": "tsp",
        "aisle": "Grains/Carbs"
      },
      {
        "item": "cocoa powder",
        "qty": 1,
        "unit": "tbsp",
        "aisle": "Pantry"
      },
      {
        "item": "baking powder",
        "qty": 0.5,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "unsweetened almond milk",
        "qty": 0.333,
        "unit": "cup",
        "aisle": "Dairy"
      },
      {
        "item": "light margarine",
        "qty": 1.5,
        "unit": "tbsp",
        "aisle": "Dairy"
      },
      {
        "item": "nonfat Greek yogurt",
        "qty": 2,
        "unit": "tbsp",
        "aisle": "Dairy"
      },
      {
        "item": "mini chocolate chips",
        "qty": 2,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "vanilla protein powder",
        "qty": 1,
        "unit": "tbsp",
        "aisle": "Pantry"
      },
      {
        "item": "coconut flour",
        "qty": 2,
        "unit": "tsp",
        "aisle": "Grains/Carbs"
      },
      {
        "item": "light margarine",
        "qty": 1,
        "unit": "tbsp",
        "aisle": "Dairy"
      },
      {
        "item": "monkfruit",
        "qty": 1,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "baking powder",
        "qty": 0.5,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "vanilla extract",
        "qty": 0.5,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "mini chocolate chips",
        "qty": 1,
        "unit": "tsp",
        "aisle": "Pantry"
      }
    ]
  },
  {
    "name": "Cookies & Cream Cheesecake Bowl",
    "servings": 1,
    "basis": "total",
    "ingredients": [
      {
        "item": "nonfat Greek yogurt",
        "qty": 0.75,
        "unit": "cup",
        "aisle": "Dairy"
      },
      {
        "item": "low fat cream cheese",
        "qty": 0.333,
        "unit": "cup",
        "aisle": "Dairy"
      },
      {
        "item": "Fairlife skim milk",
        "qty": 3,
        "unit": "tbsp",
        "aisle": "Dairy"
      },
      {
        "item": "white chocolate pudding mix",
        "qty": 1,
        "unit": "tbsp",
        "aisle": "Pantry"
      },
      {
        "item": "cookies & cream protein powder",
        "qty": 1,
        "unit": "tbsp",
        "aisle": "Pantry"
      },
      {
        "item": "monkfruit sweetener",
        "qty": 2,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "Oreo baking crumbs",
        "qty": 1,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "Oreo (crushed)",
        "qty": 1,
        "unit": "each",
        "aisle": "Pantry"
      }
    ]
  },
  {
    "name": "Biscoff Cheesecake Bowl",
    "servings": 1,
    "basis": "total",
    "ingredients": [
      {
        "item": "nonfat Greek yogurt",
        "qty": 0.75,
        "unit": "cup",
        "aisle": "Dairy"
      },
      {
        "item": "low fat cream cheese",
        "qty": 0.333,
        "unit": "cup",
        "aisle": "Dairy"
      },
      {
        "item": "Fairlife skim milk",
        "qty": 3,
        "unit": "tbsp",
        "aisle": "Dairy"
      },
      {
        "item": "white chocolate pudding mix",
        "qty": 1,
        "unit": "tbsp",
        "aisle": "Pantry"
      },
      {
        "item": "snickerdoodle protein powder",
        "qty": 1,
        "unit": "tbsp",
        "aisle": "Pantry"
      },
      {
        "item": "monkfruit sweetener",
        "qty": 2,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "cinnamon",
        "qty": 1,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "Biscoff cookie (crushed)",
        "qty": 1,
        "unit": "each",
        "aisle": "Pantry"
      },
      {
        "item": "Biscoff drizzle",
        "qty": 1,
        "unit": "tsp",
        "aisle": "Pantry"
      }
    ]
  },
  {
    "name": "Strawberry Shortcake Cheesecake",
    "servings": 1,
    "basis": "total",
    "ingredients": [
      {
        "item": "nonfat Greek yogurt",
        "qty": 0.75,
        "unit": "cup",
        "aisle": "Dairy"
      },
      {
        "item": "low fat cream cheese",
        "qty": 0.333,
        "unit": "cup",
        "aisle": "Dairy"
      },
      {
        "item": "Fairlife skim milk",
        "qty": 3,
        "unit": "tbsp",
        "aisle": "Dairy"
      },
      {
        "item": "white chocolate pudding mix",
        "qty": 1,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "strawberry jello powder",
        "qty": 1,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "vanilla protein powder",
        "qty": 1,
        "unit": "tbsp",
        "aisle": "Pantry"
      },
      {
        "item": "monkfruit",
        "qty": 2,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "golden Oreo (crushed)",
        "qty": 1,
        "unit": "each",
        "aisle": "Pantry"
      }
    ]
  },
  {
    "name": "Sugar Cookie Dough",
    "servings": 1,
    "basis": "total",
    "ingredients": [
      {
        "item": "oat flour",
        "qty": 0.25,
        "unit": "cup",
        "aisle": "Grains/Carbs"
      },
      {
        "item": "vanilla protein powder",
        "qty": 3,
        "unit": "tbsp",
        "aisle": "Pantry"
      },
      {
        "item": "white chocolate pudding mix",
        "qty": 1,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "powdered peanut butter",
        "qty": 1,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "brown monkfruit",
        "qty": 2,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "salt",
        "qty": null,
        "unit": "to taste",
        "aisle": "Pantry"
      },
      {
        "item": "vanilla extract",
        "qty": 0.5,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "sprinkles",
        "qty": 1,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "nonfat Greek yogurt",
        "qty": 0.5,
        "unit": "cup",
        "aisle": "Dairy"
      },
      {
        "item": "unsweetened almond milk",
        "qty": 2.5,
        "unit": "tsp",
        "aisle": "Dairy"
      },
      {
        "item": "white chocolate",
        "qty": 2,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "coconut oil",
        "qty": 0.5,
        "unit": "tsp",
        "aisle": "Sauces & Condiments"
      }
    ]
  },
  {
    "name": "Red Velvet Cookie Dough",
    "servings": 1,
    "basis": "total",
    "ingredients": [
      {
        "item": "oat flour",
        "qty": 0.25,
        "unit": "cup",
        "aisle": "Grains/Carbs"
      },
      {
        "item": "chocolate protein powder",
        "qty": 3,
        "unit": "tbsp",
        "aisle": "Pantry"
      },
      {
        "item": "fat free chocolate pudding mix",
        "qty": 1,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "powdered peanut butter",
        "qty": 1,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "brown monkfruit",
        "qty": 2,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "salt",
        "qty": null,
        "unit": "to taste",
        "aisle": "Pantry"
      },
      {
        "item": "red velvet extract",
        "qty": 1.5,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "nonfat Greek yogurt",
        "qty": 0.5,
        "unit": "cup",
        "aisle": "Dairy"
      },
      {
        "item": "unsweetened almond milk",
        "qty": 2.5,
        "unit": "tsp",
        "aisle": "Dairy"
      },
      {
        "item": "chocolate",
        "qty": 2,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "coconut oil",
        "qty": 0.25,
        "unit": "tsp",
        "aisle": "Sauces & Condiments"
      }
    ]
  },
  {
    "name": "Mini Pumpkin Pie",
    "servings": 1,
    "basis": "total",
    "ingredients": [
      {
        "item": "Graham cracker crumbs",
        "qty": 0.25,
        "unit": "cup",
        "aisle": "Grains/Carbs"
      },
      {
        "item": "light butter/margarine",
        "qty": 2,
        "unit": "tsp",
        "aisle": "Dairy"
      },
      {
        "item": "canned pumpkin",
        "qty": 0.333,
        "unit": "cup",
        "aisle": "Pantry"
      },
      {
        "item": "unsweetened almond milk",
        "qty": 0.3125,
        "unit": "cup",
        "aisle": "Dairy"
      },
      {
        "item": "beaten egg",
        "qty": 0.5,
        "unit": "each",
        "aisle": "Proteins"
      },
      {
        "item": "pumpkin protein powder",
        "qty": 2,
        "unit": "tbsp",
        "aisle": "Pantry"
      },
      {
        "item": "brown monkfruit",
        "qty": 4,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "cinnamon",
        "qty": 0.75,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "ginger",
        "qty": 0.25,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "nutmeg",
        "qty": 0.25,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "salt",
        "qty": null,
        "unit": "to taste",
        "aisle": "Pantry"
      }
    ]
  },
  {
    "name": "Biscoff Tiramisu",
    "servings": 1,
    "basis": "total",
    "ingredients": [
      {
        "item": "Biscoff cookies",
        "qty": 6,
        "unit": "each",
        "aisle": "Pantry"
      },
      {
        "item": "espresso or cold coffee",
        "qty": 3,
        "unit": "tbsp",
        "aisle": "Pantry"
      },
      {
        "item": "nonfat Greek yogurt",
        "qty": 0.3125,
        "unit": "cup",
        "aisle": "Dairy"
      },
      {
        "item": "light ricotta",
        "qty": 0.5625,
        "unit": "cup",
        "aisle": "Dairy"
      },
      {
        "item": "snickerdoodle protein powder",
        "qty": 3,
        "unit": "tbsp",
        "aisle": "Pantry"
      },
      {
        "item": "cornstarch",
        "qty": 1,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "vanilla extract",
        "qty": 0.5,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "monkfruit sweetener",
        "qty": 4,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "Biscoff cookies (crushed topping)",
        "qty": 1,
        "unit": "tsp",
        "aisle": "Pantry"
      }
    ]
  },
  {
    "name": "Protein Overnight Oats",
    "servings": 1,
    "basis": "per_serving",
    "ingredients": [
      {
        "item": "rolled oats",
        "qty": 0.5,
        "unit": "cup",
        "aisle": "Grains/Carbs"
      },
      {
        "item": "chia seeds",
        "qty": 1,
        "unit": "tbsp",
        "aisle": "Pantry"
      },
      {
        "item": "low-fat milk",
        "qty": 1,
        "unit": "cup",
        "aisle": "Dairy"
      },
      {
        "item": "plain nonfat Greek yogurt",
        "qty": 0.5,
        "unit": "cup",
        "aisle": "Dairy"
      },
      {
        "item": "peanut butter",
        "qty": 1,
        "unit": "tbsp",
        "aisle": "Pantry"
      },
      {
        "item": "ground cinnamon",
        "qty": 0.5,
        "unit": "tsp",
        "aisle": "Pantry"
      },
      {
        "item": "sliced strawberries",
        "qty": 0.5,
        "unit": "cup",
        "aisle": "Produce"
      }
    ]
  }
]
