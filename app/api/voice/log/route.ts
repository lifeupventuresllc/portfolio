import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Writes one row per finished voice input — raw transcript, and a cleaned
// version ONLY if the caller actually ran a distinct cleanup pass (never
// silently substituted). Best-effort: a logging failure never blocks her
// from sending the message she just spoke.
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  let body: {
    source?: string; rawTranscript?: string; cleanedTranscript?: string | null
    confidence?: number; lowConfidence?: boolean; durationSeconds?: number
  }
  try { body = await request.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  if (!body.rawTranscript) return NextResponse.json({ ok: false }, { status: 400 })

  const svc = createServiceClient()
  let { data: enrollment } = await svc.from('challenge_enrollments').select('id').eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc.from('challenge_enrollments').select('id').eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
    enrollment = byEmail || null
  }

  await svc.from('voice_transcripts').insert({
    enrollment_id: enrollment?.id ?? null,
    user_id: user.id,
    source: body.source || 'unknown',
    raw_transcript: body.rawTranscript,
    cleaned_transcript: body.cleanedTranscript ?? null,
    confidence: typeof body.confidence === 'number' ? body.confidence : null,
    low_confidence: !!body.lowConfidence,
    duration_seconds: body.durationSeconds ?? null,
    word_count: body.rawTranscript.trim().split(/\s+/).filter(Boolean).length,
  })

  return NextResponse.json({ ok: true })
}
