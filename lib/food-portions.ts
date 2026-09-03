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
// Expanded 2026-09-03 (Asa's catch: "this isn't just for eggs, right?") —
// the original 12-food list only covered the exact staples a beta tester
// happened to test with. Added every other genuinely single-countable
// whole food common enough to log by count rather than weight. Deliberately
// still NOT volumetric ("a cup of rice") — those need a different fix
// (a real per-food density/serving lookup), not a piece-count guess, and
// guessing one wrong is worse than admitting the gap (see
// FoodLog.tsx's "no piece size for this food" hint for anything not here).
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
  { match: /\bsweet potato\b/i, grams: 130, label: 'sweet potato' },
  { match: /\bpotato\b/i, grams: 173, label: 'potato' },
  { match: /strawberr/i, grams: 12, label: 'strawberry' },
  { match: /\bcookie\b/i, grams: 16, label: 'cookie' },
  { match: /pancake/i, grams: 38, label: 'pancake' },
  { match: /waffle/i, grams: 33, label: 'waffle' },
  { match: /hot dog|frankfurter/i, grams: 45, label: 'hot dog' },
  { match: /sausage link|breakfast sausage/i, grams: 27, label: 'link' },
  { match: /\bbagel\b/i, grams: 105, label: 'bagel' },
  { match: /english muffin/i, grams: 57, label: 'muffin' },
  { match: /string cheese/i, grams: 28, label: 'stick' },
  { match: /cheese slice|slice.*cheese/i, grams: 21, label: 'slice' },
  { match: /\bshrimp\b/i, grams: 8, label: 'shrimp' },
  { match: /meatball/i, grams: 28, label: 'meatball' },
  { match: /\bsausage\b/i, grams: 68, label: 'sausage' },
  { match: /hamburger bun|hot dog bun/i, grams: 43, label: 'bun' },
  { match: /granola bar|protein bar/i, grams: 40, label: 'bar' },
  { match: /\btaco\b/i, grams: 102, label: 'taco' },
]

export function pieceWeightFor(foodName: string): { grams: number; label: string } | null {
  for (const p of PIECE_WEIGHTS_G) {
    if (p.match.test(foodName)) return { grams: p.grams, label: p.label }
  }
  return null
}
