'use client'

import Image from 'next/image'

// The real photo + dynamic zone-highlight version of the focus-area picker,
// replacing the old hand-drawn BodyFocusIcon — matches the competitor pattern
// Asa sent screenshots of (a shared body photo, the selected/hovered option
// glows on the photo itself). The source photo (public/images/onboarding/
// focus-area.jpg) is pre-cropped to a true 9:16 — Asa asked for the photo to
// read big on a real phone screen, and cropping the FILE itself (not just the
// CSS box) keeps these percentages simple: no separate math for how much of
// the original frame is showing. Zone positions are hand-measured directly
// against that cropped file, tightened to small precise dots (not broad
// zones) per Asa's "right on the specific area, not just close" feedback —
// they'll need re-tuning by eye if this photo is ever swapped for a
// differently-framed one.
type Zone = 'core' | 'legs' | 'arms' | 'overall'
type Dot = { top: string; left: string; width: string; height: string }

// "Arms & back" gets TWO dots — this specific photo is a side profile, so her
// actual upper back/shoulder blade isn't visible, only the front of the
// shoulder and the outer arm. Approximated as shoulder-top (stands in for
// "back") + a second dot lower on the arm for triceps, rather than one dot
// trying to mean both. A photo that actually shows her back would let these
// separate more honestly.
const ZONE_GLOW: Record<Exclude<Zone, 'overall'>, Dot[]> = {
  arms: [
    { top: '29%', left: '45%', width: '16%', height: '9%' }, // shoulder / back stand-in
    { top: '40%', left: '60%', width: '15%', height: '10%' }, // triceps, lower on the arm
  ],
  core: [
    { top: '51%', left: '43%', width: '15%', height: '8%' }, // stomach — the visible torso strip, not the arm
  ],
  legs: [
    { top: '61.5%', left: '65%', width: '26%', height: '17%' }, // glute, shifted onto the actual curve + bigger/stronger
  ],
}

function Glow({ pos, active }: { pos: Dot; active: boolean }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none transition-opacity duration-300 ease-out"
      style={{
        top: pos.top, left: pos.left, width: pos.width, height: pos.height,
        transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(circle, rgba(255,45,45,0.95) 0%, rgba(255,45,45,0.55) 40%, rgba(255,45,45,0) 72%)',
        mixBlendMode: 'screen',
        opacity: active ? 1 : 0,
      }}
    />
  )
}

export default function FocusAreaPhoto({ active }: { active: Zone | null }) {
  const zones: Exclude<Zone, 'overall'>[] = ['arms', 'core', 'legs']
  return (
    <div className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden bg-ink/5">
      <Image src="/images/onboarding/focus-area.jpg" alt="" fill sizes="(max-width: 640px) 95vw, 448px" className="object-cover" priority />
      {zones.map((z) => ZONE_GLOW[z].map((dot, i) => (
        <Glow key={`${z}-${i}`} pos={dot} active={active === z || active === 'overall'} />
      )))}
    </div>
  )
}
