import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Protected one-off probe for the MealMe API key (search + menu only, never
// carts/orders/checkout). MealMe bills $0.10 per successful call, so each
// request here makes at most 2 calls (store search, then optional menu search).
//
// Current MealMe API (console at mealmeai.vercel.app): base
// https://mealmeai.vercel.app, auth `Authorization: Bearer <key>`, stores are
// searched by ZIP code. Downtown Chicago (41.8781, -87.6298) is ZIP 60603.
//
// Query params: q (store name filter, applied locally), miles (radius, default 1),
// zip (default 60603), provider (square|kroger, default square),
// inventory=1 (also search the first open store's menu), item (menu search term).
const BASE = 'https://mealmeai.vercel.app'

const NUTRITION_KEY = /calor|kcal|nutri|protein|carb|fat|macro|energy/i

function findNutritionKeys(obj: unknown, path = '', out: Record<string, unknown> = {}, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 5) return out
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const p = path ? `${path}.${k}` : k
    if (NUTRITION_KEY.test(k)) out[p] = typeof v === 'object' ? JSON.stringify(v)?.slice(0, 200) : v
    if (v && typeof v === 'object') findNutritionKeys(v, p, out, depth + 1)
  }
  return out
}

function keysOf(obj: unknown): string[] {
  return obj && typeof obj === 'object' && !Array.isArray(obj) ? Object.keys(obj as object) : []
}

async function callMealMe(path: string, key: string) {
  const started = Date.now()
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
    cache: 'no-store',
  })
  const text = await res.text()
  let body: unknown = null
  try {
    body = JSON.parse(text)
  } catch {
    body = null
  }
  return { status: res.status, ok: res.ok, ms: Date.now() - started, body, text: body ? null : text.slice(0, 300) }
}

export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const key = process.env.MEALME_API_KEY
  if (!key) return NextResponse.json({ error: 'MEALME_API_KEY not set' }, { status: 500 })

  const sp = request.nextUrl.searchParams
  const q = (sp.get('q') || '').trim()
  const miles = Number(sp.get('miles') || '1') || 1
  const zip = sp.get('zip') || '60603'
  const provider = sp.get('provider') === 'kroger' ? 'kroger' : 'square'
  const merchantType = provider === 'kroger' ? 'grocery' : 'restaurant'
  const wantInventory = sp.get('inventory') === '1'
  const item = (sp.get('item') || 'chicken').trim()

  const keyInfo = { format: key.startsWith('mm_live_') ? 'mm_live_' : key.startsWith('mm_') ? 'mm_' : 'other', length: key.length }

  const params = new URLSearchParams({
    providerId: provider,
    merchantType,
    zipCode: zip,
    radiusInMiles: String(miles),
    limit: '25',
  })
  if (q) params.set('query', q)
  const searchPath = `/api/stores/search?${params.toString()}`
  const search = await callMealMe(searchPath, key)
  let paidCalls = search.ok ? 1 : 0

  const sb = search.body as Record<string, unknown> | null
  const allStores = (Array.isArray(sb?.stores) ? sb!.stores : []) as Record<string, unknown>[]
  const matches = q
    ? allStores.filter((s) => String(s.name || '').toLowerCase().includes(q.toLowerCase()))
    : allStores

  const summarize = (s: Record<string, unknown>) => {
    const raw = (s.raw || {}) as Record<string, unknown>
    return {
      name: s.name,
      address: s.address,
      providerLocationId_present: Boolean(s.providerLocationId),
      miles: raw.distanceMiles ?? s.distanceMiles ?? null,
      is_open: raw.isOpen ?? s.isOpen ?? null,
      eta: raw.eta ?? raw.deliveryEta ?? raw.pickupEta ?? raw.prepTime ?? null,
      fees: raw.fees ?? raw.deliveryFee ?? raw.serviceFee ?? null,
      price_level: raw.priceLevel ?? raw.dollarSigns ?? null,
      store_keys: Object.keys(s),
      raw_keys: Object.keys(raw),
      nutrition_or_food_truck_hints: Object.fromEntries(
        Object.entries(raw).filter(([k, v]) => /truck|cuisine|categor|type/i.test(k) && v != null).map(([k, v]) => [k, JSON.stringify(v).slice(0, 150)])
      ),
    }
  }

  const result: Record<string, unknown> = {
    base: BASE,
    key: keyInfo,
    search: {
      path: searchPath,
      http_status: search.status,
      ms: search.ms,
      error: search.ok ? null : (sb ?? search.text),
      top_level_keys: keysOf(sb),
      search_echo: sb?.search ?? null,
      diagnostic: sb?.diagnostic ?? null,
      total_stores: allStores.length,
      matched_q: q ? matches.length : null,
      food_truck_names: allStores.map((s) => String(s.name || '')).filter((n) => /truck/i.test(n)),
      all_store_names: allStores.map((s) => s.name),
      stores: matches.slice(0, 10).map(summarize),
    },
  }

  if (wantInventory && search.ok) {
    const pool = matches.length ? matches : allStores
    const store = pool.find((s) => ((s.raw || {}) as Record<string, unknown>).isOpen !== false) || pool[0]
    if (store?.providerLocationId) {
      const ip = new URLSearchParams({
        providerId: provider,
        locationId: String(store.providerLocationId),
        query: item,
        limit: '10',
      })
      const inv = await callMealMe(`/api/catalog/search?${ip.toString()}`, key)
      if (inv.ok) paidCalls += 1
      const ib = inv.body as Record<string, unknown> | null
      const listKey = ['items', 'products', 'results'].find((k) => Array.isArray(ib?.[k]))
      const items = (listKey ? (ib![listKey] as Record<string, unknown>[]) : []).slice(0, 10)
      result.inventory = {
        store: store.name,
        query: item,
        http_status: inv.status,
        ms: inv.ms,
        error: inv.ok ? null : (ib ?? inv.text),
        top_level_keys: keysOf(ib),
        list_key: listKey ?? null,
        item_count: listKey ? (ib![listKey] as unknown[]).length : 0,
        items: items.map((it) => {
          const raw = (it.raw || {}) as Record<string, unknown>
          return {
            name: it.name ?? raw.name,
            price: it.price ?? it.priceCents ?? raw.price ?? null,
            description: String(it.description ?? raw.description ?? '').slice(0, 160),
            item_keys: Object.keys(it),
            raw_keys: Object.keys(raw),
            nutrition_fields: findNutritionKeys(it),
          }
        }),
      }
    } else {
      result.inventory = { error: 'no store with providerLocationId to fetch' }
    }
  }

  result.paid_calls_this_request = paidCalls
  return NextResponse.json(result)
}
