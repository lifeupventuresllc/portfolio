'use client'

import Image from 'next/image'
import type { ReactNode } from 'react'

// The real photo + dynamic zone-highlight version of the focus-area picker,
// replacing the old hand-drawn BodyFocusIcon — matches the competitor pattern
// Asa sent screenshots of (a shared body photo, the selected/hovered option
// glows on the photo itself). The source photo (public/images/onboarding/
// focus-area.jpg) is pre-cropped to a true 9:16.
//
// IMPORTANT: the caller must size this box to a FIXED 9/12.8 aspect ratio
// (aspect-[9/12.8]), not the source's true 9/16 — a real device screenshot
// showed the bottom pill row landing below the fold on a shorter phone when
// sized at true 9:16. Tried capping height with a px max-height first, but
// that crops a DIFFERENT fraction of the image on every device width (the
// crop only kicks in once natural height exceeds the cap), which would've
// shifted the pixel-measured glow positions by a different, unpredictable
// amount per device. A fixed aspect RATIO crops the exact same 20% off the
// bottom on every device — image is cropped from the bottom only
// (object-top), never the top — so the percentages below could be
// remapped ONCE (divide the original grid-measured top/height by 0.8) and
// stay correct everywhere, instead of needing to be dynamic. The deepest
// zone (glute, bottom edge ~76.5% of the original frame) still lands at
// ~95.6% of the visible window — comfortable margin before the cut line.
type Zone = 'core' | 'legs' | 'arms' | 'overall'
type Dot = { top: string; left: string; width: string; height: string }

// "Arms & back" gets TWO dots — this specific photo is a side profile, so her
// actual upper back/shoulder blade isn't visible, only the rear edge of the
// shoulder before it fades into the background, and the outer arm. Dot 1
// sits on that rear-shoulder edge (stands in for "back"), dot 2 lower on the
// arm for triceps — confirmed correct by Asa against a live screenshot, only
// dot 1 moved. All top/height values below are remapped for the 0.8-visible-
// fraction crop (original-grid-measured value ÷ 0.8) — left/width are
// horizontal, unaffected by a vertical crop, and stay as originally measured.
const ZONE_GLOW: Record<Exclude<Zone, 'overall'>, Dot[]> = {
  arms: [
    { top: '40.0%', left: '62%', width: '14%', height: '11.25%' }, // rear shoulder / back stand-in
    { top: '55.0%', left: '53%', width: '15%', height: '13.75%' }, // triceps, lower on the arm
  ],
  core: [
    { top: '68.75%', left: '35%', width: '15%', height: '16.25%' }, // the real exposed side/stomach strip between crop top and waistband
  ],
  legs: [
    { top: '83.75%', left: '65%', width: '22%', height: '23.75%' }, // glute, on the actual peak of the curve
  ],
}

function Glow({ pos, active }: { pos: Dot; active: boolean }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none transition-opacity duration-300 ease-out"
      style={{
        top: pos.top, left: pos.left, width: pos.width, height: pos.height,
        transform: 'translate(-50%, -50%)',
        // No blend mode — screen was washing this out to near-white over the
        // white leggings (the glute zone). But a fully opaque core (the first
        // fix) went too far the other way — read as a solid, blotchy red
        // circle instead of a glow. Softer opacity + a slight blur so it
        // actually looks illuminated, not painted on.
        background: 'radial-gradient(circle, rgba(230,30,30,0.85) 0%, rgba(230,30,30,0.5) 45%, rgba(230,30,30,0) 75%)',
        filter: 'blur(2px)',
        opacity: active ? 1 : 0,
      }}
    />
  )
}

export default function FocusAreaPhoto({ active, children }: { active: Zone | null; children?: ReactNode }) {
  const zones: Exclude<Zone, 'overall'>[] = ['arms', 'core', 'legs']
  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-ink/5">
      {/* object-top, not object-cover's default (center) — the caller's
          fixed 9/12.8 box is shorter than this image's true 9:16, so
          something has to give; top-alignment crops only from the bottom
          (unused lower-leg area), matching the ZONE_GLOW remap above. */}
      <Image src="/images/onboarding/focus-area.jpg" alt="" fill sizes="(max-width: 640px) 90vw, 420px" className="object-cover object-top" priority />
      {zones.map((z) => ZONE_GLOW[z].map((dot, i) => (
        <Glow key={`${z}-${i}`} pos={dot} active={active === z || active === 'overall'} />
      )))}
      {children}
    </div>
  )
}
