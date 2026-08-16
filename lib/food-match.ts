// ============================================================
// Matches her intake free-text food answers ("no mushrooms, dairy-free" /
// "chicken, rice bowls, tacos") against the real per-recipe ingredient data
// in cookbook-ingredients.ts — not just recipe names, so "no mushrooms" can
// exclude a dish that has mushrooms in it without "mushroom" being in the
// dish's own title. Used by the auto-build picker and the manual browse list
// in MealBuilder so both actually reflect what she told us at intake, instead
// of that answer being write-only.
// ============================================================
import { COOKBOOK_INGREDIENTS, type Aisle } from './cookbook-ingredients'
import type { Recipe } from './recipes'

// A few common restriction words map onto a whole ingredient AISLE rather than
// one literal word — "dairy-free" should catch "cheese"/"milk"/"yogurt" etc.,
// not just recipes containing the literal substring "dairy". Substring
// matching (below) still runs for everything else, including anything not in
// this small map (e.g. "no mushrooms" matches the literal ingredient word).
const AISLE_SYNONYMS: Record<string, Aisle> = {
  dairy: 'Dairy',
}

function cleanTerm(raw: string): string {
  let t = raw.toLowerCase().trim()
  t = t.replace(/^no\s+/, '').replace(/-free$/, '').replace(/\s+free$/, '')
  t = t.replace(/s$/, '') // light singularization: "mushrooms"→"mushroom", "tacos"→"taco"
  return t.trim()
}

function tokenize(text: string | null | undefined): string[] {
  if (!text) return []
  return text
    .split(/[,+&\n]| and /i)
    .map(cleanTerm)
    .filter((t) => t.length > 1)
}

function ingredientItemsFor(recipeName: string) {
  return COOKBOOK_INGREDIENTS.find((r) => r.name === recipeName)?.ingredients || []
}

function recipeMatchesTerm(recipe: Recipe, term: string): boolean {
  if (!term) return false
  const ingredients = ingredientItemsFor(recipe.name)
  const aisle = AISLE_SYNONYMS[term]
  if (aisle && ingredients.some((i) => i.aisle === aisle)) return true
  const haystack = (recipe.name + ' ' + ingredients.map((i) => i.item).join(' ')).toLowerCase()
  return haystack.includes(term)
}

// Excludes any recipe matching a disliked/allergen term — safety-first, so
// this is a hard exclude, not a deprioritize, wherever it's applied.
export function excludeDisliked<T extends Recipe>(recipes: T[], dislikesText: string | null | undefined): T[] {
  const terms = tokenize(dislikesText)
  if (!terms.length) return recipes
  return recipes.filter((r) => !terms.some((t) => recipeMatchesTerm(r, t)))
}

// Soft boost, not a filter — recipes matching her stated preferences sort
// first; everything else stays available, just lower in the list. Stable
// sort keeps the pool's existing order within each tier (e.g. still
// protein-sorted inside "matches" and inside "doesn't match").
export function rankByPreference<T extends Recipe>(recipes: T[], preferencesText: string | null | undefined): T[] {
  const terms = tokenize(preferencesText)
  if (!terms.length) return recipes
  const matches = (r: T) => terms.some((t) => recipeMatchesTerm(r, t))
  return [...recipes].sort((a, b) => Number(matches(b)) - Number(matches(a)))
}
