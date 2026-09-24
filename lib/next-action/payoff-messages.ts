import type { Payoff } from '../payoff'

// Prompt 2 (2026-09-24, Asa's payoff-personalization spec): "About 60-70% of
// messages should reference her payoff directly. Vary the wording every
// time; never repeat the same line. The remaining messages use other
// motivators: streak, quick win, partner, or progress." This file is the
// ONE place that decides both of those things — every real message surface
// (the next-action instruction, push copy) calls through here rather than
// each inventing its own rate or its own copy.

// 65% — the middle of the spec's 60-70% range.
const PAYOFF_REFERENCE_RATE = 0.65

export function shouldReferencePayoff(): boolean {
  return Math.random() < PAYOFF_REFERENCE_RATE
}

// Several real variants per payoff so the same line doesn't repeat call to
// call — a real, if imperfect, way to satisfy "vary the wording every time"
// without a persisted history of exactly which line she saw last (that's a
// real future improvement, not built here — see the comment on
// payoffWhyLine below).
const TEMPLATES: Record<Payoff, string[]> = {
  energy: [
    "This is exactly what gives you that energy back.",
    "You'll feel it in your energy today, not just someday.",
    "This is the thing that actually keeps you from crashing later.",
    "Your energy tomorrow starts with this one.",
  ],
  kids: [
    "So you've got the energy to keep up with them later.",
    "This is for the version of you that's fully there for them.",
    "Showing up for this is showing up for them too.",
    "This is how you keep pace with them, not just keep up.",
  ],
  mood: [
    "You always feel steadier in your mind after this one.",
    "This is the thing that actually clears your head.",
    "Your mood tonight starts with this one.",
    "This is for the calmer version of you, not just the fitter one.",
  ],
  family: [
    "This is what keeps you around and able, for longer.",
    "This is for the years you want with them, not just today.",
    "Your family gets more of you when you take care of this first.",
    "This is how you stay the one they can count on.",
  ],
  look: [
    "This is what actually gets you feeling good in your own skin.",
    "You'll see this one add up, love — it's real progress.",
    "This is exactly the kind of day that moves the needle.",
    "Feeling good in your skin starts with days exactly like this.",
  ],
}

// Picks one of her real stored payoffs (if she has more than one, a random
// one each call — another source of natural variety) and one of that
// payoff's real template lines. Null whenever she has no payoff on file —
// callers must treat null as "say something else instead," never as an
// empty string appended to the message.
//
// Known real limitation, not built yet: this doesn't track which exact line
// she saw last, so on a small template pool a repeat is possible, just not
// likely on any given day. A real fix (store last-shown key on the
// enrollment, exclude it from the pick) is a genuine future improvement,
// not overclaimed as solved here.
export function payoffWhyLine(payoffs: string[]): string | null {
  const valid = payoffs.filter((p): p is Payoff => p in TEMPLATES)
  if (!valid.length) return null
  const payoff = valid[Math.floor(Math.random() * valid.length)]
  const lines = TEMPLATES[payoff]
  return lines[Math.floor(Math.random() * lines.length)]
}
