import { addDaysISO } from '@/lib/localdate'

// Shared by /api/plan/daily (dashboard streak chip) and /api/plan/monday-memo
// (picks which memo slot fits her actual week) — same streak-insurance grace-day
// logic in both places. Confirmed behavior (2026-08-07): TWO consecutive missed
// days anywhere in the streak don't zero it out, only a THIRD does — this is
// deliberate, not a bug, precisely so a dip signal doesn't fire on day one of a
// rough patch. Fully automatic, no decision for her to make.
export function streakFrom(dates: Set<string>, todayISO: string): number {
  let streak = 0
  let cur = todayISO
  if (!dates.has(cur)) cur = addDaysISO(cur, -1) // grace: streak holds through yesterday
  let graceUsed = false
  for (;;) {
    if (dates.has(cur)) { streak++; cur = addDaysISO(cur, -1); continue }
    if (!graceUsed) { graceUsed = true; cur = addDaysISO(cur, -1); continue }
    break
  }
  return streak
}

// The Hooked Model piece the app had none of: a variable reward. streakFrom
// above already gives every surface (dashboard chip, Monday memo, dip
// detection, leaderboard) one consistent streak NUMBER — this adds a real,
// varying MESSAGE on top for the exact day a milestone lands, so a personal
// record doesn't produce the same static "nice job" a normal day would.
// Never a second streak definition — every caller passes the same `dates`
// (challenge_progress '__daily__' rows) and the same streakFrom() output in.
const MILESTONES = [3, 5, 7, 10, 14, 21, 30, 45, 60, 90, 120, 180, 270, 365]

const MOMENT_LINES: Record<number, string[]> = {
  3: ["Three days in a row. That's not luck, that's a pattern starting.", "Day three. This is usually where it stops feeling like an experiment.", 'Three for three. Small, but real.'],
  5: ["Five days straight — you're not \"trying it out\" anymore.", 'Five in a row. Whatever you changed, keep changing it.'],
  7: ['A full week, every day. That used to be the hard part.', "Seven days. That's a real week, not a good stretch.", 'One week down. This is who you are now.'],
  10: ['Double digits. Most people never see this number.', "Ten days. You're past where most New Year's resolutions quit."],
  14: ['Two weeks straight — this is a habit now, not motivation.', "Fourteen days. You've outlasted the part that's supposed to be hard."],
  21: ["Twenty-one days. However that old rule started, you're proof of it.", 'Three weeks. This is just what you do now.'],
  30: ['A full month. Not a streak anymore — a lifestyle.', "Thirty days straight. That's the number people quit before reaching."],
  45: ["Forty-five days. You've quietly become someone else's proof it's possible."],
  60: ['Two months, every single day. This is identity, not discipline.'],
  90: ['Ninety days. A full season, and you never missed it.'],
  120: ['Four months straight. At this point the streak is just your life.'],
  180: ['Half a year. Nobody does this by accident.'],
  270: ["Two hundred seventy days. You're not chasing the streak — you passed it."],
  365: ['A full year. Every single day. There isn\'t a bigger number to chase — you already lapped it.'],
}

// Stable per-enrollment pick so the SAME milestone always shows the SAME line
// to HER (no flicker on reload) while still varying line-to-line and
// user-to-user — the variability lives in which line she gets, not in
// randomness she'd notice as inconsistency across reloads the same day.
function stableIndex(seed: string, mod: number): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return h % mod
}

// Fires only the exact day current streak equals a milestone — not
// persistently — so it reads as a real moment, not a badge that's always there.
export function milestoneMoment(currentStreak: number, enrollmentId: string): string | null {
  if (!MILESTONES.includes(currentStreak)) return null
  const lines = MOMENT_LINES[currentStreak]
  return lines[stableIndex(enrollmentId + ':' + currentStreak, lines.length)]
}
