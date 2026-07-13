'use client'

import { useMemo, useState } from 'react'
import {
  GROCERY_ESTIMATES, regionForState, multiplierForRegion, fmt, type PriceItem,
} from '@/lib/grocery-prices'

// "Grocery prices near you" — estimated regional price ranges for the foods we
// recommend, plus live "stores near me" map links. Estimates only (clearly
// labeled); the store links use the user's real location or typed place.
export default function GroceryPricing() {
  const [place, setPlace] = useState('') // ZIP or "City, ST"
  const [locating, setLocating] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  // Pull a 2-letter state out of a "City, ST" entry to bias the estimate.
  const state = useMemo(() => {
    const m = place.match(/,\s*([A-Za-z]{2})\b/)
    return m ? m[1] : undefined
  }, [place])
  const region = regionForState(state)
  const mult = multiplierForRegion(region)

  const grouped = useMemo(() => {
    const by: Record<string, PriceItem[]> = {}
    for (const it of GROCERY_ESTIMATES) (by[it.aisle] ||= []).push(it)
    return Object.entries(by)
  }, [])

  const storesUrl = coords
    ? `https://www.google.com/maps/search/grocery+stores/@${coords.lat},${coords.lng},13z`
    : `https://www.google.com/maps/search/grocery+stores+${encodeURIComponent(place || 'near me')}`

  function useMyLocation() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false) },
      () => setLocating(false),
      { timeout: 8000 }
    )
  }

  return (
    <div className="bg-charcoal border border-smoke rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
        <h3 className="text-white font-bold text-base">Grocery prices near you 🛒</h3>
        <span className="text-[10px] bg-obsidian border border-smoke text-ivory/50 px-2 py-0.5 rounded-full uppercase tracking-wider">
          {region === 'National' ? 'US estimate' : `${region} estimate`}
        </span>
      </div>
      <p className="text-ivory/50 text-xs mb-4">
        Estimated ranges for the foods I recommend, so you can budget your week. Enter your ZIP or city to tune it, then jump to stores near you.
      </p>

      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder="ZIP or City, ST (e.g. Los Angeles, CA)"
          className="flex-1 min-w-[180px] px-3 py-2 bg-obsidian border border-smoke rounded-xl text-white text-sm focus:outline-none focus:border-gold"
        />
        <button onClick={useMyLocation} disabled={locating}
          className="px-3 py-2 rounded-xl text-xs font-semibold bg-obsidian border border-gold/40 text-gold disabled:opacity-50">
          {locating ? 'Locating…' : '📍 Use my location'}
        </button>
      </div>

      <div className="space-y-3 mb-4">
        {grouped.map(([aisle, items]) => (
          <div key={aisle}>
            <p className="text-gold/80 text-[10px] uppercase tracking-wider mb-1">{aisle}</p>
            <div className="space-y-1">
              {items.map((it) => (
                <div key={it.name} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-ivory/80">{it.name} <span className="text-ivory/30 text-xs">· {it.unit}</span></span>
                  <span className="text-white font-semibold tabular-nums whitespace-nowrap">
                    {fmt(it.low * mult)}–{fmt(it.high * mult)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <a href={storesUrl} target="_blank" rel="noopener noreferrer"
        className="block text-center bg-gold text-obsidian py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:scale-[1.01] transition-transform">
        Find grocery stores near me →
      </a>
      <p className="text-ivory/30 text-[10px] mt-2 text-center">Estimates only — actual prices vary by store, brand, and season.</p>
    </div>
  )
}
