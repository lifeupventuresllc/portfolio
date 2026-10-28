import { createServiceClient } from '@/lib/supabase/server'
import type { GrocerySection } from '@/lib/ingredients'

// "Send to my Kroger cart" (2026-10-27, Asa: yes, build it). Her week's
// grocery list goes into HER OWN Kroger-family cart (Kroger, Ralphs,
// Mariano's, Fred Meyer, King Soopers…) through MealMe's self-serve API.
// She checks out on Kroger's site. The first time, Kroger asks her to sign in
// (MealMe owns that login; we never see it).
//
// Cost: MealMe bills $0.10 per successful call. So: the store and every
// product match are cached on her profile, salt/oil/spices and "to taste"
// lines are skipped, and a list she already sent this week isn't sent twice.

const BASE = 'https://mealmeai.vercel.app'
const MAX_ITEMS = 24
const ITEM_TTL_DAYS = 30

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any

export class MealMeError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message) }
}

async function mm(path: string, init: { method?: string; body?: unknown } = {}): Promise<Json> {
  const key = process.env.MEALME_API_KEY
  if (!key) throw new MealMeError(500, 'not_configured', 'Grocery ordering is not set up yet.')
  const res = await fetch(`${BASE}${path}`, {
    method: init.method || 'GET',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new MealMeError(res.status, String(body?.error || body?.code || res.status), String(body?.message || `MealMe error ${res.status}`))
  return body
}

/** The first array of objects in a response (products / items / results / data). */
function listIn(body: Json): Json[] {
  if (Array.isArray(body)) return body
  for (const k of ['products', 'items', 'results', 'data', 'stores', 'catalog']) if (Array.isArray(body?.[k])) return body[k]
  for (const v of Object.values(body || {})) if (Array.isArray(v) && v.length && typeof v[0] === 'object') return v as Json[]
  return []
}
const pick = (o: Json, keys: string[]): string | null => {
  for (const k of keys) { const v = o?.[k] ?? o?.raw?.[k]; if (v != null && v !== '') return String(v) }
  return null
}

// ---- what goes in the cart -------------------------------------------------

const STAPLE = /\b(salt|black pepper|ground pepper|spices?|seasoning|garlic powder|onion powder|chili powder|cumin|paprika|oregano|cinnamon|chili flakes|red pepper flakes|dried thyme|dried rosemary|dried basil|vanilla|baking soda|baking powder|cooking spray|olive oil|avocado oil|vegetable oil|canola oil|water|ice)\b/i

export type CartLine = { item: string; amount: string }

/** Her week's list → the lines worth buying (no staples, no "to taste"). */
export function cartLines(grocery: GrocerySection[]): CartLine[] {
  const out: CartLine[] = []
  for (const sec of grocery || []) {
    for (const it of sec.items || []) {
      if (!it?.item || /to taste/i.test(it.amount || '')) continue
      if (STAPLE.test(it.item)) continue
      out.push({ item: it.item, amount: it.amount })
    }
  }
  return out.slice(0, MAX_ITEMS)
}

/** A plain store search term ("93/7 ground turkey" → "ground turkey 93/7"
 * stays as is; parentheses and "lean" percents trimmed). */
function searchTerm(item: string): string {
  return item.replace(/\([^)]*\)/g, '').replace(/\s{2,}/g, ' ').trim()
}

// ---- her saved Kroger state (fos_profile.preferences.kroger) ----------------

type KrogerPrefs = {
  zip?: string
  store?: { id: string; name: string; address: string }
  items?: Record<string, { id: string; name: string; at: string } | null>   // term → match (null = none at that store)
  sent?: { week: string; hash: string; checkoutUrl: string; added: number; missing: string[] }
}

async function readKroger(enrollmentId: string): Promise<KrogerPrefs> {
  const svc = createServiceClient()
  const { data } = await svc.from('fos_profile').select('preferences').eq('enrollment_id', enrollmentId).maybeSingle()
  return ((data?.preferences as Record<string, unknown> | null)?.kroger || {}) as KrogerPrefs
}

async function writeKroger(enrollmentId: string, k: KrogerPrefs): Promise<void> {
  const svc = createServiceClient()
  const { data: row } = await svc.from('fos_profile').select('preferences').eq('enrollment_id', enrollmentId).maybeSingle()
  const prefs = { ...((row?.preferences as Record<string, unknown>) || {}), kroger: k }
  const now = new Date().toISOString()
  if (row) await svc.from('fos_profile').update({ preferences: prefs, updated_at: now }).eq('enrollment_id', enrollmentId)
  else await svc.from('fos_profile').insert({ enrollment_id: enrollmentId, preferences: prefs, updated_at: now })
}

export async function krogerState(enrollmentId: string) {
  const k = await readKroger(enrollmentId)
  return { zip: k.zip || null, store: k.store || null, sent: k.sent || null }
}

function hashLines(lines: CartLine[]): string {
  let h = 7
  for (const ch of lines.map((l) => `${l.item}|${l.amount}`).join(';')) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h.toString(36)
}

// ---- the send ---------------------------------------------------------------

export type SendResult =
  | { status: 'sent'; checkoutUrl: string; added: number; missing: string[]; store: string; again?: boolean }
  | { status: 'login'; loginUrl: string; store: string }
  | { status: 'no_store' }
  | { status: 'error'; message: string }

async function findStore(zip: string): Promise<KrogerPrefs['store'] | null> {
  for (const miles of [10, 25]) {
    const body = await mm(`/api/stores/search?providerId=kroger&merchantType=grocery&zipCode=${encodeURIComponent(zip)}&radiusInMiles=${miles}&limit=3`)
    const s = listIn(body)[0]
    if (s) {
      const id = pick(s, ['providerLocationId', 'locationId', 'id'])
      if (id) return { id, name: pick(s, ['name', 'chain']) || 'Kroger', address: pick(s, ['address']) || '' }
    }
  }
  return null
}

async function matchItem(locationId: string, term: string): Promise<{ id: string; name: string } | null> {
  try {
    const body = await mm(`/api/catalog/search?providerId=kroger&locationId=${encodeURIComponent(locationId)}&query=${encodeURIComponent(term)}&limit=5`)
    const p = listIn(body)[0]
    if (!p) return null
    const id = pick(p, ['providerItemId', 'productId', 'upc', 'id'])
    return id ? { id, name: pick(p, ['name', 'description', 'title']) || term } : null
  } catch (e) {
    if (e instanceof MealMeError && e.code === 'product_not_found') return null
    throw e
  }
}

/** Runs `fn` over `xs`, a few at a time (MealMe rate-limits per account). */
async function pool<T, R>(xs: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(xs.length)
  let i = 0
  await Promise.all(Array.from({ length: Math.min(n, xs.length) }, async () => {
    while (i < xs.length) { const k = i++; out[k] = await fn(xs[k]) }
  }))
  return out
}

export async function sendToKroger(opts: {
  enrollmentId: string
  grocery: GrocerySection[]
  week: string                // her local Monday, YYYY-MM-DD
  zip?: string | null
  returnTo: string            // where Kroger's sign-in sends her back
  force?: boolean             // send again even if this week's list already went
}): Promise<SendResult> {
  const k = await readKroger(opts.enrollmentId)
  const zip = (opts.zip || k.zip || '').trim()
  if (!/^\d{5}$/.test(zip)) return { status: 'error', message: 'Add your ZIP code first.' }
  const lines = cartLines(opts.grocery)
  if (!lines.length) return { status: 'error', message: 'No groceries on your list this week yet.' }
  const hash = hashLines(lines)

  // Already sent this exact list this week → hand back her cart (no new calls).
  if (!opts.force && k.sent && k.sent.week === opts.week && k.sent.hash === hash && k.store) {
    return { status: 'sent', checkoutUrl: k.sent.checkoutUrl, added: k.sent.added, missing: k.sent.missing, store: k.store.name, again: true }
  }

  try {
    let store = k.zip === zip ? k.store : undefined
    if (!store) {
      store = (await findStore(zip)) || undefined
      if (!store) { await writeKroger(opts.enrollmentId, { ...k, zip, store: undefined }); return { status: 'no_store' } }
      k.items = {}   // new store → old matches don't apply
    }
    k.zip = zip
    k.store = store
    const items = k.items || {}
    const fresh = (iso: string) => Date.now() - new Date(iso).getTime() < ITEM_TTL_DAYS * 86400000

    // 1. Match each line at her store (cached).
    const matches = await pool(lines, 4, async (l) => {
      const term = searchTerm(l.item)
      const hit = items[term]
      if (hit && fresh(hit.at)) return { line: l, m: hit }
      if (hit === null) return { line: l, m: null }
      const m = await matchItem(store!.id, term)
      items[term] = m ? { ...m, at: new Date().toISOString() } : null
      return { line: l, m }
    })
    k.items = items
    await writeKroger(opts.enrollmentId, k)

    const found = matches.filter((x) => x.m) as { line: CartLine; m: { id: string; name: string } }[]
    const missing = matches.filter((x) => !x.m).map((x) => x.line.item)
    if (!found.length) return { status: 'error', message: `${store.name} didn't have these items. Try another ZIP.` }

    // 2. Her cart. The first add tells us if Kroger needs her to sign in.
    const cart = await mm('/api/carts', { method: 'POST', body: { providerId: 'kroger', externalCustomerId: opts.enrollmentId, locationId: store.id } })
    const cartId = pick(cart, ['cartId', 'id']) || pick(cart?.cart, ['cartId', 'id'])
    if (!cartId) return { status: 'error', message: 'Kroger cart could not be made. Try again in a minute.' }
    const add = (id: string) => mm(`/api/carts/${encodeURIComponent(cartId)}/items`, { method: 'POST', body: { providerItemId: id, quantity: 1, modality: 'PICKUP', externalCustomerId: opts.enrollmentId } })
    try {
      await add(found[0].m.id)
    } catch (e) {
      if (e instanceof MealMeError && (e.status === 409 || e.code === 'kroger_customer_auth_required')) {
        const o = await mm('/api/kroger/oauth/start', { method: 'POST', body: { externalCustomerId: opts.enrollmentId, redirectAfter: opts.returnTo } })
        const loginUrl = pick(o, ['url', 'authorizationUrl', 'authUrl', 'oauthUrl', 'redirectUrl'])
        if (!loginUrl) return { status: 'error', message: 'Kroger sign-in could not start. Try again.' }
        return { status: 'login', loginUrl, store: store.name }
      }
      throw e
    }
    const rest = await pool(found.slice(1), 3, async (x) => { try { await add(x.m.id); return true } catch { return false } })
    const failed = found.slice(1).filter((_, i) => !rest[i]).map((x) => x.line.item)

    // 3. The checkout link on Kroger's site.
    const co = await mm(`/api/carts/${encodeURIComponent(cartId)}/checkout`, { method: 'POST', body: {} })
    const checkoutUrl = pick(co, ['checkoutUrl', 'url', 'link']) || 'https://www.kroger.com/cart'
    const allMissing = [...missing, ...failed]
    k.sent = { week: opts.week, hash, checkoutUrl, added: found.length - failed.length, missing: allMissing }
    await writeKroger(opts.enrollmentId, k)
    return { status: 'sent', checkoutUrl, added: k.sent.added, missing: allMissing, store: store.name }
  } catch (e) {
    console.error('kroger send error', e instanceof MealMeError ? `${e.status} ${e.code} ${e.message}` : e)
    if (e instanceof MealMeError && e.status === 429) return { status: 'error', message: 'Kroger is busy. Try again in a minute.' }
    if (e instanceof MealMeError && e.code === 'restaurant_not_found') return { status: 'no_store' }
    return { status: 'error', message: e instanceof MealMeError ? e.message : 'Something went wrong. Try again.' }
  }
}
