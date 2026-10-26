// ============================================================
// "Order exactly this" (2026-10-26, Asa's approved mockup OrderExact/OrderDone).
// The delivery link only lands on the restaurant, so she rebuilds the meal
// herself there — and our calorie log only matches if she orders the exact
// thing we counted. This turns the verified order string (lib/chain-menu) into
// the parts she taps off one by one, names the usual add-ons to skip, and
// lists the honest add-on amounts for "Got something different?".
// ============================================================

// How-to-order bits after a comma ("no sauce", "all veggies") — anything else
// after a comma is part of the name ("Spinach, Feta & Egg White Wrap").
const MOD = /^(no|light|extra|double|add|half|all|with|without|keep|sub)\b/i
// A size in parentheses stays on the name: "Grilled Nuggets (8 ct)".
const SIZE = /^\d|\b(ct|piece|pc|oz)\b/i

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Split on " + " only outside parentheses. */
function splitTop(s: string): string[] {
  const out: string[] = []
  let depth = 0, cur = ''
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (ch === '(') depth++
    if (ch === ')') depth = Math.max(0, depth - 1)
    if (depth === 0 && s.startsWith(' + ', i)) { out.push(cur); cur = ''; i += 2; continue }
    cur += ch
  }
  out.push(cur)
  // A one-word piece is part of a menu name, not its own item: Cava's
  // "Steak + Harissa Bowl" stays one line.
  const pieces = out.map((p) => p.trim()).filter(Boolean)
  return pieces.reduce<string[]>((acc, p) => {
    const prev = acc[acc.length - 1]
    if (prev != null && !/\s/.test(prev) && !/[()]/.test(prev)) acc[acc.length - 1] = `${prev} + ${p}`
    else acc.push(p)
    return acc
  }, [])
}

/**
 * "Chicken Bowl (no rice): black beans, fajita veggies, cheese"
 *   → ["Chicken Bowl", "No rice", "Black beans", "Fajita veggies", "Cheese"]
 * "2 Chicken Fingers + Coleslaw, no sauce" → ["2 Chicken Fingers", "Coleslaw", "No sauce"]
 * An item with no parts is just its name (and size).
 */
export function orderParts(order: string): string[] {
  const colon = order.indexOf(':')
  const head = colon >= 0 ? order.slice(0, colon) : order
  const tail = colon >= 0 ? order.slice(colon + 1).split(',').map((p) => p.trim()).filter(Boolean) : []
  const out: string[] = []
  for (const piece of splitTop(head)) {
    const notes: string[] = []
    const base = piece.replace(/\s*\(([^)]*)\)/g, (m, inner: string) => {
      if (SIZE.test(inner)) return m
      notes.push(...inner.split(/\s*(?:,|\s\+\s)\s*/).filter((n) => n && !/^build your own$/i.test(n)))
      return ''
    }).trim()
    const segs = base.split(/,\s*/)
    let name = segs[0]
    const mods: string[] = []
    for (const seg of segs.slice(1)) {
      if (MOD.test(seg)) mods.push(seg)
      else if (mods.length === 0) name += `, ${seg}`
      else mods.push(seg)
    }
    out.push(name, ...notes, ...mods)
  }
  out.push(...tail)
  const seen = new Set<string>()
  return out.map((p) => cap(p.trim())).filter((p) => p && !seen.has(p.toLowerCase()) && seen.add(p.toLowerCase()))
}

// The usual add-ons that quietly blow the number, per chain. Plain names only —
// "They add 100–500 cal" is the honest range, never a made-up exact number.
const SKIP: Record<string, string> = {
  Chipotle: 'sour cream, queso, guac, chips',
  Sweetgreen: 'extra dressing, bread',
  'Chick-fil-A': 'sauces, upsizing the fries',
  'Taco Bell': 'extra cheese, sour cream, chips',
  "McDonald's": 'fries, sauces, a soda',
  "Raising Cane's": "Cane's sauce, Texas toast, fries",
  Panera: 'the bread or chips side, extra dressing',
  Cava: 'pita chips, extra sauces',
  Subway: 'cheese, creamy sauces, chips',
  "Wendy's": 'fries, extra dressing',
  Starbucks: 'a sweet drink, a pastry',
  'Panda Express': 'rice or chow mein in place of the greens, extra sauce',
}
export function skipLine(place: string): string {
  return SKIP[place] || 'extra sauces, sides, upsizing'
}

// "Added something" chips. Chain numbers ONLY where lib/chain-menu already
// cites the chain's own source for them (Chipotle's per-ingredient numbers,
// Cane's sauce); everything else is a plain estimate, labeled as one.
export interface AddOn { key: string; label: string; cal: number; protein?: number; official: boolean }
const OFFICIAL: Record<string, AddOn[]> = {
  Chipotle: [
    { key: 'cmg-chicken', label: 'Extra chicken', cal: 180, protein: 32, official: true },
    { key: 'cmg-rice', label: 'Rice', cal: 210, official: true },
    { key: 'cmg-beans', label: 'Beans', cal: 130, official: true },
    { key: 'cmg-cheese', label: 'Cheese', cal: 110, official: true },
  ],
  "Raising Cane's": [{ key: 'canes-sauce', label: "Cane's sauce", cal: 190, official: true }],
}
export const GENERIC_ADDONS: AddOn[] = [
  { key: 'side', label: 'Small side', cal: 250, official: false },
  { key: 'drink', label: 'Drink', cal: 200, official: false },
  { key: 'sauce', label: 'Sauce or dressing', cal: 100, official: false },
  { key: 'dessert', label: 'Dessert', cal: 350, official: false },
]
export function chainAddOns(place: string): AddOn[] {
  return OFFICIAL[place] || []
}

// What she pastes into the delivery app's search bar (2026-10-26, Asa: "copy
// it into DoorDash or Uber Eats and it goes directly to the restaurant and
// the food item"): the restaurant + the main item — "Chipotle Chicken Bowl".
// Tested live: putting the item in DoorDash's search link pushed another
// restaurant to the top, so the link keeps just the restaurant and this
// rides on the clipboard.
export function pasteText(place: string, order: string): string {
  const main = orderParts(order)[0] || order
  return main.toLowerCase().startsWith(place.toLowerCase()) ? main : `${place} ${main}`
}

/** Copy inside the tap. Clipboard API first; old-browser fallback is a hidden textarea. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true }
  } catch { /* fall through */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0'
    document.body.appendChild(ta)
    ta.select()
    ta.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch { return false }
}
