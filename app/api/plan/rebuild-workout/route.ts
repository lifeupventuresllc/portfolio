import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getMemberEnrollment } from '@/lib/member'
import { regenerateWorkoutFromIntake } from '@/lib/rebuild-workout'

// Regenerate the member's workout from her stored intake using the CURRENT
// engine — so existing clients get the new push-pull splits without redoing intake.
export async function POST() {
  const { user, enrollment } = await getMemberEnrollment()
  if (!user || !enrollment) return NextResponse.json({ error: 'Not enrolled.' }, { status: 401 })
  const svc = createServiceClient()

  const { data: intake } = await svc.from('challenge_intake').select('*').eq('enrollment_id', enrollment.id).maybeSingle()
  if (!intake) return NextResponse.json({ error: 'Finish your intake first.' }, { status: 400 })

  const { error } = await regenerateWorkoutFromIntake(svc, enrollment as { id: string; name?: string | null }, user.id, intake)

  if (error) { console.error('rebuild workout error:', error); return NextResponse.json({ error: 'Could not rebuild.' }, { status: 500 }) }
  return NextResponse.json({ success: true })
}
