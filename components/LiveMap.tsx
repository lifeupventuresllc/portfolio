'use client'

import { useEffect, useRef, useState } from 'react'

// A real, live map (2026-10-26, Asa: "a live map instead of this grid looking
// thing"). MapLibre + OpenFreeMap's free dark tiles: no key, no billing.
// The library loads only when this screen needs it, so the rest of the
// intake stays light. She can pan and pinch; her dot pulses, the open spots
// drop in as gold pins. Any trouble loading → `onFail`, and the screen keeps
// its drawn map.

type Spot = { name: string; miles: number; lat: number; lng: number }
type ML = { Map: new (o: object) => MLMap; Marker: new (o: object) => MLMarker; LngLatBounds: new (a: [number, number], b: [number, number]) => MLBounds }
type MLMap = { on: (e: string, f: () => void) => void; fitBounds: (b: MLBounds, o: object) => void; remove: () => void; getCanvas: () => HTMLCanvasElement }
type MLMarker = { setLngLat: (l: [number, number]) => MLMarker; addTo: (m: MLMap) => MLMarker }
type MLBounds = { extend: (l: [number, number]) => MLBounds }

const VER = '5.24.0'
let loading: Promise<ML> | null = null
function loadMapLibre(): Promise<ML> {
  const w = window as unknown as { maplibregl?: ML }
  if (w.maplibregl) return Promise.resolve(w.maplibregl)
  if (loading) return loading
  loading = new Promise<ML>((resolve, reject) => {
    const css = document.createElement('link')
    css.rel = 'stylesheet'; css.href = `https://unpkg.com/maplibre-gl@${VER}/dist/maplibre-gl.css`
    document.head.appendChild(css)
    const js = document.createElement('script')
    js.src = `https://unpkg.com/maplibre-gl@${VER}/dist/maplibre-gl.js`
    js.async = true
    js.onload = () => (w.maplibregl ? resolve(w.maplibregl) : reject(new Error('no maplibre')))
    js.onerror = () => { loading = null; reject(new Error('maplibre failed')) }
    document.head.appendChild(js)
  })
  return loading
}

export default function LiveMap({ me, spots, bottomPad, onFail }: { me: { lat: number; lng: number }; spots: Spot[]; bottomPad: number; onFail: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let map: MLMap | null = null
    let dead = false
    loadMapLibre().then((ml) => {
      if (dead || !box.current) return
      map = new ml.Map({
        container: box.current,
        style: 'https://tiles.openfreemap.org/styles/dark',
        center: [me.lng, me.lat], zoom: 14,
        attributionControl: { compact: true },
        dragRotate: false, pitchWithRotate: false,
      })
      const dot = document.createElement('div')
      dot.className = 'lm-me'
      dot.innerHTML = '<span class="lm-pulse"></span><span class="lm-core"></span>'
      new ml.Marker({ element: dot }).setLngLat([me.lng, me.lat]).addTo(map)
      map.on('error', () => { if (!dead && !ready) onFail() })
      map.on('load', () => {
        if (dead || !map) return
        setReady(true)
        const b = new ml.LngLatBounds([me.lng, me.lat], [me.lng, me.lat])
        spots.forEach((s) => b.extend([s.lng, s.lat]))
        if (spots.length) map.fitBounds(b, { padding: { top: 130, bottom: bottomPad + 40, left: 70, right: 70 }, maxZoom: 15.5, duration: 1400 })
        spots.forEach((s, k) => {
          const el = document.createElement('div')
          el.className = 'lm-pin'
          el.style.animationDelay = `${1.2 + k * 0.15}s`
          const name = document.createElement('b'); name.textContent = s.name
          const mi = document.createElement('i'); mi.textContent = `${s.miles.toFixed(1)} MI`
          const t = document.createElement('span'); t.append(name, mi)
          el.innerHTML = '<span class="lm-ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E5A93C" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M7 3v8M5 3v5a2 2 0 004 0V3M7 11v10M17 3c-2 0-3 3-3 6s1 4 3 4v8"/></svg></span>'
          el.appendChild(t)
          new ml.Marker({ element: el, anchor: 'bottom' }).setLngLat([s.lng, s.lat]).addTo(map!)
        })
      })
    }).catch(() => { if (!dead) onFail() })
    return () => { dead = true; map?.remove() }
    // one map per screen visit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <div ref={box} className="absolute inset-0 transition-opacity duration-700" style={{ opacity: ready ? 1 : 0 }} />
      <style>{`
.lm-me{position:relative;width:24px;height:24px}
.lm-pulse{position:absolute;inset:0;border-radius:999px;background:rgba(90,160,255,.6);animation:nfPulse 1.8s ease-out infinite}
.lm-core{position:absolute;inset:3px;border-radius:999px;background:#4C8DFF;border:3px solid #EDE7DA}
.lm-pin{display:flex;align-items:center;gap:8px;border-radius:999px;padding:6px 12px 6px 6px;background:#E5A93C;color:#021F16;box-shadow:0 6px 18px rgba(0,0,0,.45);animation:nfDrop .45s cubic-bezier(.3,1.6,.5,1) both}
.lm-ic{width:26px;height:26px;border-radius:999px;background:#021F16;display:flex;align-items:center;justify-content:center}
.lm-pin>span:last-child{display:flex;flex-direction:column;line-height:1.15;font-family:var(--font-inter),Inter,sans-serif}
.lm-pin b{font-size:13px;font-weight:700}
.lm-pin i{font-style:normal;font-family:var(--font-jbmono),monospace;font-size:11px;font-weight:700}
.maplibregl-ctrl-attrib{font-size:10px;opacity:.6}
`}</style>
    </>
  )
}
