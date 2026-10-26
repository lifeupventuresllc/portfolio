import { unstable_cache } from 'next/cache'
import { pickForRestaurant, doordashSearchUrl, knownRestaurants, type WeightClass, type FastFoodMeal, type DietaryRestriction } from '@/lib/escape-plan'

// ============================================================
// Real, real-time "what's actually near her right now" (2026-09-23, Asa's
// direct ask). Google Places tells us what's physically nearby; this file
// narrows that down to ONLY chains lib/escape-plan.ts already has honest,
// researched calorie/macro numbers for, then hands off to the SAME
// pickForRestaurant() every other real pick in this app already uses —
// never a made-up number for a real place. Caps at 2 (Asa: "at least no
// more than two recommended").
// ============================================================

export type NearbyPick = FastFoodMeal & { distanceMiles: number; doordashUrl: string }

const SEARCH_RADIUS_METERS = 3200 // ~2 miles, matches Asa's own "a mile or two"
const MAX_RESULTS = 2

// One nearby place from Google Places API (New). openNow is undefined when
// Google doesn't know its hours (kept — never guessed closed).
export type NearbyPlace = { name: string; lat: number; lng: number; openNow?: boolean }

// The two place-type groups the chains we have real numbers for fall under
// (2 calls, each the 20 nearest). Fast food first — that's most of them.
const TYPE_GROUPS = [
  ['fast_food_restaurant', 'hamburger_restaurant', 'sandwich_shop', 'mexican_restaurant', 'chinese_restaurant'],
  ['restaurant', 'cafe', 'coffee_shop', 'bakery', 'mediterranean_restaurant'],
]

async function searchNearby(lat: number, lng: number, radiusMeters: number, types: string[], apiKey: string): Promise<NearbyPlace[]> {
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.location,places.businessStatus,places.currentOpeningHours.openNow',
      },
      body: JSON.stringify({
        includedTypes: types, maxResultCount: 20, rankPreference: 'DISTANCE',
        locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters } },
      }),
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    })
    if (!res.ok) return []
    const json = await res.json() as { places?: { displayName?: { text?: string }; location?: { latitude: number; longitude: number }; businessStatus?: string; currentOpeningHours?: { openNow?: boolean } }[] }
    return (json.places || [])
      .filter((p) => p.displayName?.text && p.location && (!p.businessStatus || p.businessStatus === 'OPERATIONAL'))
      .map((p) => ({ name: p.displayName!.text!, lat: p.location!.latitude, lng: p.location!.longitude, openNow: p.currentOpeningHours?.openNow }))
  } catch {
    return []
  }
}

// Saved per ~100 m square for 20 minutes, so ten people on the same block
// (or her opening the tab five times) cost ONE Google lookup, and "open
// now" is never more than 20 minutes old.
const cachedNearby = unstable_cache(
  async (latKey: string, lngKey: string, radiusMeters: number): Promise<NearbyPlace[]> => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!apiKey) return []
    const lat = Number(latKey), lng = Number(lngKey)
    const groups = await Promise.all(TYPE_GROUPS.map((t) => searchNearby(lat, lng, radiusMeters, t, apiKey)))
    return groups.flat()
  },
  ['places-nearby-v1'],
  { revalidate: 20 * 60 },
)

/** Real places near her (Google Places API New), cached per small area.
 * Never throws — no key / network trouble = an empty list. */
export async function placesNear(lat: number, lng: number, radiusMeters = 1609): Promise<NearbyPlace[]> {
  if (!process.env.GOOGLE_PLACES_API_KEY) return []
  return cachedNearby(lat.toFixed(3), lng.toFixed(3), radiusMeters).catch(() => [])
}

// ---- Each chain by name (2026-10-23 live test: the 20-nearest search above
// missed Chipotle/McDonald's/Sweetgreen in downtown Chicago — too many local
// spots closer). One name search per chain, saved per ~1 km square for a day;
// "open now" is worked out from the saved weekly hours at request time, so
// it's always current without asking Google again.
type Period = { open?: { day: number; hour: number; minute: number }; close?: { day: number; hour: number; minute: number } }
export type ChainPlace = { name: string; lat: number; lng: number; periods?: Period[]; utcOffsetMinutes?: number; alwaysOpen?: boolean }

