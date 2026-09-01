'use client'

import { useEffect, useRef, useState } from 'react'

// Garden View — the second progress visualization on /plan, alongside the
// sonar-circle Claim Field (NextActionCard). Every logged action becomes one
// piece of a growing garden scene; the backend (already live, see
// app/api/plan/builder/route.ts + lib/builder/engine.ts) decides tier/variant/
// sequence per element and the overall day-to-night `phase`. This component
// only decides WHERE each element sits and WHICH of the approved mockup's
// visual sub-variants it uses — the art itself (gradients, filters, element
// shapes, ambient rays/stars/fireflies/bushes systems) is ported verbatim
// from the four approved .dc.html artboards (foundation/structure/detail/
// landmark), not reinterpreted.

type Tier = 'micro' | 'small' | 'medium' | 'large'
type SourceType = 'next_action_log' | 'food_log' | 'daily_checkin' | 'weekly_checkin' | 'weigh_in' | 'badge'
type Phase = 'foundation' | 'structure' | 'detail' | 'landmark'

type BuilderElement = {
  id: string
  tier: Tier
  sourceType: SourceType
  sequence: number
  variant: number
  placedAt: string
}

type BuilderResponse = {
  phase: Phase
  totalCount: number
  elements: BuilderElement[]
}

const SOURCE_LABEL: Record<SourceType, string> = {
  next_action_log: 'An action you completed',
  food_log: 'A meal you logged',
  daily_checkin: 'A daily check-in',
  weekly_checkin: 'A weekly check-in',
  weigh_in: 'A weigh-in',
  badge: 'A badge you earned',
}

// Deterministic placement — same id always lands in the same spot across
// reloads. `sequence` (stable, server-assigned) drives the structural grid
// position; `id` (also stable) seeds jitter/rotation/scale so the grid
// doesn't read as a literal grid. Never Math.random() — a reload must not
// reshuffle the garden.
const ROW_SLOTS = 16
const GROUND_X_MIN = 10
const GROUND_X_MAX = 340
const SLOT_STEP = (GROUND_X_MAX - GROUND_X_MIN) / (ROW_SLOTS - 1)
const MAX_LAYERS = 6
const MAX_PLACED = 80

