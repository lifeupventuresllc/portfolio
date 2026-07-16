// Accurate nutrition facts via Nutritionix (MyFitnessPal-class data: branded,
// restaurant, and whole foods). The natural-language endpoint doubles as our
// search AND voice parser — "2 eggs and toast" → real per-food macros.
// Accuracy is the whole point: these numbers come from a verified database,
// NOT an AI guess. The Claude fallback (lib nearby) is clearly labeled "estimated".

export type FoodResult = {
  name: string
  brand: string | null
  servings: number
  serving_label: string | null
  calories: number
  protein_g: number
  carbs_g: number
  fats_g: number
  source: 'nutritionix' | 'estimated'
  photo?: string | null
}

const NX_BASE = 'https://trackapi.nutritionix.com/v2'
const round = (v: unknown) => Math.round(Number(v) || 0)

export function nutritionixConfigured(): boolean {
  return !!(process.env.NUTRITIONIX_APP_ID && process.env.NUTRITIONIX_APP_KEY)
}

function headers() {
  return {
    'x-app-id': process.env.NUTRITIONIX_APP_ID || '',
    'x-app-key': process.env.NUTRITIONIX_APP_KEY || '',
    'Content-Type': 'application/json',
  }
}

// Natural-language nutrients: accurate macros for a typed OR spoken food/description.
export async function nutritionixNaturalNutrients(query: string): Promise<FoodResult[]> {
  if (!nutritionixConfigured() || !query.trim()) return []
  const res = await fetch(`${NX_BASE}/natural/nutrients`, {
    method: 'POST', headers: headers(), body: JSON.stringify({ query: query.trim() }), cache: 'no-store',
  })
  if (!res.ok) return []
  const data = await res.json().catch(() => null)
  const foods = Array.isArray(data?.foods) ? data.foods : []
  return foods.map((f: Record<string, unknown>) => ({
    name: String(f.food_name || 'Food'),
    brand: (f.brand_name as string) || null,
    servings: Number(f.serving_qty) || 1,
    serving_label: (f.serving_unit as string) || null,
    calories: round(f.nf_calories),
    protein_g: round(f.nf_protein),
    carbs_g: round(f.nf_total_carbohydrate),
    fats_g: round(f.nf_total_fat),
    source: 'nutritionix' as const,
    photo: ((f.photo as Record<string, unknown>)?.thumb as string) || null,
  }))
}

// Instant autocomplete — fast name suggestions (branded items carry a nix_item_id
// we resolve to accurate macros on tap).
export type Suggestion = { name: string; brand: string | null; nix_item_id: string | null; photo: string | null }
export async function nutritionixInstant(query: string): Promise<Suggestion[]> {
  if (!nutritionixConfigured() || !query.trim()) return []
  const res = await fetch(`${NX_BASE}/search/instant?query=${encodeURIComponent(query.trim())}`, { headers: headers(), cache: 'no-store' })
  if (!res.ok) return []
  const data = await res.json().catch(() => null)
  const common = (Array.isArray(data?.common) ? data.common : []).slice(0, 6).map((c: Record<string, unknown>) => ({
    name: String(c.food_name), brand: null, nix_item_id: null, photo: ((c.photo as Record<string, unknown>)?.thumb as string) || null,
  }))
  const branded = (Array.isArray(data?.branded) ? data.branded : []).slice(0, 8).map((b: Record<string, unknown>) => ({
    name: String(b.food_name), brand: (b.brand_name as string) || null, nix_item_id: (b.nix_item_id as string) || null, photo: ((b.photo as Record<string, unknown>)?.thumb as string) || null,
  }))
  return [...common, ...branded]
}

// Resolve a branded item id → accurate macros.
export async function nutritionixItem(nixItemId: string): Promise<FoodResult | null> {
  if (!nutritionixConfigured() || !nixItemId) return null
  const res = await fetch(`${NX_BASE}/search/item?nix_item_id=${encodeURIComponent(nixItemId)}`, { headers: headers(), cache: 'no-store' })
  if (!res.ok) return null
  const data = await res.json().catch(() => null)
  const f = Array.isArray(data?.foods) ? data.foods[0] : null
  if (!f) return null
  return {
    name: String(f.food_name || 'Food'), brand: (f.brand_name as string) || null,
    servings: Number(f.serving_qty) || 1, serving_label: (f.serving_unit as string) || null,
    calories: round(f.nf_calories), protein_g: round(f.nf_protein), carbs_g: round(f.nf_total_carbohydrate), fats_g: round(f.nf_total_fat),
    source: 'nutritionix', photo: ((f.photo as Record<string, unknown>)?.thumb as string) || null,
  }
}
