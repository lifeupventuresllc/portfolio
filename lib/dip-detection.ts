import { addDaysISO } from '@/lib/localdate'
import { streakFrom } from '@/lib/streak'

// ============================================================
// Dip Detection — Layer 1, Phase 1 of the Identity/Habit primary feature.
// "The app that already knows you": this is the mechanism that catches her
// BEFORE she spirals into quitting. Runs entirely off data already logged
// (challenge_progress dates) — no new integrations required.
//
// Core distinction this makes: a broken streak alone isn't a failure signal.
// Someone who's never been consistent isn't "dipping" — she just hasn't
// built the habit yet, and needs onboarding encouragement, not identity
// language about a season getting hard. A dip is specifically: she WAS
// showing up consistently (a real streak, not one lucky day), and then
// stopped. That's the Denise pattern — this function names exactly that.
// ============================================================

export interface DipSignal {
  isDip: boolean
  currentStreak: number
  priorStreakPeak: number // best streak in the 14 days before today, excluding today
}

const LOOKBACK_DAYS = 14
const MIN_PRIOR_STREAK = 3 // below this, she was never really "on a roll" — not a dip, just early days

export function detectDip(loggedDates: Set<string>, todayISO: string): DipSignal {
  const currentStreak = streakFrom(loggedDates, todayISO)

  let peak = 0
  let running = 0
  let cursor = addDaysISO(todayISO, -1)
  for (let i = 0; i < LOOKBACK_DAYS; i++) {
    if (loggedDates.has(cursor)) { running++; peak = Math.max(peak, running) }
    else running = 0
    cursor = addDaysISO(cursor, -1)
  }

  return {
    isDip: currentStreak === 0 && peak >= MIN_PRIOR_STREAK,
    currentStreak,
    priorStreakPeak: peak,
  }
}

// Phase 2 passive signal: total app silence, catches her even earlier than a
// missed workout/food day would — she can go quiet before anything is
// technically "due." No permission prompt needed, just a real visit
// timestamp (see components/TrackAppOpen.tsx).
const SILENCE_DAYS_THRESHOLD = 3

export function isSilentDip(lastActiveAt: string | null, now: Date = new Date()): boolean {
  if (!lastActiveAt) return false
  const days = (now.getTime() - new Date(lastActiveAt).getTime()) / 86400000
  return days >= SILENCE_DAYS_THRESHOLD
}