function hashId(id: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function computePlacement(el: BuilderElement) {
  const slot = ((el.sequence % ROW_SLOTS) + ROW_SLOTS) % ROW_SLOTS
  const layer = Math.floor(el.sequence / ROW_SLOTS) % MAX_LAYERS
  const h = hashId(el.id)
  const jitterX = (((h & 0xff) / 255) - 0.5) * 10
  const jitterY = ((((h >>> 8) & 0xff) / 255) - 0.5) * 4
  const rotation = (((h >>> 16) & 0xff) / 255) * 20 - 10
  const scaleJitter = 0.92 + (((h >>> 24) & 0xff) / 255) * 0.18
  const layerShift = layer % 2 === 1 ? SLOT_STEP / 2 : 0
  const x = GROUND_X_MIN + slot * SLOT_STEP + jitterX + layerShift
  const y = 250 + jitterY
  const scale = scaleJitter * Math.pow(0.95, layer)
  return { x, y, rotation, scale }
}

type Kind = 'leaf' | 'sprout' | 'flower' | 'berry' | 'reed' | 'tree'

function kindForTier(tier: Tier, sequence: number): Kind {
  if (tier === 'micro') return 'leaf'
  if (tier === 'small') return 'sprout'
  if (tier === 'large') return 'tree'
  const m = ((sequence % 3) + 3) % 3
  return m === 0 ? 'flower' : m === 1 ? 'berry' : 'reed'
}

function leafFill(variant: number) {
  return variant % 2 === 0 ? 'url(#leafGradA)' : 'url(#leafGradB)'
}
function flowerBloom(variant: number) {
  const m = ((variant % 3) + 3) % 3
  return m === 0 ? 'url(#bloomGrad)' : m === 1 ? 'url(#roseBloomGrad)' : 'url(#lavenderBloomGrad)'
}
function treeCanopy(variant: number) {
  return variant % 2 === 0 ? 'url(#canopy)' : 'url(#roseCanopy)'
}

// Ambient decor (tufts/bushes/sparkles/fireflies/butterflies/stars) is the
// mockup's atmosphere layer, not tied to logged elements — copied verbatim
// per phase from each artboard's renderVals().
const TUFT_X = [18, 34, 52, 70, 88, 108, 128, 150, 172, 196, 220, 244, 266, 288, 308, 328]
const TUFTS = TUFT_X.map((x, i) => ({ d: `M${x},250 q2,${i % 2 ? -9 : -7} 4,0` }))

function generateRays(n: number, r1: number, r2: number) {
  const rays: { x1: number; y1: number; x2: number; y2: number }[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    rays.push({
      x1: +(Math.cos(a) * r1).toFixed(1), y1: +(Math.sin(a) * r1).toFixed(1),
      x2: +(Math.cos(a) * r2).toFixed(1), y2: +(Math.sin(a) * r2).toFixed(1),
    })
  }
  return rays
}

function mkSpark(cx: number, cy: number, s: number, op: number) {
  const pts: [number, number][] = [[0, -6], [1.4, -1.4], [6, 0], [1.4, 1.4], [0, 6], [-1.4, 1.4], [-6, 0], [-1.4, -1.4]]
  const d = `M${pts.map(([x, y]) => `${(cx + x * s).toFixed(1)},${(cy + y * s).toFixed(1)}`).join(' L')} Z`
  return { d, op }
}

type Stop = { offset: string; color: string }

type PhaseConfig = {
  label: string
  caption: string
  orbKind: 'moon' | 'sun'
  orbCx: number; orbCy: number; orbRBlur: number; orbBlurOpacity: number; orbRCore: number; orbCoreOpacity?: number; orbBlurStdDev: number
  orbGradStops: Stop[]
  secondary: { cx: number; cy: number; r: number; opacity: number; fill: string }[]
  ray: { n: number; r1: number; r2: number; opacity: number; stroke: string; strokeWidth: number }
  stars: { cx: number; cy: number; r: number; op: number }[]
  horizonBand: [string, string]
  skyglow: { cy: string; r: string; stops: Stop[] }
  ground: [string, string]
  haze: [string, string, string]
  rakingLight: [string, string]
  groundLineStroke: string; groundLineWidth: number
  groundGlowRx: number; groundGlowRy: number
  vignetteStopOffset: string; vignetteStopOpacity: number
  grainAlpha: number
  aurora: boolean
  glowpool: boolean
  sparkleFill: string
  bushes: { transform: string }[]
  sparkles: { transform: string }[]
  fireflies: { cx: number; cy: number; r: number }[]
  butterflies: { transform: string; color: string }[]
}

const PHASE_CONFIG: Record<Phase, PhaseConfig> = {
  foundation: {
    label: 'Foundation',
    caption: 'Every small thing you log plants something new.',
    orbKind: 'moon', orbCx: 255, orbCy: 205, orbRBlur: 24, orbBlurOpacity: 0.4, orbRCore: 10, orbCoreOpacity: 0.75, orbBlurStdDev: 7,
    orbGradStops: [{ offset: '0%', color: '#EDEAF2' }, { offset: '55%', color: '#C9BFD6' }, { offset: '100%', color: '#8F86A8' }],
    secondary: [{ cx: 205, cy: 228, r: 9, opacity: 0.06, fill: '#C9BFD6' }, { cx: 160, cy: 243, r: 4.5, opacity: 0.08, fill: '#C9BFD6' }],
    ray: { n: 8, r1: 14, r2: 24, opacity: 0.22, stroke: '#C9BFD6', strokeWidth: 1.3 },
    stars: [
      { cx: 24, cy: 36, r: 1.3, op: 0.55 }, { cx: 60, cy: 22, r: 1, op: 0.4 }, { cx: 95, cy: 44, r: 1.5, op: 0.6 },
      { cx: 130, cy: 20, r: 1, op: 0.35 }, { cx: 20, cy: 60, r: 0.9, op: 0.3 },
      { cx: 160, cy: 16, r: 1.1, op: 0.4 }, { cx: 110, cy: 14, r: 0.9, op: 0.3 }, { cx: 50, cy: 90, r: 0.8, op: 0.25 },
      { cx: 200, cy: 30, r: 1, op: 0.35 }, { cx: 150, cy: 60, r: 0.8, op: 0.25 }, { cx: 80, cy: 20, r: 0.9, op: 0.3 }, { cx: 30, cy: 110, r: 0.7, op: 0.2 },
    ],
    horizonBand: ['rgba(130,120,150,0)', 'rgba(130,120,150,0.16)'],
    skyglow: { cy: '82%', r: '55%', stops: [{ offset: '0%', color: 'rgba(180,170,190,0.14)' }, { offset: '100%', color: 'rgba(180,170,190,0)' }] },
    ground: ['#233a2f', '#0a1a1540'],
    haze: ['rgba(200,195,215,0)', 'rgba(200,195,215,0.07)', 'rgba(200,195,215,0)'],
    rakingLight: ['rgba(180,175,200,0.14)', 'rgba(180,175,200,0)'],
    groundLineStroke: 'rgba(200,200,210,0.28)', groundLineWidth: 1.4,
    groundGlowRx: 230, groundGlowRy: 90,
    vignetteStopOffset: '55%', vignetteStopOpacity: 0.4,
    grainAlpha: 0.05,
    aurora: false, glowpool: false,
    sparkleFill: '#EDEAF2',
    bushes: [{ transform: 'translate(305,240) scale(0.7)' }],
    sparkles: [{ transform: 'translate(150,180) scale(0.6)' }],
    fireflies: [],
    butterflies: [],
  },
  structure: {
    label: 'Structure',
    caption: "Look how much you've already grown.",
    orbKind: 'sun', orbCx: 255, orbCy: 132, orbRBlur: 34, orbBlurOpacity: 0.6, orbRCore: 17, orbBlurStdDev: 8,
    orbGradStops: [{ offset: '0%', color: '#FFF3D0' }, { offset: '55%', color: '#F2A65A' }, { offset: '100%', color: '#E5793C' }],
    secondary: [
      { cx: 195, cy: 172, r: 13, opacity: 0.11, fill: '#F2A65A' },
      { cx: 140, cy: 202, r: 6.5, opacity: 0.13, fill: '#F2A65A' },
      { cx: 90, cy: 224, r: 3.5, opacity: 0.12, fill: '#FFE3C2' },
    ],
    ray: { n: 10, r1: 22, r2: 42, opacity: 0.4, stroke: '#F2A65A', strokeWidth: 1.6 },
    stars: [
      { cx: 24, cy: 20, r: 1, op: 0.3 }, { cx: 60, cy: 15, r: 0.9, op: 0.25 }, { cx: 320, cy: 20, r: 1, op: 0.3 }, { cx: 340, cy: 40, r: 0.8, op: 0.22 },
    ],
    horizonBand: ['rgba(242,150,110,0)', 'rgba(242,150,110,0.30)'],
    skyglow: { cy: '80%', r: '60%', stops: [{ offset: '0%', color: 'rgba(242,190,130,0.30)' }, { offset: '45%', color: 'rgba(229,169,60,0.12)' }, { offset: '100%', color: 'rgba(229,169,60,0)' }] },
    ground: ['#2a5a3d', '#0c241940'],
    haze: ['rgba(242,180,140,0)', 'rgba(242,180,140,0.12)', 'rgba(242,180,140,0)'],
    rakingLight: ['rgba(242,166,90,0.22)', 'rgba(242,166,90,0)'],
    groundLineStroke: 'rgba(242,166,90,0.5)', groundLineWidth: 1.6,
    groundGlowRx: 230, groundGlowRy: 90,
    vignetteStopOffset: '55%', vignetteStopOpacity: 0.4,
    grainAlpha: 0.05,
    aurora: false, glowpool: false,
    sparkleFill: '#FFF6DE',
    bushes: [{ transform: 'translate(15,240) scale(0.7)' }, { transform: 'translate(335,241) scale(0.75)' }],
    sparkles: [{ transform: 'translate(190,175) scale(0.8)' }, { transform: 'translate(90,190) scale(0.65)' }],
    fireflies: [{ cx: 130, cy: 170, r: 1.8 }, { cx: 250, cy: 190, r: 1.6 }],
    butterflies: [],
  },
  detail: {
    label: 'Detail',
    caption: 'This is what consistency looks like.',
    orbKind: 'sun', orbCx: 255, orbCy: 78, orbRBlur: 40, orbBlurOpacity: 0.65, orbRCore: 19, orbBlurStdDev: 9,
    orbGradStops: [{ offset: '0%', color: '#FFFAEA' }, { offset: '50%', color: '#F9C877' }, { offset: '100%', color: '#E88A3C' }],
    secondary: [
      { cx: 200, cy: 128, r: 15, opacity: 0.15, fill: '#F9C877' },
      { cx: 145, cy: 168, r: 7.5, opacity: 0.15, fill: '#F9C877' },
      { cx: 90, cy: 198, r: 4, opacity: 0.13, fill: '#FFE9C2' },
    ],
    ray: { n: 12, r1: 24, r2: 46, opacity: 0.5, stroke: '#F9C877', strokeWidth: 1.8 },
    stars: [],
    horizonBand: ['rgba(242,180,80,0)', 'rgba(242,180,80,0.42)'],
    skyglow: { cy: '78%', r: '65%', stops: [{ offset: '0%', color: 'rgba(242,200,121,0.42)' }, { offset: '45%', color: 'rgba(229,169,60,0.16)' }, { offset: '100%', color: 'rgba(229,169,60,0)' }] },
    ground: ['#2f7a4d', '#0e2c1e40'],
    haze: ['rgba(249,200,140,0)', 'rgba(249,200,140,0.15)', 'rgba(249,200,140,0)'],
    rakingLight: ['rgba(255,205,130,0.28)', 'rgba(255,205,130,0)'],
    groundLineStroke: 'rgba(255,205,130,0.65)', groundLineWidth: 1.8,
    groundGlowRx: 230, groundGlowRy: 90,
    vignetteStopOffset: '55%', vignetteStopOpacity: 0.4,
    grainAlpha: 0.05,
    aurora: false, glowpool: false,
    sparkleFill: '#FFF6DE',
    bushes: [{ transform: 'translate(15,240) scale(0.7)' }, { transform: 'translate(200,238) scale(0.6)' }, { transform: 'translate(335,241) scale(0.75)' }],
    sparkles: [
      { transform: 'translate(100,170) scale(0.8)' }, { transform: 'translate(255,160) scale(0.7)' },
      { transform: 'translate(175,150) scale(0.6)' }, { transform: 'translate(60,190) scale(0.7)' },
    ],
    fireflies: [{ cx: 120, cy: 170, r: 1.8 }, { cx: 210, cy: 190, r: 1.6 }, { cx: 280, cy: 160, r: 1.7 }, { cx: 60, cy: 200, r: 1.5 }],
    butterflies: [{ transform: 'translate(210,140) rotate(-8)', color: 'oklch(68% 0.15 12)' }],
  },
  landmark: {
    label: 'Landmark',
    caption: 'You built this — one day at a time.',
    orbKind: 'moon', orbCx: 270, orbCy: 52, orbRBlur: 40, orbBlurOpacity: 0.65, orbRCore: 18, orbBlurStdDev: 9,
    orbGradStops: [{ offset: '0%', color: '#FFF6DE' }, { offset: '55%', color: '#F2C879' }, { offset: '100%', color: '#D68A2E' }],
    secondary: [
      { cx: 215, cy: 102, r: 14, opacity: 0.11, fill: '#F2C879' },
      { cx: 155, cy: 148, r: 7, opacity: 0.11, fill: '#EDEAF2' },
      { cx: 100, cy: 182, r: 4, opacity: 0.11, fill: '#F2C879' },
    ],
    ray: { n: 12, r1: 22, r2: 40, opacity: 0.4, stroke: '#F2C879', strokeWidth: 1.5 },
    stars: [
      { cx: 24, cy: 36, r: 1.3, op: 0.6 }, { cx: 60, cy: 22, r: 1, op: 0.45 }, { cx: 95, cy: 44, r: 1.5, op: 0.65 },
      { cx: 130, cy: 20, r: 1, op: 0.4 }, { cx: 200, cy: 50, r: 0.9, op: 0.35 }, { cx: 20, cy: 60, r: 0.9, op: 0.35 },
      { cx: 160, cy: 16, r: 1.1, op: 0.45 }, { cx: 340, cy: 80, r: 0.9, op: 0.35 }, { cx: 330, cy: 20, r: 1, op: 0.45 },
      { cx: 75, cy: 70, r: 0.8, op: 0.3 }, { cx: 110, cy: 14, r: 0.9, op: 0.35 }, { cx: 230, cy: 18, r: 1, op: 0.4 },
      { cx: 45, cy: 15, r: 0.8, op: 0.3 }, { cx: 290, cy: 35, r: 0.9, op: 0.35 },
    ],
    horizonBand: ['rgba(120,90,160,0)', 'rgba(120,90,160,0.22)'],
    skyglow: { cy: '82%', r: '65%', stops: [{ offset: '0%', color: 'rgba(242,200,121,0.42)' }, { offset: '45%', color: 'rgba(229,169,60,0.16)' }, { offset: '100%', color: 'rgba(229,169,60,0)' }] },
    ground: ['#194227', '#071a1240'],
    haze: ['rgba(230,220,255,0)', 'rgba(230,220,255,0.09)', 'rgba(230,220,255,0)'],
    rakingLight: ['rgba(242,200,150,0.20)', 'rgba(242,200,150,0)'],
    groundLineStroke: 'rgba(232,225,255,0.4)', groundLineWidth: 1.6,
    groundGlowRx: 240, groundGlowRy: 95,
    vignetteStopOffset: '50%', vignetteStopOpacity: 0.48,
    grainAlpha: 0.06,
    aurora: true, glowpool: true,
    sparkleFill: '#FFF6DE',
    bushes: [
      { transform: 'translate(15,240) scale(0.7)' }, { transform: 'translate(200,238) scale(0.55)' },
      { transform: 'translate(335,241) scale(0.75)' }, { transform: 'translate(120,239) scale(0.5)' },
    ],
    sparkles: [
      { transform: 'translate(140,110) scale(0.9)' }, { transform: 'translate(255,90) scale(0.8)' },
      { transform: 'translate(60,150) scale(0.6)' }, { transform: 'translate(310,140) scale(0.7)' },
      { transform: 'translate(200,70) scale(0.6)' }, { transform: 'translate(95,180) scale(0.55)' },
      { transform: 'translate(175,200) scale(0.5)' },
    ],
    fireflies: [
      { cx: 100, cy: 130, r: 1.9 }, { cx: 200, cy: 110, r: 1.7 }, { cx: 270, cy: 150, r: 1.8 },
      { cx: 60, cy: 170, r: 1.5 }, { cx: 320, cy: 100, r: 1.6 }, { cx: 150, cy: 90, r: 1.5 }, { cx: 230, cy: 180, r: 1.6 },
    ],
    butterflies: [
      { transform: 'translate(190,120) rotate(-8)', color: 'oklch(68% 0.15 12)' },
      { transform: 'translate(90,100) rotate(12)', color: 'oklch(68% 0.13 298)' },
    ],
  },
}
const LANDMARK_HERO_SPARKS = [
  mkSpark(50, 30, 1.4, 0.85), mkSpark(310, 40, 1.6, 0.8),
  mkSpark(150, 45, 1.2, 0.7), mkSpark(20, 90, 1.1, 0.65),
]

function Leaf({ fill }: { fill: string }) {
  return (
    <>
      <ellipse cx={0} cy={1} rx={8} ry={2.5} fill="rgba(0,0,0,0.28)" />
      <path d="M0,0 C-8,-8 -8,-20 0,-25 C8,-20 8,-8 0,0 Z" fill={fill} />
      <path d="M0,-2 L0,-21" stroke="rgba(255,255,255,0.22)" strokeWidth={1} />
    </>
  )
}
function Sprout() {
  return (
    <>
      <ellipse cx={0} cy={1} rx={10} ry={3} fill="rgba(0,0,0,0.28)" />
      <path d="M0,0 Q-3,-16 0,-30" stroke="#2f6b4d" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <path d="M0,-12 Q-12,-16 -15,-6 Q-6,-5 0,-12 Z" fill="url(#leafGradA)" />
      <path d="M0,-18 Q12,-23 15,-13 Q6,-11 0,-18 Z" fill="url(#leafGradB)" />
      <path d="M0,-24 Q-9,-27 -10,-19 Q-3,-19 0,-24 Z" fill="url(#leafGradA)" opacity={0.9} />
      <circle cx={0} cy={-31} r={2.6} fill="#F2C879" />
    </>
  )
}
function Flower({ bloom }: { bloom: string }) {
  return (
    <>
      <ellipse cx={0} cy={1} rx={13} ry={3.5} fill="rgba(0,0,0,0.3)" />
      <path d="M0,0 Q-4,-20 0,-40" stroke="#2f6b4d" strokeWidth={3} fill="none" strokeLinecap="round" />
      <path d="M0,-24 Q-14,-29 -16,-16 Q-5,-14 0,-24 Z" fill="url(#leafGradA)" />
      <path d="M0,-30 Q14,-35 17,-22 Q6,-20 0,-30 Z" fill="url(#leafGradB)" />
      <g transform="translate(0,-48)">
        <g fill={bloom}>
          <ellipse cx={0} cy={-8} rx={5.5} ry={9} />
          <ellipse cx={0} cy={-8} rx={5.5} ry={9} transform="rotate(60)" />
          <ellipse cx={0} cy={-8} rx={5.5} ry={9} transform="rotate(120)" />
          <ellipse cx={0} cy={-8} rx={5.5} ry={9} transform="rotate(180)" />
          <ellipse cx={0} cy={-8} rx={5.5} ry={9} transform="rotate(240)" />
          <ellipse cx={0} cy={-8} rx={5.5} ry={9} transform="rotate(300)" />
        </g>
        <circle cx={0} cy={0} r={4.5} fill="#E5A93C" />
      </g>
    </>
  )
}
function Berry() {
  return (
    <>
      <ellipse cx={0} cy={1} rx={11} ry={3} fill="rgba(0,0,0,0.3)" />
      <path d="M0,0 Q-3,-18 0,-36" stroke="#2f6b4d" strokeWidth={2.8} fill="none" strokeLinecap="round" />
      <path d="M0,-20 Q-12,-24 -13,-12 Q-4,-11 0,-20 Z" fill="url(#leafGradA)" />
      <path d="M0,-26 Q11,-30 13,-18 Q4,-17 0,-26 Z" fill="url(#leafGradB)" />
      <g transform="translate(0,-40)" fill="url(#berryGrad)">
        <circle cx={-5} cy={0} r={4} />
        <circle cx={4} cy={-3} r={4.2} />
        <circle cx={0} cy={4} r={4} />
        <circle cx={6} cy={4} r={3.6} />
        <circle cx={-3} cy={-6} r={3.4} />
      </g>
    </>
  )
}
function Reed() {
  return (
    <>
      <path d="M-4,0 Q-8,-24 -3,-38" stroke="url(#leafGradA)" strokeWidth={2} fill="none" strokeLinecap="round" />
      <path d="M0,0 Q0,-30 2,-46" stroke="url(#leafGradB)" strokeWidth={2.2} fill="none" strokeLinecap="round" />
      <path d="M4,0 Q9,-22 6,-34" stroke="url(#leafGradA)" strokeWidth={1.8} fill="none" strokeLinecap="round" />
    </>
  )
}
function Tree({ canopy }: { canopy: string }) {
  return (
    <>
      <ellipse cx={0} cy={2} rx={42} ry={9} fill="rgba(0,0,0,0.35)" />
      <path d="M0,0 L0,-64" stroke="#2c5a42" strokeWidth={8} strokeLinecap="round" />
      <path d="M-4,-30 Q-16,-24 -14,-10" stroke="#2c5a42" strokeWidth={4} fill="none" strokeLinecap="round" />
      <path d="M5,-40 Q18,-35 17,-20" stroke="#2c5a42" strokeWidth={4} fill="none" strokeLinecap="round" />
      <g filter="url(#treeGlow)" fill={canopy}>
        <ellipse cx={-24} cy={-78} rx={26} ry={24} />
        <ellipse cx={22} cy={-84} rx={28} ry={26} />
        <ellipse cx={-6} cy={-100} rx={27} ry={25} />
        <ellipse cx={16} cy={-104} rx={24} ry={22} />
        <ellipse cx={0} cy={-116} rx={22} ry={20} />
      </g>
      <circle cx={-10} cy={-100} r={4} fill="#F2C879" />
      <circle cx={14} cy={-90} r={3.5} fill="#E5A93C" />
      <circle cx={4} cy={-118} r={3.5} fill="#F2C879" />
      <circle cx={-18} cy={-84} r={3} fill="#E5A93C" />
      <circle cx={24} cy={-96} r={3} fill="#F2C879" />
    </>
  )
}

function ElementNode({ el, entering }: { el: BuilderElement; entering: boolean }) {
  const kind = kindForTier(el.tier, el.sequence)
  const placement = computePlacement(el)
  const outerTransform = `translate(${placement.x.toFixed(2)},${placement.y.toFixed(2)}) rotate(${placement.rotation.toFixed(1)}) scale(${placement.scale.toFixed(3)})`
  return (
    <g transform={outerTransform}>
      <g
        style={{
          opacity: entering ? 0 : 1,
          transform: entering ? 'scale(0.35)' : 'scale(1)',
          transformOrigin: '0px 0px',
          transition: 'opacity .55s ease, transform .55s cubic-bezier(.22,.61,.36,1)',
        }}
      >
        <title>{SOURCE_LABEL[el.sourceType]}</title>
        {kind === 'leaf' && <Leaf fill={leafFill(el.variant)} />}
        {kind === 'sprout' && <Sprout />}
        {kind === 'flower' && <Flower bloom={flowerBloom(el.variant)} />}
        {kind === 'berry' && <Berry />}
        {kind === 'reed' && <Reed />}
        {kind === 'tree' && <Tree canopy={treeCanopy(el.variant)} />}
      </g>
    </g>
  )
}

function GardenDefs({ cfg }: { cfg: PhaseConfig }) {
  return (
    <defs>
      <linearGradient id="horizonBand" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={cfg.horizonBand[0]} />
        <stop offset="100%" stopColor={cfg.horizonBand[1]} />
      </linearGradient>
      <radialGradient id="skyglow" cx="50%" cy={cfg.skyglow.cy} r={cfg.skyglow.r}>
        {cfg.skyglow.stops.map((s, i) => <stop key={i} offset={s.offset} stopColor={s.color} />)}
      </radialGradient>
      <radialGradient id="orb" cx="42%" cy="38%" r="60%">
        {cfg.orbGradStops.map((s, i) => <stop key={i} offset={s.offset} stopColor={s.color} />)}
      </radialGradient>
      <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={cfg.ground[0]} />
        <stop offset="100%" stopColor={cfg.ground[1]} />
      </linearGradient>
      <linearGradient id="leafGradA" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="oklch(78% 0.18 145)" />
        <stop offset="100%" stopColor="oklch(44% 0.11 158)" />
      </linearGradient>
      <linearGradient id="leafGradB" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="oklch(74% 0.16 136)" />
        <stop offset="100%" stopColor="oklch(42% 0.10 152)" />
      </linearGradient>
      <radialGradient id="bloomGrad" cx="35%" cy="30%" r="75%">
        <stop offset="0%" stopColor="#FFF3D6" />
        <stop offset="55%" stopColor="#F2C879" />
        <stop offset="100%" stopColor="#E5A93C" />
      </radialGradient>
      <radialGradient id="roseBloomGrad" cx="35%" cy="30%" r="75%">
        <stop offset="0%" stopColor="#FFE3EC" />
        <stop offset="55%" stopColor="oklch(72% 0.15 15)" />
        <stop offset="100%" stopColor="oklch(56% 0.16 10)" />
      </radialGradient>
      <radialGradient id="lavenderBloomGrad" cx="35%" cy="30%" r="75%">
        <stop offset="0%" stopColor="#F1E9FF" />
        <stop offset="55%" stopColor="oklch(72% 0.12 300)" />
        <stop offset="100%" stopColor="oklch(55% 0.13 295)" />
      </radialGradient>
      <radialGradient id="berryGrad" cx="35%" cy="30%" r="75%">
        <stop offset="0%" stopColor="#FFD9DE" />
        <stop offset="55%" stopColor="oklch(58% 0.18 20)" />
        <stop offset="100%" stopColor="oklch(38% 0.15 15)" />
      </radialGradient>
      <radialGradient id="canopy" cx="35%" cy="28%" r="75%">
        <stop offset="0%" stopColor="oklch(80% 0.17 140)" />
        <stop offset="55%" stopColor="oklch(58% 0.13 150)" />
        <stop offset="100%" stopColor="oklch(38% 0.09 158)" />
      </radialGradient>
      <radialGradient id="roseCanopy" cx="35%" cy="28%" r="75%">
        <stop offset="0%" stopColor="#FFE9EF" />
        <stop offset="45%" stopColor="oklch(72% 0.14 12)" />
        <stop offset="100%" stopColor="oklch(48% 0.12 8)" />
      </radialGradient>
      <linearGradient id="auroraRose" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="oklch(70% 0.15 15)" />
        <stop offset="100%" stopColor="rgba(0,0,0,0)" />
      </linearGradient>
      <linearGradient id="auroraGreen" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="oklch(70% 0.15 145)" />
        <stop offset="100%" stopColor="rgba(0,0,0,0)" />
      </linearGradient>
      <radialGradient id="glowpool" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="rgba(242,200,121,0.5)" />
        <stop offset="100%" stopColor="rgba(242,200,121,0)" />
      </radialGradient>
      <filter id="treeGlow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="6.5" result="blur" />
        <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.9  0 0 0 0 0.66  0 0 0 0 0.23  0 0 0 0.5 0" />
        <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="fireflyGlow" x="-250%" y="-250%" width="600%" height="600%">
        <feGaussianBlur stdDeviation="2.4" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="orbBlur" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation={cfg.orbBlurStdDev} />
      </filter>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} stitchTiles="stitch" result="n" />
        <feColorMatrix in="n" type="matrix" values={`0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${cfg.grainAlpha} 0`} />
      </filter>
      <radialGradient id="vignette" cx="50%" cy="46%" r="75%">
        <stop offset={cfg.vignetteStopOffset} stopColor="rgba(0,0,0,0)" />
        <stop offset="100%" stopColor={`rgba(0,0,0,${cfg.vignetteStopOpacity})`} />
      </radialGradient>
      <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={cfg.haze[0]} />
        <stop offset="50%" stopColor={cfg.haze[1]} />
        <stop offset="100%" stopColor={cfg.haze[2]} />
      </linearGradient>
      <linearGradient id="rakingLight" x1="1" y1="0" x2="0.3" y2="1">
        <stop offset="0%" stopColor={cfg.rakingLight[0]} />
        <stop offset="55%" stopColor={cfg.rakingLight[1]} />
      </linearGradient>
    </defs>
  )
}

