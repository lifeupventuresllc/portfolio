// ============================================================
// One place that turns a suggested meal into an order link (2026-10-30,
// Asa's spec: tap the meal once, then tap order). Swap in MealMe's full
// package here later without touching the Nutrition screen.
//
// Order of attempts — the first that exists wins:
//   a. 'item'   — a direct link to the exact menu item (MealMe full API; none yet)
//   b. 'store'  — the restaurant's own DoorDash / Uber Eats page (none on file yet)
//   c. 'search' — the delivery site's search with "<restaurant> <meal>" already typed
//
// Each result has an app link (opens the installed app) and a web link (the
// fallback). Web links go through our own /api/go hop: on an iPhone that
// opens the website (which honors the search) instead of handing the link to
// the app, which ignored it in Asa's 2026-10-28 test. Whether the app-first
// links land on the search is still to be tested on a real phone — the
// screen tries them only when "app first" is switched on (debug panel).
// ============================================================

import { orderParts } from '@/lib/order-exact'

export type OrderApp = 'doordash' | 'ubereats'
export const ORDER_APP_LABEL: Record<OrderApp, string> = { doordash: 'DoorDash', ubereats: 'Uber Eats' }

export interface OrderMeal { place: string; name: string; key?: string }
export interface OrderLink {
  method: 'item' | 'store' | 'search'
  web: string            // always works
  app: string | null     // the app's own link, tried first when app-first is on
  copy: string           // what to paste if nothing opens
}

// a. Exact menu-item links, keyed by meal key — filled by MealMe's full API later.
const ITEM_LINKS: Partial<Record<OrderApp, Record<string, string>>> = {}
// b. Store pages by restaurant name — needs each chain's store link near her (none yet).
const STORE_LINKS: Partial<Record<OrderApp, Record<string, string>>> = {}

/** The meal on its own: "Cobb Salad: no croutons" → "Cobb Salad". What she
 *  pastes into the restaurant's own menu search box in DoorDash. */
// Where a chain's delivery menu names the item differently from the order
// (Chipotle sells "Burrito Bowl"; the protein is picked inside it).
const MENU_NAME: [RegExp, RegExp, string][] = [
  [/^chipotle$/i, /bowl/i, 'Burrito Bowl'],
  [/^chipotle$/i, /burrito/i, 'Burrito'],
]

