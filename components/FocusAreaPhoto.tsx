'use client'

import Image from 'next/image'

// The real photo + dynamic zone-highlight version of the focus-area picker,
// replacing the old hand-drawn BodyFocusIcon — matches the competitor pattern
// Asa sent screenshots of (a shared body photo, the selected/hovered option
// glows on the photo itself). The source photo (public/images/onboarding/
// focus-area.jpg) is pre-cropped to a true 9:16 — cropping the FILE itself
// (not just the CSS box) keeps these percentages simple: no separate math for
// how much of the original frame is showing. The display box is HEIGHT-capped
// (not full-width) so the photo + the option grid below it both fit one
// screen without scrolling — width is derived from the aspect ratio, not set
// directly, so the true frame (and these percentages) stay intact, just
// smaller. Zone positions are pixel-measured against a percentage grid
// overlaid on the actual source file, tightened to small precise dots (not
// broad zones) per Asa's "right on the specific area, not just close"
// feedback — they'll need re-tuning if this photo is ever swapped for a
// differently-framed one.
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
        // white leggings (the glute zone), since 'screen' can't darken a
        // pixel that's already near-white no matter how saturated the
        // overlay color is. A plain opaque-core gradient reads as true red
        // on every part of the photo, dark or light.
        background: 'radial-gradient(circle, rgba(230,20,20,1) 0%, rgba(230,20,20,0.85) 45%, rgba(230,20,20,0) 74%)',
        opacity: active ? 1 : 0,
      }}
    />
  )
}

export default function FocusAreaPhoto({ active }: { active: Zone | null }) {
  const zones: Exclude<Zone, 'overall'>[] = ['arms', 'core', 'legs']
  return (
    <div className="relative mx-auto h-[36dvh] max-h-[340px] min-h-[220px] aspect-[9/16] rounded-2xl overflow-hidden bg-ink/5">
      <Image src="/images/onboarding/focus-area.jpg" alt="" fill sizes="230px" className="object-cover" priority />
      {zones.map((z) => ZONE_GLOW[z].map((dot, i) => (
        <Glow key={`${z}-${i}`} pos={dot} active={active === z || active === 'overall'} />
      )))}
    </div>
  )
}
