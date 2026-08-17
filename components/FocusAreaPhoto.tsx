'use client'

import Image from 'next/image'
import type { ReactNode } from 'react'

// The real photo + dynamic zone-highlight version of the focus-area picker,
// replacing the old hand-drawn BodyFocusIcon — matches the competitor pattern
// Asa sent screenshots of (a shared body photo, the selected/hovered option
// glows on the photo itself). The source photo (public/images/onboarding/
// focus-area.jpg) is pre-cropped to a true 9:16 — cropping the FILE itself
// (not just the CSS box) keeps these percentages simple: no separate math
// for how much of the original frame is showing.
//
// The caller must size this box to the TRUE 9/16 ratio (aspect-[9/16]),
// full width, uncropped — tried a shorter fixed crop ratio here to avoid
// any scrolling, but Asa's explicit call after seeing it live: he'd rather
// scroll a little (Continue is pinned to the viewport bottom regardless,
// see app/plan/intake/page.tsx) than have her body visibly cropped in the
// photo. The only real problem was ever the pill text getting clipped by a
// padding bug, already fixed separately — not the photo's size or ratio.
type Zone = 'core' | 'legs' | 'arms' | 'overall'
type Dot = { top: string; left: string; width: string; height: string }

// "Arms & back" gets TWO dots — this specific photo is a side profile, so her
// actual upper back/shoulder blade isn't visible, only the rear edge of the
// shoulder before it fades into the background, and the outer arm. Dot 1
// sits on that rear-shoulder edge (stands in for "back"), dot 2 lower on the
// arm for triceps — confirmed correct by Asa against a live screenshot, only
// dot 1 moved. Percentages are measured directly against the true, uncropped
// 9:16 source file (see the pixel-grid technique noted in project memory).
const ZONE_GLOW: Record<Exclude<Zone, 'overall'>, Dot[]> = {
  arms: [
    { top: '32%', left: '62%', width: '14%', height: '9%' }, // rear shoulder / back stand-in
    { top: '44%', left: '53%', width: '15%', height: '11%' }, // triceps, lower on the arm
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
      <Image src="/images/onboarding/focus-area.jpg" alt="" fill sizes="(max-width: 640px) 90vw, 420px" className="object-cover" priority />
      {zones.map((z) => ZONE_GLOW[z].map((dot, i) => (
        <Glow key={`${z}-${i}`} pos={dot} active={active === z || active === 'overall'} />
      )))}
      {children}
    </div>
  )
}
