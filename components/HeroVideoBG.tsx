'use client'

import { useEffect, useRef, useState } from 'react'

// Only ONE clip is ever mounted/decoding at a time — stacking all of them (even at
// opacity 0) means the browser decodes every stream simultaneously, which is heavy
// enough to visibly stutter the page. Rotation swaps the single <video>'s key instead.
//
// Imperatively sets `.muted`/calls `.play()` via a ref rather than relying only on the
// `autoPlay`/`muted` JSX attributes — React doesn't always sync the `muted` IDL
// property early enough for Chrome's autoplay gate to pass on elements that mount
// after initial hydration (a known React/video quirk), which was silently leaving
// every rotated clip stuck paused at frame 0 instead of actually playing.
function ActiveClip({ src }: { src: string }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    setVisible(false)
    const el = ref.current
    if (el) {
      el.muted = true
      el.play().catch(() => { /* best-effort — worst case it shows a static frame */ })
    }
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [src])

  return (
    <video
      key={src}
      ref={ref}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <source src={src} type="video/mp4" />
    </video>
  )
}

// No scrim/overlay here anymore — the video plays at full visibility. Pages that put
// text over this should float that text on its own solid backdrop card (crisp edges,
// guaranteed contrast) rather than relying on a gradient wash over the whole hero,
// which read as a hazy/blurry veil and dimmed the video everywhere, not just behind
// the text.
export default function HeroVideoBG({ src, srcs, rotateSeconds = 8 }: {
  src?: string
  srcs?: string[]
  rotateSeconds?: number
}) {
  const clips = srcs && srcs.length > 0 ? srcs : src ? [src] : []
  const [i, setI] = useState(0)

  useEffect(() => {
    if (clips.length < 2) return
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setI((n) => (n + 1) % clips.length), rotateSeconds * 1000)
    return () => clearInterval(id)
  }, [clips.length, rotateSeconds])

  if (clips.length === 0) return null

  return (
    <div className="absolute inset-0 overflow-hidden">
      <ActiveClip src={clips[i]} />
    </div>
  )
}
