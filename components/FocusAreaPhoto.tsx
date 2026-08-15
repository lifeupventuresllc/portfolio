'use client'

import Image from 'next/image'

// The real photo + dynamic zone-highlight version of the focus-area picker,
// replacing the old hand-drawn BodyFocusIcon — matches the competitor pattern
// Asa sent screenshots of (a shared body photo, the selected/hovered option
// glows on the photo itself). Zone positions are hand-tuned percentages against
// this specific photo (public/images/onboarding/focus-area.jpg, a side-profile
// shot) — they'll need re-tuning by eye if this photo is ever swapped for a
// differently-framed one.
type Zone = 'core' | 'legs' | 'arms' | 'overall'

const ZONE_GLOW: Record<Exclude<Zone, 'overall'>, { top: string; left: string; width: string; height: string }> = {
  arms: { top: '36%', left: '46%', width: '30%', height: '22%' },
  core: { top: '53%', left: '44%', width: '26%', height: '15%' },
  legs: { top: '78%', left: '53%', width: '36%', height: '42%' },
}

function Glow({ pos, active }: { pos: { top: string; left: string; width: string; height: string }; active: boolean }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none transition-opacity duration-300 ease-out"
      style={{
        top: pos.top, left: pos.left, width: pos.width, height: pos.height,
        transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(circle, rgba(239,68,68,0.85) 0%, rgba(239,68,68,0.35) 45%, rgba(239,68,68,0) 75%)',
        mixBlendMode: 'screen',
        opacity: active ? 1 : 0,
      }}
    />
  )
}

export default function FocusAreaPhoto({ active }: { active: Zone | null }) {
  return (
    <div className="relative w-full aspect-[4000/4717] rounded-2xl overflow-hidden bg-ink/5">
      <Image src="/images/onboarding/focus-area.jpg" alt="" fill sizes="(max-width: 640px) 90vw, 400px" className="object-cover" priority />
      <Glow pos={ZONE_GLOW.arms} active={active === 'arms' || active === 'overall'} />
      <Glow pos={ZONE_GLOW.core} active={active === 'core' || active === 'overall'} />
      <Glow pos={ZONE_GLOW.legs} active={active === 'legs' || active === 'overall'} />
    </div>
  )
}
