import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Always-on "Report an issue" widget (components/FeedbackWidget.tsx), separate
// from the periodic pulse-check (/plan/feedback, challenge_progress note
// '__feedback__') — that one's an optional up/down nudge; this one's a
// dedicated bug-report entry point with a required "what happened" and its
// own table (migration 043) so status (new/seen/resolved) has somewhere to
// live. Works for anonymous and pre-signup visitors too, not just enrolled
// members — user_id/email are whatever the current session actually has,
// never required.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 2000) : ''
  if (!message) return NextResponse.json({ error: 'Let us know what happened first.' }, { status: 400 })
  const screen = typeof body.screen === 'string' ? body.screen.slice(0, 200) : ''
  const os = typeof body.os === 'string' ? body.os.slice(0, 100) : ''

  // user_id/email/app_version/timestamp are never taken from the client —
  // the whole point of "auto-captured" is that none of it is spoofable by
  // whoever's submitting.
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const svc = createServiceClient()
  const { error } = await svc.from('app_feedback').insert({
    user_id: user?.id ?? null,
    email: user?.email ?? null,
    message,
    screen,
    os,
    // The exact deployed commit, not package.json's version (which never
    // gets bumped) — far more useful for tracing a report back to what
    // code was actually live when it was filed. Vercel sets this
    // automatically at runtime; falls back locally in dev.
    app_version: (process.env.VERCEL_GIT_COMMIT_SHA || 'dev').slice(0, 7),
  })
  if (error) return NextResponse.json({ error: 'Could not save — try again.' }, { status: 500 })

  return NextResponse.json({ success: true })
}
