'use client'

import { useEffect, useRef, useState } from 'react'

// Full pool of vertical clips — mix of body types and skin tones so the row reflects
// the actual avatar, not one look. Only 5 show at once (matches the original tile
// count/layout); which 5 rotates so repeat visitors and longer sessions see variety
// instead of a fixed static row.
const POOL = [
  '/videos/tile-1.mp4', '/videos/tile-2.mp4', '/videos/tile-3.mp4', '/videos/tile-4.mp4', '/videos/tile-5.mp4',
  '/videos/tile-6.mp4', '/videos/tile-7.mp4', '/videos/tile-8.mp4', '/videos/tile-9.mp4',
]
const VISIBLE = 5
const ROTATE_SECONDS = 10

// Imperatively sets `.muted`/calls `.play()` on mount rather than trusting the JSX
// attributes alone — React doesn't always sync the `muted` IDL property early enough
// for Chrome's autoplay gate on elements mounted after initial hydration, which was
// leaving tiles stuck paused at frame 0 instead of actually playing.
function Tile({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const el = ref.current
    if (el) { el.muted = true; el.play().catch(() => {}) }
  }, [src])

  return (
    <video ref={ref} autoPlay muted loop playsInline preload="auto" className="w-full h-full object-cover">
      <source src={src} type="video/mp4" />
    </video>
  )
}

export default function VideoTileRow() {
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setOffset((o) => (o + 1) % POOL.length), ROTATE_SECONDS * 1000)
    return () => clearInterval(id)
  }, [])

  const tiles = Array.from({ length: VISIBLE }, (_, i) => POOL[(offset + i) % POOL.length])

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory sm:overflow-visible sm:pb-0">
      {tiles.map((src, i) => (
        <div key={`${offset}-${i}`} className="q-in-fwd shrink-0 w-32 sm:w-auto sm:flex-1 aspect-[9/16] rounded-2xl overflow-hidden border border-smoke/50 snap-start">
          <Tile src={src} />
        </div>
      ))}
    </div>
  )
}
