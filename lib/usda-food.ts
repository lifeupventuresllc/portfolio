// Accurate nutrition facts via USDA FoodData Central — free, government database
// (no per-request cost, 1,000 req/hour). Search-based verified macros for whole
// foods. Multi-item natural-language descriptions ("2 eggs and toast") are handled
// by the Claude estimate fallback (food-estimate route) instead — USDA's search
// works on single food terms, not full sentences.

export type FoodResult = {
  name: string
  brand: string | null
  servings: number
  serving_label: string | null
  calories: number
  protein_g: number
  carbs_g: number
  fats_g: number
  source: 'usda' | 'estimated'
  photo?: string | null
}

const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1'
const round = (v: unknown) => Math.round(Number(v) || 0)
const NUTRIENT_ID = { calories: 1008, protein: 1003, carbs: 1005, fat: 1004 }

export function usdaConfigured(): boolean {
  return !!process.env.USDA_API_KEY
}

type NutrientRow = { nutrientId?: number; nutrient?: { id?: number }; value?: number; amount?: number }
function nutrientValue(nutrients: NutrientRow[], id: number): number {
  const n = (nutrients || []).find((row) => (row.nutrientId ?? row.nutrient?.id) === id)
  return Number(n?.value ?? n?.amount ?? 0)
}

// NOTE: the /foods/search endpoint always reports foodNutrients per 100g, for
// EVERY dataType including Branded — its servingSize/servingSizeUnit fields are
// just package-label metadata, not a basis the nutrient values are scaled to.
// (Verified directly against the live API — a 284g Branded "chicken breast" result
// still reported 165 kcal, the correct per-100g value, not scaled to 284g.)
function toResult(f: Record<string, unknown>): FoodResult {
  const nutrients = (f.foodNutrients as NutrientRow[]) || []
  return {
    name: String(f.description || 'Food'),
    brand: (f.brandOwner as string) || (f.brandName as string) || null,
    servings: 1,
    serving_label: '100g',
    calories: round(nutrientValue(nutrients, NUTRIENT_ID.calories)),
    protein_g: round(nutrientValue(nutrients, NUTRIENT_ID.protein)),
    carbs_g: round(nutrientValue(nutrients, NUTRIENT_ID.carbs)),
    fats_g: round(nutrientValue(nutrients, NUTRIENT_ID.fat)),
    source: 'usda',
  }
}

// Search + resolve in one call: finds candidate foods for a query and returns
// each with fully-resolved macros (mirrors the old Nutritionix natural-language
// endpoint's contract so the frontend/route didn't need to change shape).
export async function usdaSearchWithMacros(query: string, limit = 6): Promise<FoodResult[]> {
  if (!usdaConfigured() || !query.trim()) return []
  // Fetch a wider candidate pool than we display — for common queries like "chicken
  // breast" USDA's relevance ranking is dominated by exact-name Branded matches, so
  // the generic Foundation/SR Legacy entry often doesn't make it into the first few
  // results at all. Casting wider lets us actually find one to surface, rather than
  // just reordering whatever happened to fit in a small page.
  const fetchSize = Math.max(limit * 3, 20)
  const url = `${USDA_BASE}/foods/search?api_key=${process.env.USDA_API_KEY}&query=${encodeURIComponent(query.trim())}&pageSize=${fetchSize}&dataType=Foundation,SR%20Legacy,Branded`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return []
  const data = await res.json().catch(() => null)
  const foods = Array.isArray(data?.foods) ? data.foods : []
  const mapped = foods.map((f: Record<string, unknown>) => toResult(f))
  // Generic (no brand) results first, each group keeping its own original relevance
  // order — she shouldn't have to guess which branded result is "closest" when her
  // exact brand isn't listed; a generic USDA reference food is the safe default.
  const generic = mapped.filter((f: FoodResult) => !f.brand)
  const branded = mapped.filter((f: FoodResult) => f.brand)
  return [...generic, ...branded].slice(0, limit)
}