async function searchChain(chain: string, lat: number, lng: number, apiKey: string): Promise<ChainPlace[]> {
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.location,places.businessStatus,places.regularOpeningHours.periods,places.utcOffsetMinutes',
      },
      body: JSON.stringify({
        textQuery: chain, pageSize: 5, rankPreference: 'DISTANCE',
        // ~3 miles each way around the square she's in
        locationRestriction: { rectangle: { low: { latitude: lat - 0.045, longitude: lng - 0.06 }, high: { latitude: lat + 0.045, longitude: lng + 0.06 } } },
      }),
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    })
    if (!res.ok) return []
    const json = await res.json() as { places?: { displayName?: { text?: string }; location?: { latitude: number; longitude: number }; businessStatus?: string; regularOpeningHours?: { periods?: Period[] }; utcOffsetMinutes?: number }[] }
    return (json.places || [])
      .filter((p) => p.displayName?.text && p.location && (!p.businessStatus || p.businessStatus === 'OPERATIONAL'))
      .map((p) => {
        const periods = p.regularOpeningHours?.periods
        // Google's way of saying "open 24 hours": one period, open with no close.
        const alwaysOpen = !!periods && periods.length === 1 && !periods[0].close
        return { name: p.displayName!.text!, lat: p.location!.latitude, lng: p.location!.longitude, periods, utcOffsetMinutes: p.utcOffsetMinutes, alwaysOpen }
      })
  } catch {
    return []
  }
}

const cachedChainPlaces = unstable_cache(
  async (latKey: string, lngKey: string, chainsKey: string): Promise<ChainPlace[]> => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!apiKey) return []
    const lat = Number(latKey), lng = Number(lngKey)
    const lists = await Promise.all(chainsKey.split('|').map((c) => searchChain(c, lat, lng, apiKey)))
    return lists.flat()
  },
  ['places-chains-v1'],
  { revalidate: 24 * 60 * 60 },
)

const WEEK = 7 * 24 * 60
export function openAt(p: ChainPlace, now: Date): boolean | undefined {
  if (p.alwaysOpen) return true
  if (!p.periods?.length || p.utcOffsetMinutes == null) return undefined
  const local = new Date(now.getTime() + p.utcOffsetMinutes * 60000)
  const t = local.getUTCDay() * 1440 + local.getUTCHours() * 60 + local.getUTCMinutes()
  for (const per of p.periods) {
    if (!per.open || !per.close) continue
    const o = per.open.day * 1440 + per.open.hour * 60 + per.open.minute
    let c = per.close.day * 1440 + per.close.hour * 60 + per.close.minute
    if (c <= o) c += WEEK // closes after midnight Saturday → wraps into next week
    if ((t >= o && t < c) || (t + WEEK >= o && t + WEEK < c)) return true
  }
  return false
}

/** Every location of OUR chains around her, with "open now" worked out for
 * this minute. Cached per ~1 km square for a day (12 lookups per square). */
export async function chainPlacesNear(lat: number, lng: number, chains: Iterable<string>): Promise<NearbyPlace[]> {
  if (!process.env.GOOGLE_PLACES_API_KEY) return []
  const key = Array.from(chains).sort().join('|')
  const places = await cachedChainPlaces(lat.toFixed(2), lng.toFixed(2), key).catch(() => [] as ChainPlace[])
  // 2026-10-26 (Asa: late at night it showed places that weren't open):
  // "open" means open now AND still open 45 minutes from now, so a delivery
  // never lands on a closed door. No hours from Google = not promised open.
  const now = new Date(), soon = new Date(now.getTime() + OPEN_BUFFER_MIN * 60000)
  return places.map((p) => ({ name: p.name, lat: p.lat, lng: p.lng, openNow: openAt(p, now) === true && openAt(p, soon) === true }))
}

const OPEN_BUFFER_MIN = 45

/** Our chains she can order from right now: open within a mile (3 miles if
 * fewer than two are). An EMPTY map is a real answer ("nothing near her is
 * open") and must never fall back to showing every chain. undefined = we
 * couldn't look (no key, Google trouble, nothing of ours anywhere near). */
