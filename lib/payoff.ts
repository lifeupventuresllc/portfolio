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
