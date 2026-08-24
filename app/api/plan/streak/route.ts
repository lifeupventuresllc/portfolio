import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { localDateISO } from '@/lib/localdate'
import { streakFrom } from '@/lib/streak'

// A 404 to this exact path was observed firing from a live browser session
// with no matching caller anywhere in this codebase or its git history (see
// the 2026-08-23 streak-feature verification pass) — likely test-environment
// noise (a browser extension probing for it), not a real regression. Adding
// the route as a harmless, always-correct fallback rather than leaving a
// dead 404 around: same streak, same '__daily__' dates, same streakFrom() as
// /api/plan/daily (the real source of truth), so it can never disagree with it.
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ streak: 0 })

  const svc = createServiceClient()
  let { data: enrollment } = await svc.from('challenge_enrollments').select('id').eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc.from('challenge_enrollments').select('id').eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
    enrollment = byEmail || null
  }
  if (!enrollment) return NextResponse.json({ streak: 0 })

  const { data } = await svc.from('challenge_progress').select('logged_on').eq('enrollment_id', enrollment.id).eq('note', '__daily__')
  const dates = new Set<string>((data || []).map((r) => r.logged_on as string))
  return NextResponse.json({ streak: streakFrom(dates, localDateISO()) })
}