export async function openChainsNear(lat: number, lng: number, chains: Set<string>): Promise<Map<string, number> | undefined> {
  const places = await chainPlacesNear(lat, lng, chains)
  if (!places.length) return undefined
  const near = chainsWithin(places, chains, lat, lng, 1)
  return near.size >= 2 ? near : chainsWithin(places, chains, lat, lng, 3)
}

/** Same as chainsNear, only places within maxMiles of her. */
export function chainsWithin(places: NearbyPlace[], chains: Iterable<string>, lat: number, lng: number, maxMiles: number): Map<string, number> {
  const all = chainsNear(places, chains, lat, lng)
  return new Map(Array.from(all).filter(([, miles]) => miles <= maxMiles))
}

/** Which of OUR known chains are open within reach, nearest distance each.
 * Word-boundary match so "Cava" never matches "Cavalier Pizza". */
export function chainsNear(places: NearbyPlace[], chains: Iterable<string>, lat: number, lng: number): Map<string, number> {
  const norm = (s: string) => s.toLowerCase().replace(/[®™'’.]/g, '').replace(/[^a-z0-9& ]+/g, ' ').replace(/\s+/g, ' ').trim()
  const out = new Map<string, number>()
  const list = Array.from(chains).map((c) => ({ c, re: new RegExp(`(^| )${norm(c).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( |$)`) }))
  for (const p of places) {
    if (p.openNow !== true) continue
    const n = norm(p.name)
    if (/\b(station|stop|terminal|platform)\b/.test(n)) continue // "Union Sq Subway Station" isn't a Subway
    const hit = list.find(({ re }) => re.test(n))
    if (!hit) continue
    const miles = milesBetween(lat, lng, p.lat, p.lng)
    if (!out.has(hit.c) || miles < out.get(hit.c)!) out.set(hit.c, Math.round(miles * 10) / 10)
  }
  return out
}

function milesBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8 // Earth radius, miles
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLng = (lng2 - lng1) * (Math.PI / 180)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

// Google's real name ("McDonald's", "Chick-fil-A®", "Chipotle Mexican
// Grill") never matches our stored name byte-for-byte — a real, honest
// substring match against our known set, either direction, case-insensitive.
function matchKnownRestaurant(placeName: string, known: Set<string>): string | null {
  const norm = (s: string) => s.toLowerCase().replace(/[®'’.]/g, '').trim()
  const n = norm(placeName)
  for (const name of Array.from(known)) {
    const kn = norm(name)
    if (n.includes(kn) || kn.includes(n)) return name
  }
  return null
}

// Never throws, never blocks the caller — a missing key, a network hiccup,
// or Google being down must degrade to "no nearby pick," the exact same
// as her simply not being near a known chain right now, never a broken page.
export async function nearbyPicks(
  lat: number, lng: number, wc: WeightClass, slot: FastFoodMeal['slot'], remainingCal: number | undefined, restrictions?: Set<DietaryRestriction>,
): Promise<NearbyPick[]> {
  if (!process.env.GOOGLE_PLACES_API_KEY) return []

  const places = await placesNear(lat, lng, SEARCH_RADIUS_METERS)
  const known = knownRestaurants()
  const seen = new Set<string>()
  const matches: { restaurant: string; distanceMiles: number }[] = []
  for (const place of places) {
    if (place.openNow === false) continue
    const restaurant = matchKnownRestaurant(place.name, known)
    if (!restaurant || seen.has(restaurant)) continue
    seen.add(restaurant)
    matches.push({ restaurant, distanceMiles: milesBetween(lat, lng, place.lat, place.lng) })
  }
  matches.sort((a, b) => a.distanceMiles - b.distanceMiles)

  const picks: NearbyPick[] = []
  for (const m of matches) {
    const meal = pickForRestaurant(wc, m.restaurant, slot, remainingCal, restrictions)[0]
    if (!meal) continue
    picks.push({ ...meal, distanceMiles: Math.round(m.distanceMiles * 10) / 10, doordashUrl: doordashSearchUrl(meal.restaurant) })
    if (picks.length >= MAX_RESULTS) break
  }
  return picks
}
