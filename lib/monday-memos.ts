// ============================================================
// Monday Voice Memo — Challenge + Inner Circle exclusive
// Asa's idea: a short pre-recorded voice memo, in his own voice, that lands
// automatically each Monday — "his voice personally about her week," cheap to
// batch-produce (a handful of memos, not one per member) but auto-matched to
// her ACTUAL week so it never feels generic.
//
// Filtered through the two-problem lens:
//   #1 (time/decisions) — zero decisions required. No browsing, no picking a
//   memo. It just shows up on the one day it's relevant, she taps play or
//   dismisses, done.
//   #2 (consistency without willpower) — reinforces the personal-coaching
//   bond (a real human noticed her actual week) without requiring her to
//   reach out first, and the "off_track" slot is written non-punishing —
//   same "recovery, not punishment" philosophy as the rest of the app.
//
// Nothing plays until Asa actually records real audio — every slot's
// audioUrl starts unset, so this ships as inert plumbing (zero visible
// change) exactly like the exercise-image and early-access-content patterns
// elsewhere in this codebase.
// ============================================================

export type MemoSlot = 'crushing_it' | 'on_track' | 'off_track' | 'default'

export interface MondayMemo {
  slot: MemoSlot
  title: string
  subtitle: string
  audioUrl?: string // set by Asa once he records it — unset = memo stays invisible
}

export const MONDAY_MEMOS: MondayMemo[] = [
  { slot: 'crushing_it', title: 'You’re Crushing It', subtitle: 'A quick one from Coach Asa — keep this going.' },
  { slot: 'on_track', title: 'Staying Steady', subtitle: 'A quick check-in from Coach Asa on your week.' },
  { slot: 'off_track', title: 'Let’s Reset Together', subtitle: 'A quick one from Coach Asa — no judgment, just next steps.' },
  { slot: 'default', title: 'Your Week Ahead', subtitle: 'A quick note from Coach Asa to kick off your week.' },
]

export function mondayMemoFor(slot: MemoSlot): MondayMemo | undefined {
  return MONDAY_MEMOS.find((m) => m.slot === slot)
}

// Picks the slot from her ACTUAL prior week — not a manual choice by Asa or her.
// completedLastWeek/daysPerWeek = how many of her scheduled workout days she
// showed up for; streakDays = her current showed-up streak (already computed
// elsewhere with the same streak-insurance grace-day logic).
export function selectMondayMemoSlot(input: { completedLastWeek: number; daysPerWeek: number; streakDays: number }): MemoSlot {
  const rate = input.daysPerWeek > 0 ? input.completedLastWeek / input.daysPerWeek : 0
  if (rate >= 0.9 && input.streakDays >= 5) return 'crushing_it'
  if (rate >= 0.5) return 'on_track'
  if (input.completedLastWeek > 0 || input.streakDays > 0) return 'off_track'
  return 'default'
}