export function mealText(meal: OrderMeal): string {
  for (const [place, order, name] of MENU_NAME) if (place.test(meal.place) && order.test(meal.name)) return name
  // The main menu item, kept whole ("Spinach, Feta & Egg White Wrap"), without
  // "+ Fruit Cup" or how-to-order notes.
  let main = (orderParts(meal.name)[0] || meal.name).trim()
  if (main.toLowerCase().startsWith(meal.place.toLowerCase())) main = main.slice(meal.place.length).trim() || main
  // What she pastes must match the delivery app's menu NAME (2026-11-02, Asa:
  // "Half Smokehouse BBQ Chicken" found nothing; Panera's item is "Smokehouse
  // BBQ Chicken" and Half is picked after). Sizes, counts, bread and dressing
  // are chosen on the item, so they come off the search words.
  main = main
    .replace(/\s*\(\d+\s*(ct|pc|piece|count)\)/gi, '')
    .replace(/^(half|whole|cup of|bowl of|cup|small|medium|large|kids'?|footlong|6"|6-inch|12"|1\/2)\s+/i, '')
    .replace(/^\d+\s*(pc\.?|piece)?\s+(?=[A-Za-z])/i, '')
    .replace(/\s+on\s+(multigrain|wheat|italian|white|flatbread|artisan|hearty)\b.*$/i, '')
    .replace(/\s+(without|no)\s+(dressing|sauce|cheese|rice)\b.*$/i, '')
    .replace(/\s*\+\s*(apple slices|fruit cup|side salad|coleslaw|[a-z ]*side)$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return main || meal.name
}
/** Kept for the "nothing opened" fallback: restaurant + meal. */
export function searchText(meal: OrderMeal): string {
  const main = mealText(meal)
  return `${meal.place} ${main}`
}

export function orderLink(meal: OrderMeal, app: OrderApp): OrderLink {
  // Tested live 2026-10-30: searching "<restaurant> <meal>" can push another
  // place above hers ("Simply Salad" over Wendy's), and her restaurant's page
  // doesn't remember the meal anyway. So the link searches the RESTAURANT
  // (hers lands on top), and the MEAL is copied for its menu search box.
  const copy = mealText(meal)
  const item = meal.key ? ITEM_LINKS[app]?.[meal.key] : undefined
  if (item) return { method: 'item', web: item, app: null, copy }
  const store = STORE_LINKS[app]?.[meal.place]
  if (store) return { method: 'store', web: store, app: null, copy }
  const q = encodeURIComponent(meal.place)
  return {
    method: 'search',
    web: `/api/go?app=${app}&q=${q}`,
    // Uber Eats' app link isn't tested yet — it keeps the website until it is.
    app: app === 'doordash' ? `doordash://search/store/${q}` : null,
    copy,
  }
}

// ---- "Yes" on a meal-time offer (Prompt 3, 2026-10-30) -------------------
// THE one swap point for "if we get full ordering access later, Yes places
// the order instead". Today ORDERING_LIVE is false, so Yes always opens her
// delivery app on that meal (the link above). When MealMe's full ordering is
// connected: fill ITEM_LINKS, implement placeOrder() below, flip
// ORDERING_LIVE — the offer page, the notification and the API all follow.
// Never called without her Yes: the only callers are the Yes paths of
// /api/plan/offer/[id] and the offer page.
export const ORDERING_LIVE = false

export type YesAction = { kind: 'open'; link: OrderLink } | { kind: 'place'; link: OrderLink }
export function yesAction(meal: OrderMeal, app: OrderApp): YesAction {
  const link = orderLink(meal, app)
  return ORDERING_LIVE && link.method === 'item' ? { kind: 'place', link } : { kind: 'open', link }
}

/** Places the order through the ordering partner. Not connected yet: it
 *  never orders and never charges, and says so (placed: false). */
export async function placeOrder(meal: OrderMeal, app: OrderApp): Promise<{ placed: boolean; note: string }> {
  void meal; void app
  return { placed: false, note: 'Ordering is not connected yet.' }
}

/** Debug switch (Asa testing on his phone): try the installed app first. */
export const APP_FIRST_KEY = 'luf_order_app_first'
// ON by default since 2026-11-02: Asa's iPhone test opened the DoorDash app
// right on the search ("Panera"), where she's already signed in. The debug
// switch can still turn it off on one phone ('0').
export function appFirstOn(): boolean {
  try { return localStorage.getItem(APP_FIRST_KEY) !== '0' } catch { return true }
}

/**
 * Open it, inside the tap. App-first: try the app link; if the page is still
 * showing after 1.4 s (no app, or it didn't open), open the website instead.
 * Returns false if the browser blocked everything — the screen then shows
 * the copy fallback ("Open DoorDash, tap Search, paste.").
 */
export function openOrder(link: OrderLink, appFirst: boolean): boolean {
  if (appFirst && link.app) {
    let left = false
    const onHide = () => { left = true }
    document.addEventListener('visibilitychange', onHide, { once: true })
    window.location.href = link.app
    setTimeout(() => {
      document.removeEventListener('visibilitychange', onHide)
      if (!left && document.visibilityState === 'visible') window.location.href = link.web
    }, 1400)
    return true
  }
  // No 'noopener' feature here: with it window.open always returns null, so
  // a block couldn't be told apart from success. Cut the opener by hand.
  const w = window.open(link.web, '_blank')
  if (w) { try { w.opener = null } catch { /* ignore */ } return true }
  return false
}
