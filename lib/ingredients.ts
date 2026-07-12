// ============================================================
// Life-Up Fitness — Ingredient scaling + grocery list
// Cookbook lists general servings; we scale each ingredient to
// THIS user's portion (their calories), and aggregate a weekly
// grocery list by store aisle (The Menu Blueprint's 6 categories).
// ============================================================
import { COOKBOOK_INGREDIENTS, type Aisle } from './cookbook-ingredients'

export type { Aisle }
export interface PortionIngredient { item: string; amount: string; aisle: Aisle }

interface PerServing { item: string; qty: number | null; unit: string; aisle: Aisle }

// Normalize every recipe to PER-SERVING amounts, keyed by recipe name.
const PER_SERVING: Record<string, PerServing[]> = {}
for (const r of COOKBOOK_INGREDIENTS) {
  const div = r.basis === 'total' ? (r.servings || 1) : 1
  PER_SERVING[r.name] = r.ingredients
    .filter((i) => !/mixture/i.test(i.item)) // drop derived (non-grocery) components
    .map((i) => ({ item: i.item, unit: i.unit, aisle: i.aisle, qty: i.qty == null ? null : i.qty / div }))
}

// Snacks aren't in the cookbook HTML — add their simple grocery components here (per serving).
const SNACK_INGREDIENTS: Record<string, PerServing[]> = {
  'Yoplait Protein + Mixed Berries': [
    { item: 'Yoplait Protein yogurt (5.3 oz)', qty: 1, unit: 'each', aisle: 'Dairy' },
    { item: 'mixed berries', qty: 3, unit: 'oz', aisle: 'Produce' },
  ],
  'Banana + Nut Butter (Regular)': [
    { item: 'banana', qty: 1, unit: 'each', aisle: 'Produce' },
    { item: 'nut butter', qty: 1, unit: 'tbsp', aisle: 'Pantry' },
  ],
  'Banana + Nut Butter (Large)': [
    { item: 'banana', qty: 1, unit: 'each', aisle: 'Produce' },
    { item: 'nut butter', qty: 2, unit: 'tbsp', aisle: 'Pantry' },
  ],
  'Rice Cakes + PB (Regular)': [
    { item: 'rice cakes', qty: 2, unit: 'each', aisle: 'Grains/Carbs' },
    { item: 'peanut butter', qty: 1, unit: 'tbsp', aisle: 'Pantry' },
  ],
  'Rice Cakes + PB (Large)': [
    { item: 'rice cakes', qty: 2, unit: 'each', aisle: 'Grains/Carbs' },
    { item: 'peanut butter', qty: 1.5, unit: 'tbsp', aisle: 'Pantry' },
  ],
  'Pepperoni Protein Box': [
    { item: 'turkey pepperoni', qty: 15, unit: 'each', aisle: 'Proteins' },
    { item: 'cubed cheese', qty: 1, unit: 'oz', aisle: 'Dairy' },
    { item: 'boiled eggs', qty: 2, unit: 'each', aisle: 'Proteins' },
    { item: 'olives', qty: 10, unit: 'each', aisle: 'Produce' },
    { item: 'fruit', qty: 0.5, unit: 'cup', aisle: 'Produce' },
  ],
  'Raspberry Chocolate Protein Bar': [{ item: 'protein bar', qty: 1, unit: 'each', aisle: 'Pantry' }],
  'Matcha Strawberry Yogurt Protein Clusters': [{ item: 'yogurt protein clusters', qty: 1, unit: 'each', aisle: 'Pantry' }],
}
for (const [name, ings] of Object.entries(SNACK_INGREDIENTS)) if (!PER_SERVING[name]) PER_SERVING[name] = ings

export const hasIngredients = (name: string) => Array.isArray(PER_SERVING[name]) && PER_SERVING[name].length > 0

// ============================================================
// Cost estimation (rough US grocery prices) — powers the weekly
// budget feature. Approximate; labeled "estimated" in the UI.
// ============================================================
const PREMIUM = /steak|sirloin|flank|shrimp|salmon|langostino|lobster|guanciale|bison|scallop/
function ingredientCost(i: PerServing): number {
  if (i.qty == null) return 0.05 // "to taste" staple
  let unit = i.unit, qty = i.qty
  if (unit === 'lb') { qty = qty * 16; unit = 'oz' }
  const it = i.item.toLowerCase()
  switch (i.aisle) {
    case 'Proteins':
      if (unit === 'each') return (/egg/.test(it) ? 0.25 : /pepperoni/.test(it) ? 0.08 : 0.4) * qty
      if (unit === 'slice') return 0.3 * qty
      if (unit === 'oz') return (PREMIUM.test(it) ? 0.8 : 0.4) * qty
      return 0.4 * qty
    case 'Produce':
      if (unit === 'oz') return 0.15 * qty
      if (unit === 'each') return (/olive/.test(it) ? 0.05 : 0.5) * qty
      if (unit === 'clove') return 0.1 * qty
      if (unit === 'cup') return 0.6 * qty
      return 0.3 * qty
    case 'Dairy':
      if (/yogurt/.test(it) && unit === 'each') return 1.2 * qty
      if (unit === 'oz') return (/cheese/.test(it) ? 0.3 : 0.2) * qty
      if (unit === 'cup') return 1.0 * qty
      if (unit === 'each') return 1.0 * qty
      return 0.2 * qty
    case 'Grains/Carbs':
      if (unit === 'each') return 0.4 * qty
      if (unit === 'oz') return 0.1 * qty
      if (unit === 'cup') return 0.5 * qty
      return 0.1 * qty
    case 'Sauces & Condiments':
      if (unit === 'tbsp') return 0.15 * qty
      if (unit === 'oz') return 0.1 * qty
      if (unit === 'cup') return 1.2 * qty
      if (unit === 'tsp') return 0.05 * qty
      return 0.1 * qty
    case 'Pantry':
      if (/protein bar/.test(it)) return 1.5 * qty
      if (/protein|scoop/.test(it) && (unit === 'each' || unit === 'scoop')) return 1.0 * qty
      if (unit === 'tsp') return 0.03 * qty
      if (unit === 'tbsp') return 0.1 * qty
      if (unit === 'cup') return 0.8 * qty
      if (unit === 'can') return 1.2 * qty
      if (unit === 'each') return 0.5 * qty
      return 0.1 * qty
  }
}

