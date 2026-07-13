import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/admin'

// Save a coach's private notes on a client. Requires migration 015 (coach_notes
// column); degrades gracefully with a clear message if it isn't applied yet.
export async function POST(request: NextRequest) {
  const { ok, svc } = await checkAdmin()
  if (!ok || !svc) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })

  const { enrollmentId, notes } = await request.json()
  if (!enrollmentId) return NextResponse.json({ error: 'Missing client.' }, { status: 400 })

  const { error } = await svc.from('challenge_enrollments')
    .update({ coach_notes: String(notes ?? '').slice(0, 5000) })
    .eq('id', enrollmentId)

  if (error) {
    const needsMigration = /coach_notes/.test(error.message)
    return NextResponse.json(
      { error: needsMigration ? 'Run migration 015 in Supabase to enable notes.' : 'Could not save notes.' },
      { status: 500 })
  }
  return NextResponse.json({ success: true })
}
