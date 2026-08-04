// ============================================================
// Daily Voice Memo — Free-First Rebuild, 2026-08-04
// Asa's idea: a check-in that lands once a day, at a time that feels
// spontaneous rather than scheduled, alternating between nutrition and
// fitness. Filtered through both new experience tests:
//   - Uplifted & encouraged — every line is encouragement, never a scold.
//   - Feels like I'm right there — framed as Asa personally checking in,
//     never as an automated system notification.
//
// Starts as generic written reminders (Tier 1 / $20). Nothing plays real
// audio until Asa actually records it — every entry's audioUrl starts
// unset, exactly like lib/monday-memos.ts's existing pattern for Monday
// memos. That file stays as-is (weekly, Challenge-only, performance-
// matched); this one is the new daily, timezone-aware, all-users layer.
// ============================================================

export type MemoCategory = 'nutrition' | 'fitness'

export interface DailyMemo {
  id: string
  category: MemoCategory
  title: string
  body: string
  audioUrl?: string // set by Asa once he records the real version
}

export const DAILY_MEMOS: DailyMemo[] = [
  // ---- nutrition ----
  { id: 'n1', category: 'nutrition', title: 'Quick one from Coach Asa', body: "You don't have to eat perfect today — just eat on purpose. One good choice at your next meal is enough." },
  { id: 'n2', category: 'nutrition', title: 'Quick one from Coach Asa', body: "Water first. Right now, before anything else — grab a glass. Small thing, real difference." },
  { id: 'n3', category: 'nutrition', title: 'Quick one from Coach Asa', body: "Protein at your next meal, even a little. Future-you will thank you for it." },
  { id: 'n4', category: 'nutrition', title: 'Quick one from Coach Asa', body: "If today's been a mess so far, your next meal is a clean slate — not a reason to give up on the day." },
  { id: 'n5', category: 'nutrition', title: 'Quick one from Coach Asa', body: "You're allowed to enjoy your food. This isn't punishment — it's building the body you actually want." },
  // ---- fitness ----
  { id: 'f1', category: 'fitness', title: 'Quick one from Coach Asa', body: "Today's workout is already built for you — no thinking required. Just show up and follow it." },
  { id: 'f2', category: 'fitness', title: 'Quick one from Coach Asa', body: "You don't need to feel motivated to start. Start, and the motivation shows up on the way." },
  { id: 'f3', category: 'fitness', title: 'Quick one from Coach Asa', body: "Even a shorter version of today's session beats skipping it. Show up for 10 minutes and see how you feel." },
  { id: 'f4', category: 'fitness', title: 'Quick one from Coach Asa', body: "Proud of you for still being here. However today's workout goes, that's what counts." },
  { id: 'f5', category: 'fitness', title: 'Quick one from Coach Asa', body: "Your body remembers every rep you've put in so far. Today's just the next one." },
]

// Deterministic pseudo-random int in [0, max) from a string seed — same seed
// always produces the same result, so "today's memo/time" stays stable across
// however many times the hourly cron checks, without needing to store it.
function seededInt(seed: string, max: number): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return h % max
}

// Alternates category by local day-number so it never repeats the same
// category two days running, then picks a stable-for-the-day memo within it.
export function pickDailyMemo(seed: string, localDateISO: string, localDayNumber: number): DailyMemo {
  const category: MemoCategory = localDayNumber % 2 === 0 ? 'fitness' : 'nutrition'
  const pool = DAILY_MEMOS.filter((m) => m.category === category)
  const idx = seededInt(seed + localDateISO, pool.length)
  return pool[idx]
}

// A random-feeling but stable-for-the-day send hour, confined to morning
// through late afternoon only — Asa's own words were "morning or sometime
// in the afternoon," which rules out evening entirely, not just late night.
export const DAILY_MEMO_WINDOW = { startHour: 8, endHour: 18 } as const

export function dailySendHour(seed: string, localDateISO: string): number {
  const span = DAILY_MEMO_WINDOW.endHour - DAILY_MEMO_WINDOW.startHour
  return DAILY_MEMO_WINDOW.startHour + seededInt(seed + localDateISO + 'hour', span)
}