// Estimated $ for ONE serving of a recipe (factor 1). 0 if no ingredient data.
export function costPerServing(name: string): number {
  const ings = PER_SERVING[name]
  if (!ings) return 0
  return ings.reduce((s, i) => s + ingredientCost(i), 0)
}
export type CostTier = '$' | '$$' | '$$$'
export function costTier(name: string, budgetFlag?: boolean): CostTier | null {
  if (budgetFlag) return '$'
  const c = costPerServing(name)
  if (!c) return null
  return c < 3 ? '$' : c < 5 ? '$$' : '$$$'
}
// Estimated total grocery $ for the week from every meal occurrence (serving × portion factor).
export function estimateWeeklyCost(occurrences: { name: string; factor: number }[]): number {
  let total = 0
  for (const occ of occurrences) {
    const ings = PER_SERVING[occ.name]
    if (!ings) continue
    total += ings.reduce((s, i) => s + ingredientCost(i), 0) * occ.factor
  }
  return Math.round(total)
}

const AISLE_ORDER: Aisle[] = ['Proteins', 'Produce', 'Dairy', 'Grains/Carbs', 'Sauces & Condiments', 'Pantry']

// ---- number formatting (nice fractions) ----
const FRACTIONS: [number, string][] = [[0.125, '⅛'], [0.25, '¼'], [0.333, '⅓'], [0.5, '½'], [0.667, '⅔'], [0.75, '¾']]
function fmtNum(n: number): string {
  const whole = Math.floor(n + 1e-6)
  const frac = n - whole
  for (const [v, s] of FRACTIONS) if (Math.abs(frac - v) < 0.07) return whole > 0 ? `${whole}${s}` : s
  const r = Math.round(n * 10) / 10
  return String(r)
}
// round a qty to a sensible step for its unit
function roundFor(qty: number, unit: string): number {
  if (unit === 'each' || unit === 'slice' || unit === 'clove' || unit === 'can') return Math.max(1, Math.round(qty))
  if (unit === 'oz') return Math.max(0.5, Math.round(qty * 2) / 2)
  return Math.max(0.25, Math.round(qty * 4) / 4) // cup/tbsp/tsp/lb
}
function fmtAmount(qty: number | null, unit: string, item: string): string {
  if (qty == null || unit === 'to taste') return `${item} — to taste`
  const q = fmtNum(roundFor(qty, unit))
  if (unit === 'each' || unit === '') return `${q} ${item}`
  return `${q} ${unit} ${item}`
}

// Scaled ingredient list for ONE serving of a meal at a given portion factor.
export function portionIngredients(name: string, factor: number): PortionIngredient[] {
  const ings = PER_SERVING[name]
  if (!ings) return []
  return ings.map((i) => {
    let unit = i.unit
    let q = i.qty == null ? null : i.qty * factor
    if (unit === 'lb' && q != null) { q = q * 16; unit = 'oz' } // per-serving meats read cleaner in oz
    return { item: i.item, aisle: i.aisle, amount: fmtAmount(q, unit, i.item) }
  })
}

// ---- Weekly grocery list ----
export interface GroceryLine { item: string; amount: string; aisle: Aisle }
export interface GrocerySection { aisle: Aisle; items: GroceryLine[] }

// occurrences = every meal eaten this week with its portion factor (1 serving each)
export function buildGrocery(occurrences: { name: string; factor: number }[]): GrocerySection[] {
  const acc: Record<string, { item: string; aisle: Aisle; unit: string; qty: number | null }> = {}
  for (const occ of occurrences) {
    const ings = PER_SERVING[occ.name]
    if (!ings) continue
    for (const ing of ings) {
      let unit = ing.unit
      let qty = ing.qty
      if (unit === 'lb' && qty != null) { qty = qty * 16; unit = 'oz' } // combine weights in oz
      const key = `${ing.item}|${qty == null ? 'taste' : unit}`
      if (!acc[key]) acc[key] = { item: ing.item, aisle: ing.aisle, unit: qty == null ? 'to taste' : unit, qty: qty == null ? null : 0 }
      if (qty != null && acc[key].qty != null) acc[key].qty! += qty * occ.factor
    }
  }
  const linesByAisle: Record<Aisle, GroceryLine[]> = {
    'Proteins': [], 'Produce': [], 'Dairy': [], 'Grains/Carbs': [], 'Sauces & Condiments': [], 'Pantry': [],
  }
  for (const k of Object.keys(acc)) {
    const a = acc[k]
    let amount: string
    if (a.qty == null) amount = 'to taste'
    else if (a.unit === 'oz' && a.qty >= 16) amount = `${fmtNum(Math.round((a.qty / 16) * 10) / 10)} lb`
    else amount = `${fmtNum(roundFor(a.qty, a.unit))} ${a.unit}`
    linesByAisle[a.aisle].push({ item: a.item, amount, aisle: a.aisle })
  }
  return AISLE_ORDER
    .map((aisle) => ({ aisle, items: linesByAisle[aisle].sort((x, y) => x.item.localeCompare(y.item)) }))
    .filter((s) => s.items.length > 0)
}
