// Her real, stored reason for doing this — "What's your why?" (2026-09-24,
// Asa's ask: from a prompt spec, "tie it to what SHE cares about... ask her
// and remember it. Do not assume."). Multi-select, optional, never guessed.
// Read everywhere as ONE source (this file + the stored array), never
// re-derived or duplicated — the next-action engine, pushes, and the intake/
// preferences UI all read the exact same list below.

export type Payoff = 'energy' | 'kids' | 'mood' | 'family' | 'look' | 'health' | 'confidence'

export const PAYOFF_OPTIONS: { v: Payoff; label: string; desc: string }[] = [
  { v: 'energy', label: 'My energy', desc: 'Feeling less drained day to day' },
  { v: 'kids', label: 'My kids', desc: 'Keeping up with them, being present' },
  { v: 'mood', label: 'My mood', desc: 'Feeling steadier, less on edge' },
  { v: 'family', label: 'My family', desc: 'Being around, in good shape, longer' },
  { v: 'look', label: 'How I want to look', desc: 'Feeling good in my own skin' },
  // Added 2026-10-25 with the new intake (Asa's mockup): health + confidence.
  { v: 'health', label: 'My health', desc: 'Feeling strong and well for years' },
  { v: 'confidence', label: 'Confidence', desc: 'Walking in the room feeling like me' },
]

const VALID = new Set<string>(PAYOFF_OPTIONS.map((o) => o.v))

export function parseStoredPayoffs(raw: unknown): Payoff[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((v): v is Payoff => typeof v === 'string' && VALID.has(v))
}

// Short "who it's for" line shown on Home and My Day (2026-10-25). Her own
// typed words win; else her first picked reason; null when she gave none.
const WHY_TITLE: Record<string, string> = {
  energy: 'For your energy.', kids: 'For your kids.', mood: 'For your peace of mind.', family: 'For your family.',
  look: 'For you, feeling good in your skin.', health: 'For your health.', confidence: 'For your confidence.',
}
export function whyTitle(payoffs: unknown, whyOwn?: unknown): string | null {
  if (typeof whyOwn === 'string' && whyOwn.trim()) return `“${whyOwn.trim()}”`
  const first = parseStoredPayoffs(payoffs).find((p) => WHY_TITLE[p])
  return first ? WHY_TITLE[first] : null
}

// Self-talk from HER why (2026-10-29, Asa: "the self talk should be generated
// based off that user's specific why"). First person, short enough to say to
// herself mid-set. One line a day, rotating through every reason she picked.
const WHY_SELF_TALK: Record<Payoff, string[]> = {
  energy: [
    'I move my body so my body can carry my day.',
    'Every rep today is energy I get back tonight.',
    'I feel better when I show up. So I show up.',
    'Tired is not the same as done. I can do one more thing for me.',
    'I am building the energy I want to wake up with.',
  ],
  kids: [
    'My kids are watching how I take care of me.',
    'I want to keep up with them, so I keep going.',
    'Strong for them starts with strong for me.',
    'I am the example I want them to have.',
    'Every workout is more years and more energy for my babies.',
  ],
  mood: [
    'This is my time to clear my head.',
    'I feel steadier every time I keep a promise to myself.',
    'Moving is how I let the stress out.',
    'I protect my peace by taking care of my body.',
    'A calmer me starts with this one workout.',
  ],
  family: [
    'I am doing this so I am around, and well, for a long time.',
    'My family deserves the healthiest version of me.',
    'Taking care of me is taking care of them.',
    'I am building years, not just a body.',
    'Every good choice today is for the people I love.',
  ],
  look: [
    'I am becoming the woman I picture, one day at a time.',
    'I love my body enough to take care of it.',
    'I am proud of who I see getting stronger.',
    'Feeling good in my skin is worth today’s effort.',
    'My glow-up is built on days like this one.',
  ],
  health: [
    'Healthy is something I do, not something I wish for.',
    'I am adding strong years to my life today.',
    'My health is my wealth, and I am investing today.',
    'Every meal and every move is a vote for my health.',
    'I take care of my body because it takes care of me.',
  ],
  confidence: [
    'I keep promises to myself. That is where confidence comes from.',
    'I walk in the room feeling like me.',
    'Every set I finish proves I can.',
    'I am more capable than I was yesterday.',
    'I trust myself because I show up for myself.',
  ],
}

export interface WhyLine { why: string; talk: string }

/** Her reasons, each with today's self-talk line. Her own typed words come
 *  first (paired with a line from her first picked reason, or a general one). */
export function whyLines(payoffs: unknown, whyOwn: unknown, dayNumber: number): WhyLine[] {
  const picks = parseStoredPayoffs(payoffs)
  const line = (p: Payoff, k = 0) => { const l = WHY_SELF_TALK[p]; return l[(((dayNumber + k) % l.length) + l.length) % l.length] }
  const out: WhyLine[] = []
  const own = typeof whyOwn === 'string' ? whyOwn.trim() : ''
  if (own) {
    const talk = picks.length ? line(picks[0], 3) : ['I am doing this for a reason that matters to me.', 'I remember why I started, and I keep going.', 'One more day of showing up for what I care about.'][((dayNumber % 3) + 3) % 3]
    out.push({ why: `For “${own}.”`.replace('..”', '.”'), talk })
  }
  picks.forEach((p, i) => out.push({ why: WHY_TITLE[p], talk: line(p, i) }))
  return out
}

/** Today's one self-talk line, rotating through her reasons day by day. */
export function selfTalkForDay(payoffs: unknown, whyOwn: unknown, dayNumber: number): string | null {
  const lines = whyLines(payoffs, whyOwn, dayNumber)
  if (!lines.length) return null
  return lines[((dayNumber % lines.length) + lines.length) % lines.length].talk
}
