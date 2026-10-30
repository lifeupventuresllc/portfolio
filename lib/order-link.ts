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
export function mealText(meal: OrderMeal): string {
  const main = meal.name.split(/[:(]|,| \+ /)[0].trim()
  return main.toLowerCase().startsWith(meal.place.toLowerCase()) ? main.slice(meal.place.length).trim() || main : main
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
    app: app === 'doordash' ? `doordash://search/store/${q}` : `ubereats://search?q=${q}`,
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
export function appFirstOn(): boolean {
  try { return localStorage.getItem(APP_FIRST_KEY) === '1' } catch { return false }
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
