import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getMemberEnrollment } from '@/lib/member'
import { regenerateWorkoutFromIntake } from '@/lib/rebuild-workout'

// Inner Circle exclusive: "life happened" one-tap plan reset. Framed as Asa
// personally resetting her plan — no re-intake, and her progress/streak/history
// are NEVER touched (only regenerates this week's workout program from her
// already-stored intake, same mechanism as /api/plan/rebuild-workout). Gated
// server-side, not just hidden in the UI, since it's a paid-tier perk.
export async function POST() {
  const { user, enrollment } = await getMemberEnrollment()
  if (!user || !enrollment) return NextResponse.json({ error: 'Not enrolled.' }, { status: 401 })
  if (enrollment.tier !== 'inner_circle') {
    return NextResponse.json({ error: 'This one-tap reset is an Inner Circle perk.' }, { status: 403 })
  }
  const svc = createServiceClient()

  const { data: intake } = await svc.from('challenge_intake').select('*').eq('enrollment_id', enrollment.id).maybeSingle()
  if (!intake) return NextResponse.json({ error: 'Finish your intake first.' }, { status: 400 })

  const { error } = await regenerateWorkoutFromIntake(svc, enrollment as { id: string; name?: string | null }, user.id, intake)
  if (error) { console.error('life-reset error:', error); return NextResponse.json({ error: 'Could not reset.' }, { status: 500 }) }

  // Light audit trail so Asa can see when/that she used this — same pattern as
  // the existing feedback capture (extra challenge_progress row, no migration).
  await svc.from('challenge_progress').insert({
    enrollment_id: enrollment.id, user_id: user.id, note: '__life_reset__',
    measurements: { at: new Date().toISOString() },
  })

  return NextResponse.json({ success: true })
}
