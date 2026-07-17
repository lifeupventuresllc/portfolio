import { cookies } from 'next/headers'

// Server-side "what day is it FOR THIS USER" — anchored to their local timezone, not
// UTC. The browser writes its IANA tz into a `tz` cookie (see components/TimezoneSync);
// we read it here so every day-boundary (self-talk switch, food-log day, streak/week
// rollover) happens at the user's local midnight — a real 24h day for them.
const DEFAULT_TZ = 'America/Los_Angeles' // sensible default until the cookie is set

export function getTimezone(): string {
  try {
    const tz = cookies().get('tz')?.value
    if (tz) { new Intl.DateTimeFormat('en-CA', { timeZone: tz }); return tz } // throws if tz is invalid
  } catch { /* fall through */ }
  return DEFAULT_TZ
}

// YYYY-MM-DD in the user's timezone.
export function localDateISO(tz: string = getTimezone(), at: Date = new Date()): string {
  return at.toLocaleDateString('en-CA', { timeZone: tz }) // en-CA formats as YYYY-MM-DD
}

// Mon=0 … Sun=6 in the user's timezone (drives the weekday meal index).
export function localMondayIndex(tz: string = getTimezone(), at: Date = new Date()): number {
  const wd = at.toLocaleDateString('en-US', { timeZone: tz, weekday: 'short' })
  const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }
  return map[wd] ?? 0
}

// Stable integer day-number for the user's local day (drives the self-talk rotation).
export function localDayNumber(tz: string = getTimezone(), at: Date = new Date()): number {
  return Math.floor(new Date(localDateISO(tz, at) + 'T00:00:00Z').getTime() / 86400000)
}

// Add/subtract whole days on a YYYY-MM-DD string (UTC-anchored math, tz-safe).
export function addDaysISO(isoDate: string, delta: number): string {
  const d = new Date(isoDate + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}