function GardenScene({ phase, elements, pendingIds }: { phase: Phase; elements: BuilderElement[]; pendingIds: Set<string> }) {
  const cfg = PHASE_CONFIG[phase]
  const rays = generateRays(cfg.ray.n, cfg.ray.r1, cfg.ray.r2)
  const heroStars = phase === 'landmark' ? LANDMARK_HERO_SPARKS : []
  const placed = elements.length > MAX_PLACED ? elements.slice(-MAX_PLACED) : elements

  return (
    <svg viewBox="0 0 350 280" width="100%" style={{ display: 'block', overflow: 'visible' }}>
      <GardenDefs cfg={cfg} />

      {cfg.aurora && (
        <>
          <path d="M-20,110 Q100,55 175,85 Q260,115 370,70 L370,150 Q260,180 175,140 Q100,120 -20,160 Z" fill="url(#auroraGreen)" opacity={0.14} />
          <path d="M-20,75 Q100,30 175,58 Q260,85 370,42 L370,100 Q260,120 175,92 Q100,75 -20,108 Z" fill="url(#auroraRose)" opacity={0.16} />
        </>
      )}

      <g transform={`translate(${cfg.orbCx},${cfg.orbCy})`} opacity={cfg.ray.opacity}>
        {rays.map((r, i) => (
          <line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke={cfg.ray.stroke} strokeWidth={cfg.ray.strokeWidth} strokeLinecap="round" />
        ))}
      </g>
      <circle cx={cfg.orbCx} cy={cfg.orbCy} r={cfg.orbRBlur} fill="url(#orb)" opacity={cfg.orbBlurOpacity} filter="url(#orbBlur)" />
      <circle cx={cfg.orbCx} cy={cfg.orbCy} r={cfg.orbRCore} fill="url(#orb)" opacity={cfg.orbCoreOpacity ?? 1} />
      {cfg.secondary.map((s, i) => <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} opacity={s.opacity} />)}
      {cfg.stars.map((s, i) => <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="#FDF4E0" opacity={s.op} />)}
      {heroStars.map((h, i) => <path key={i} d={h.d} fill="#FFFAEA" opacity={h.op} />)}

      <rect x={0} y={140} width={350} height={112} fill="url(#horizonBand)" />
      <rect x={0} y={185} width={350} height={60} fill="url(#haze)" />

      <path d="M0,255 Q90,235 175,248 Q260,236 350,252 L350,280 L0,280 Z" fill="#0a2b1f" opacity={0.65} />
      {cfg.bushes.map((b, i) => (
        <g key={i} transform={b.transform} opacity={0.5}>
          <ellipse cx={-8} cy={0} rx={12} ry={10} fill="#123825" />
          <ellipse cx={8} cy={-2} rx={13} ry={11} fill="#0f3020" />
          <ellipse cx={0} cy={-8} rx={11} ry={9} fill="#14402a" />
        </g>
      ))}
      <ellipse cx={175} cy={250} rx={cfg.groundGlowRx} ry={cfg.groundGlowRy} fill="url(#skyglow)" />
      <path d="M0,242 Q175,226 350,242 L350,280 L0,280 Z" fill="url(#ground)" />
      <path d="M0,242 Q175,226 350,242 L350,280 L0,280 Z" fill="url(#rakingLight)" />
      <path d="M0,242 Q175,226 350,242" fill="none" stroke={cfg.groundLineStroke} strokeWidth={cfg.groundLineWidth} />
      {cfg.glowpool && (
        <>
          <ellipse cx={140} cy={250} rx={55} ry={14} fill="url(#glowpool)" />
          <ellipse cx={255} cy={250} rx={50} ry={13} fill="url(#glowpool)" />
        </>
      )}
      {TUFTS.map((t, i) => <path key={i} d={t.d} stroke="#2f6b4d" strokeWidth={1.4} strokeLinecap="round" fill="none" opacity={0.55} />)}

      {placed.map((el) => <ElementNode key={el.id} el={el} entering={pendingIds.has(el.id)} />)}

      {cfg.sparkles.map((sp, i) => (
        <g key={i} transform={sp.transform} filter="url(#fireflyGlow)">
          <path d="M0,-6 L1.4,-1.4 L6,0 L1.4,1.4 L0,6 L-1.4,1.4 L-6,0 L-1.4,-1.4 Z" fill={cfg.sparkleFill} />
        </g>
      ))}
      {cfg.butterflies.map((bf, i) => (
        <g key={i} transform={bf.transform}>
          <path d="M0,0 C-6,-8 -12,-6 -10,2 C-8,7 -2,4 0,0 Z" fill={bf.color} />
          <path d="M0,0 C6,-8 12,-6 10,2 C8,7 2,4 0,0 Z" fill={bf.color} />
          <line x1={0} y1={-4} x2={0} y2={4} stroke="#2c2216" strokeWidth={1} />
        </g>
      ))}
      {cfg.fireflies.map((f, i) => <circle key={i} cx={f.cx} cy={f.cy} r={f.r} fill="#F2C879" filter="url(#fireflyGlow)" />)}

      <rect x={0} y={0} width={350} height={280} filter="url(#grain)" />
      <rect x={0} y={0} width={350} height={280} fill="url(#vignette)" />
    </svg>
  )
}

