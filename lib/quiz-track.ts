// Lightweight step-level funnel tracking for quizzes (Find Your Fix, etc).
// Session id persists in localStorage so a drop-off and later return still
// reconstructs as one path — no login required. Never blocks the UI: every
// call is fire-and-forget.

const SESSION_KEY = 'luf_quiz_session_id'

export function getQuizSessionId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = localStorage.getItem(SESSION_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return crypto.randomUUID()
  }
}

export function trackQuizEvent(
  eventType: 'quiz_started' | 'step_reached' | 'teaser_shown' | 'contact_submitted' | 'quiz_completed',
  opts?: { quiz?: string; step?: number; stepName?: string; metadata?: Record<string, unknown> }
) {
  const sessionId = getQuizSessionId()
  if (!sessionId) return
  try {
    fetch('/api/quiz-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quiz: opts?.quiz || 'find-your-fix',
        sessionId,
        eventType,
        step: opts?.step,
        stepName: opts?.stepName,
        metadata: opts?.metadata,
      }),
    }).catch(() => {})
  } catch {
    // Silently fail — tracking should never break the quiz
  }
}
