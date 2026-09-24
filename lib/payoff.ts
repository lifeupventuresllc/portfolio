// Her real, stored reason for doing this — "What's your why?" (2026-09-24,
// Asa's ask: from a prompt spec, "tie it to what SHE cares about... ask her
// and remember it. Do not assume."). Multi-select, optional, never guessed.
// Read everywhere as ONE source (this file + the stored array), never
// re-derived or duplicated — the next-action engine, pushes, and the intake/
// preferences UI all read the exact same list below.

export type Payoff = 'energy' | 'kids' | 'mood' | 'family' | 'look'

export const PAYOFF_OPTIONS: { v: Payoff; label: string; desc: string }[] = [
  { v: 'energy', label: 'My energy', desc: 'Feeling less drained day to day' },
  { v: 'kids', label: 'My kids', desc: 'Keeping up with them, being present' },
  { v: 'mood', label: 'My mood', desc: 'Feeling steadier, less on edge' },
  { v: 'family', label: 'My family', desc: 'Being around, in good shape, longer' },
  { v: 'look', label: 'How I want to look', desc: 'Feeling good in my own skin' },
]

const VALID = new Set<string>(PAYOFF_OPTIONS.map((o) => o.v))

export function parseStoredPayoffs(raw: unknown): Payoff[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((v): v is Payoff => typeof v === 'string' && VALID.has(v))
}