const CARD_BG = 'radial-gradient(80% 60% at 50% 38%, rgba(229,169,60,0.14), transparent 60%), radial-gradient(140% 100% at 50% 115%, rgba(0,0,0,0.7), transparent 55%), linear-gradient(180deg, #06231a 0%, #021F16 45%, #010b07 100%)'

export default function BuilderView() {
  const [phase, setPhase] = useState<Phase>('foundation')
  const [elements, setElements] = useState<BuilderElement[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const seenIds = useRef<Set<string>>(new Set())
  const hasLoadedOnce = useRef(false)

  const load = async () => {
    try {
      const res = await fetch('/api/plan/builder')
      if (!res.ok) return
      const json: BuilderResponse = await res.json()
      const els = [...(json.elements || [])].sort((a, b) => a.sequence - b.sequence)
      const isFirstLoad = !hasLoadedOnce.current
      const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const fresh = isFirstLoad || reducedMotion ? [] : els.filter((e) => !seenIds.current.has(e.id))
      els.forEach((e) => seenIds.current.add(e.id))
      setPhase(json.phase)
      setTotalCount(json.totalCount ?? els.length)
      setElements(els)
      if (fresh.length) {
        setPendingIds((prev) => {
          const next = new Set(prev)
          fresh.forEach((e) => next.add(e.id))
          return next
        })
      }
    } finally {
      setLoading(false)
      hasLoadedOnce.current = true
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // Release freshly-added elements from their "entering" state one frame
  // after mount, so the browser paints the pre-transition (scale 0.35,
  // opacity 0) frame first and the CSS transition then animates them in —
  // same double-render RAF pattern as Ring.tsx's animateOnMount.
  useEffect(() => {
    if (pendingIds.size === 0) return
    const id = requestAnimationFrame(() => setPendingIds(new Set()))
    return () => cancelAnimationFrame(id)
  }, [pendingIds])

  if (loading) {
    return <div className="rounded-3xl animate-pulse" style={{ background: CARD_BG, border: '1.5px solid rgba(229,169,60,0.3)', minHeight: 360 }} />
  }

  if (!elements.length && !totalCount) {
    return (
      <div className="rounded-3xl p-6 text-center" style={{ background: CARD_BG, border: '1.5px solid rgba(229,169,60,0.3)' }}>
        <p className="text-ivory/50 text-sm">Your garden will start growing here once you log your first action.</p>
      </div>
    )
  }

  const cfg = PHASE_CONFIG[phase]

  return (
    <div
      className="w-full rounded-3xl"
      style={{
        padding: '22px 18px 20px', boxSizing: 'border-box', overflow: 'hidden', position: 'relative',
        maxWidth: 440, marginLeft: 'auto', marginRight: 'auto',
        background: CARD_BG,
        border: '1.5px solid rgba(229,169,60,0.3)',
        boxShadow: '0 0 24px -8px rgba(229,169,60,0.3), inset 0 1px 0 rgba(255,255,255,0.07), inset 0 0 44px rgba(0,0,0,0.28)',
      }}
    >
      <div style={{ color: '#E5A93C', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 14 }}>
        {cfg.label}
      </div>
      <GardenScene phase={phase} elements={elements} pendingIds={pendingIds} />
      <p style={{ fontFamily: 'var(--font-fraunces)', fontStyle: 'italic', fontWeight: 600, color: '#ffffff', fontSize: 15, lineHeight: 1.4, margin: '16px 0 0', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
        {cfg.caption}
      </p>
    </div>
  )
}
