export async function trackEvent(eventType: string, metadata?: Record<string, unknown>) {
  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, metadata }),
    })
  } catch {
    // Silently fail — tracking should never break the user experience
  }
}
