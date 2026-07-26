import { addDaysISO } from '@/lib/localdate'

// Shared by /api/plan/daily (dashboard streak chip) and /api/plan/monday-memo
// (picks which memo slot fits her actual week) — same streak-insurance grace-day
// logic in both places: one missed day anywhere in the streak doesn't zero it
// out, only a second gap ends it. Fully automatic, no decision for her to make.
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
