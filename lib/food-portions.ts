// Real fix for the "2 eggs = 0 calories" bug (beta feedback Priority 2,
// 2026-08-25). Root cause, confirmed by direct testing: USDA's /foods/search
// endpoint only ever returns macros per 100g, and FoodLog's quantity field
// had no way to express "2 eggs" — only grams/oz. Someone typing "2" meaning
// "2 eggs" was actually logging 2 GRAMS of egg (~143 kcal/100g × 0.02 ≈ 3
// kcal, rounding to 0 for lower-calorie foods). The USDA /food/{fdcId} detail
// endpoint that would give a real per-food gram-per-piece conversion 404s
// under this API key/plan (verified live, not assumed) — not a general fix
// available to us right now — so this covers the common countable foods a
// beta tester actually logs by name/count, verified against USDA's own
// per-100g values. Matched by keyword against the food's name; anything not
// listed here falls back to grams/oz only rather than guessing a wrong
// conversion (see FoodLog.tsx's pieceWeightFor usage).
const PIECE_WEIGHTS_G: { match: RegExp; grams: number; label: string }[] = [
  { match: /\begg\b/i, grams: 50, label: 'egg' },
  { match: /banana/i, grams: 118, label: 'banana' },
  { match: /\bapple\b/i, grams: 182, label: 'apple' },
  { match: /\borange\b/i, grams: 131, label: 'orange' },
  { match: /slice.*bread|bread.*slice|\bbread\b/i, grams: 28, label: 'slice' },
  { match: /tortilla/i, grams: 45, label: 'tortilla' },
  { match: /chicken breast/i, grams: 172, label: 'breast' },
  { match: /\bbacon\b/i, grams: 8, label: 'slice' },
  { match: /\btoast\b/i, grams: 28, label: 'slice' },
  { match: /\bavocado\b/i, grams: 150, label: 'avocado' },
  { match: /\bpotato\b/i, grams: 173, label: 'potato' },
  { match: /\bsweet potato\b/i, grams: 130, label: 'sweet potato' },
]

export function pieceWeightFor(foodName: string): { grams: number; label: string } | null {
  for (const p of PIECE_WEIGHTS_G) {
    if (p.match.test(foodName)) return { grams: p.grams, label: p.label }
  }
  return null
}
