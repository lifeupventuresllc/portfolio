'use client'

import Image from 'next/image'
import type { ReactNode } from 'react'

// The real photo + dynamic zone-highlight version of the focus-area picker,
// replacing the old hand-drawn BodyFocusIcon — matches the competitor pattern
// Asa sent screenshots of (a shared body photo, the selected/hovered option
// glows on the photo itself). The source photo (public/images/onboarding/
// focus-area.jpg) is pre-cropped to a true 9:16 — cropping the FILE itself
// (not just the CSS box) keeps these percentages simple: no separate math for
// how much of the original frame is showing. Sizing (how big the box is) is
// now the CALLER's job — this component just fills w-full h-full of whatever
// box it's given, so the true 9:16 frame (and these percentages) never gets
// crop-shifted by a differently-proportioned container. Zone positions are
// pixel-measured against a percentage grid overlaid on the actual source
// file, tightened to small precise dots (not broad zones) per Asa's "right
// on the specific area, not just close" feedback — they'll need re-tuning if
// this photo is ever swapped for a differently-framed one. `children` renders
// on top of the photo (after the glows) — used to float the option pills
// directly over the image instead of in a separate section below it.
type Zone = 'core' | 'legs' | 'arms' | 'overall'
type Dot = { top: string; left: string; width: string; height: string }

// "Arms & back" gets TWO dots — this specific photo is a side profile, so her
// actual upper back/shoulder blade isn't visible, only the rear edge of the
// shoulder before it fades into the background, and the outer arm. Dot 1
// sits on that rear-shoulder edge (stands in for "back"), dot 2 lower on the
// arm for triceps — confirmed correct by Asa against a live screenshot, only
// dot 1 moved.
const ZONE_GLOW: Record<Exclude<Zone, 'overall'>, Dot[]> = {
  arms: [
    { top: '32%', left: '62%', width: '14%', height: '9%' }, // rear shoulder / back stand-in
    { top: '44%', left: '53%', width: '15%', height: '11%' }, // triceps, lower on the arm — confirmed correct
  ],
  core: [
    { top: '55%', left: '35%', width: '15%', height: '13%' }, // the real exposed side/stomach strip between crop top and waistband
  ],
  legs: [
    { top: '67%', left: '65%', width: '22%', height: '19%' }, // glute, on the actual peak of the curve
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
      {/* object-top, not the object-cover default (center) — when the parent's
          max-h caps below the true 9:16 height on a shorter phone, a center
          crop would trim equally off top AND bottom, shifting every
          pixel-measured glow position. Every zone (deepest is the glute at
          ~76% down) sits well above the crop line at realistic cap ratios,
          so cropping ONLY from the bottom (unused lower-leg area) keeps all
          of them accurate regardless of how much the cap actually trims. */}
      <Image src="/images/onboarding/focus-area.jpg" alt="" fill sizes="(max-width: 640px) 90vw, 420px" className="object-cover object-top" priority />
      {zones.map((z) => ZONE_GLOW[z].map((dot, i) => (
        <Glow key={`${z}-${i}`} pos={dot} active={active === z || active === 'overall'} />
      )))}
      {children}
    </div>
  )
}
