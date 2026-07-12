import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Weekly check-in: she submits weight / measurements / notes → Coach Asa reviews.
// Also logs a progress entry so her tracker chart updates.
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    const svc = createServiceClient()

    let { data: enrollment } = await svc
      .from('challenge_enrollments').select('*')
      .eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
    if (!enrollment && user.email) {
      const { data: byEmail } = await svc
        .from('challenge_enrollments').select('*')
        .eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
      if (byEmail && !byEmail.user_id) await svc.from('challenge_enrollments').update({ user_id: user.id }).eq('id', byEmail.id)
      enrollment = byEmail || null
    }
    if (!enrollment) return NextResponse.json({ error: 'No enrollment found for your account.' }, { status: 404 })

    const body = await request.json()
    const num = (v: unknown) => (v != null && v !== '' && !isNaN(Number(v)) ? Number(v) : null)
    const weight = num(body.weight_lbs)
    const measurements = { waist: num(body.waist), hips: num(body.hips), thighs: num(body.thighs), arms: num(body.arms) }

    if (weight == null && !body.notes && Object.values(measurements).every((v) => v == null)) {
      return NextResponse.json({ error: 'Add at least your weight or a note so Asa has something to work with.' }, { status: 400 })
    }

    const { count } = await svc
      .from('challenge_checkins').select('id', { count: 'exact', head: true }).eq('enrollment_id', enrollment.id)
    const weekNumber = (count || 0) + 1
    const now = new Date().toISOString()

    await svc.from('challenge_checkins').insert({
      enrollment_id: enrollment.id, user_id: user.id, week_number: weekNumber,
      weight_lbs: weight, measurements, client_notes: body.notes || null,
      status: 'submitted', submitted_at: now,
    })
    // Feed the progress tracker
    await svc.from('challenge_progress').insert({
      enrollment_id: enrollment.id, user_id: user.id, weight_lbs: weight, measurements, note: body.notes || null,
    })
    // Keep enrollment active + timestamped
    await svc.from('challenge_enrollments').update({ status: 'active', updated_at: now }).eq('id', enrollment.id)

    return NextResponse.json({ success: true, weekNumber })
  } catch (error) {
    console.error('Check-in error:', error)
    return NextResponse.json({ error: 'Failed to submit your check-in' }, { status: 500 })
  }
}
