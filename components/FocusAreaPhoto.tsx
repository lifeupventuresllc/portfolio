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

const ZONE_GLOW: Record<Exclude<Zone, 'overall'>, { top: string; left: string; width: string; height: string }> = {
  arms: { top: '34%', left: '51.5%', width: '20%', height: '11%' },
  core: { top: '52%', left: '46%', width: '18%', height: '8%' },
  legs: { top: '64%', left: '62%', width: '24%', height: '15%' },
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
    <div className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden bg-ink/5">
      <Image src="/images/onboarding/focus-area.jpg" alt="" fill sizes="(max-width: 640px) 95vw, 448px" className="object-cover" priority />
      <Glow pos={ZONE_GLOW.arms} active={active === 'arms' || active === 'overall'} />
      <Glow pos={ZONE_GLOW.core} active={active === 'core' || active === 'overall'} />
      <Glow pos={ZONE_GLOW.legs} active={active === 'legs' || active === 'overall'} />
    </div>
  )
}
