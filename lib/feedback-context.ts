// Shared vocabulary + auto-captured context for the feedback system, so every
// submission — whether typed on /plan/feedback or tapped inline after a workout —
// carries the same structured shape Asa can filter/analyze in /admin/feedback.

export const FEEDBACK_CATEGORIES = [
  { key: 'workout', label: 'Workout' },
  { key: 'meals', label: 'Meals' },
  { key: 'checkin', label: 'Check-in' },
  { key: 'coach', label: 'Coach chat' },
  { key: 'general', label: 'Something else' },
] as const
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]['key']

export const FEEDBACK_SEVERITIES = [
  { key: 'minor', label: 'Minor' },
  { key: 'annoying', label: 'Annoying' },
  { key: 'blocking', label: "Couldn't continue" },
] as const
export type FeedbackSeverity = (typeof FEEDBACK_SEVERITIES)[number]['key']

export const FEEDBACK_LAST_SENT_KEY = 'luf_feedback_last_sent'

// Records that feedback was just sent (from anywhere) so the floating nudge
// backs off for a while instead of re-asking someone who just answered.
export function markFeedbackSent() {
  try { localStorage.setItem(FEEDBACK_LAST_SENT_KEY, String(Date.now())) } catch { /* ignore */ }
}

// Compact OS + installed-vs-browser label — tells Asa whether a bug report came
// from the installed PWA or a regular mobile/desktop browser tab, without asking.
export function deviceLabel(): string {
  if (typeof navigator === 'undefined') return ''
  const ua = navigator.userAgent
  const os = /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Macintosh/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Other'
  const standalone = (navigator as unknown as { standalone?: boolean }).standalone
    || (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches)
  return `${os} · ${standalone ? 'installed app' : 'browser'}`
}

// Guess the category from the screen the person was on, so category can be
// optional (only the thumb is required). Falls back to 'general'.
export function guessCategory(path: string | null | undefined): FeedbackCategory {
  const p = (path || '').toLowerCase()
  if (/\/plan\/(workout|today)|\/workout/.test(p)) return 'workout'
  if (/\/plan\/(nutrition|meals)|\/meals|\/nutrition/.test(p)) return 'meals'
  if (p.includes('/plan/checkin')) return 'checkin'
  if (p.includes('/plan/coach') || p.includes('chat')) return 'coach'
  return 'general'
}

export function lastScreen(): string {
  try { return sessionStorage.getItem('luf_last_screen') || '' } catch { return '' }
}
