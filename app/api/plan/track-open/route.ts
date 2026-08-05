import { NextResponse } from 'next/server'
import { getMemberEnrollment } from '@/lib/member'
import { createServiceClient } from '@/lib/supabase/server'

// Layer 1 Phase 2: passive app-open signal, no permission prompt needed —
// just a timestamp on real page visits. Fire-and-forget, throttled client-
// side to once per browser session so this never spams the DB.
export async function POST() {
  const { user, enrollment } = await getMemberEnrollment()
  if (!user || !enrollment) return NextResponse.json({ ok: false })
  const svc = createServiceClient()
  await svc.from('challenge_enrollments').update({ last_active_at: new Date().toISOString() }).eq('id', enrollment.id as string)
  return NextResponse.json({ ok: true })
}
