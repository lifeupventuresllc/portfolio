import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Public, anonymous — fires on every quiz step transition so we can see where
// cold leads actually drop off. No auth required; session_id (from
// lib/quiz-track.ts) is what ties a user's path together, not a login.
export async function POST(request: NextRequest) {
  try {
    const { quiz, sessionId, eventType, step, stepName, metadata } = await request.json()

    if (!sessionId || !eventType) {
      return NextResponse.json({ error: 'sessionId and eventType required' }, { status: 400 })
    }

    const svc = createServiceClient()
    await svc.from('quiz_events').insert({
      quiz: quiz || 'find-your-fix',
      session_id: sessionId,
      event_type: eventType,
      step: step ?? null,
      step_name: stepName || null,
      metadata: metadata || {},
    })

    return NextResponse.json({ ok: true })
  } catch {
    // Tracking should never break the quiz experience
    return NextResponse.json({ ok: false })
  }
}
