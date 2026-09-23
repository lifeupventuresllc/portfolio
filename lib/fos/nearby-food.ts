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

type PlacesResult = { name: string; geometry?: { location?: { lat: number; lng: number } }; business_status?: string }

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
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return []

  let json: { results?: PlacesResult[] }
  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${SEARCH_RADIUS_METERS}&type=restaurant&key=${encodeURIComponent(apiKey)}`
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return []
    json = await res.json()
  } catch {
    return []
  }

  const known = knownRestaurants()
  const seen = new Set<string>()
  const matches: { restaurant: string; distanceMiles: number }[] = []
  for (const place of json.results || []) {
    if (place.business_status && place.business_status !== 'OPERATIONAL') continue
    const loc = place.geometry?.location
    if (!loc) continue
    const restaurant = matchKnownRestaurant(place.name, known)
    if (!restaurant || seen.has(restaurant)) continue
    seen.add(restaurant)
    matches.push({ restaurant, distanceMiles: milesBetween(lat, lng, loc.lat, loc.lng) })
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
