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

/** Which of OUR known chains are open within reach, nearest distance each.
 * Word-boundary match so "Cava" never matches "Cavalier Pizza". */
export function chainsNear(places: NearbyPlace[], chains: Iterable<string>, lat: number, lng: number): Map<string, number> {
  const norm = (s: string) => s.toLowerCase().replace(/[®™'’.]/g, '').replace(/[^a-z0-9& ]+/g, ' ').replace(/\s+/g, ' ').trim()
  const out = new Map<string, number>()
  const list = Array.from(chains).map((c) => ({ c, re: new RegExp(`(^| )${norm(c).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( |$)`) }))
  for (const p of places) {
    if (p.openNow === false) continue
    const n = norm(p.name)
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
