import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Powers the bottom nav's mini progress bar — same goal-weight-progress math
// as GoalProgressBar on the dashboard, just exposed as a small standalone
// endpoint since the nav renders on every /plan/* page, not just the dashboard.
export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ pct: 0 })
    const svc = createServiceClient()

    let { data: enrollment } = await svc
      .from('challenge_enrollments').select('id')
      .eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
    if (!enrollment && user.email) {
      const { data: byEmail } = await svc
        .from('challenge_enrollments').select('id')
        .eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
      enrollment = byEmail || null
    }
    if (!enrollment) return NextResponse.json({ pct: 0 })

    const [{ data: intakeRow }, { data: latestCheckin }] = await Promise.all([
      svc.from('challenge_intake').select('weight_lbs, target_lbs, goal').eq('enrollment_id', enrollment.id).maybeSingle(),
      svc.from('challenge_checkins').select('weight_lbs').eq('enrollment_id', enrollment.id).not('weight_lbs', 'is', null).order('submitted_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    if (!intakeRow || intakeRow.goal === 'maintain') return NextResponse.json({ pct: 0 })

    const startWeight = Number(intakeRow.weight_lbs) || 0
    const targetDelta = Number(intakeRow.target_lbs) || 10
    const goalWeight = intakeRow.goal === 'gain' ? startWeight + targetDelta : startWeight - targetDelta
    const currentWeight = Number(latestCheckin?.weight_lbs) || startWeight

    const span = intakeRow.goal === 'lose' ? startWeight - goalWeight : goalWeight - startWeight
    const progressed = intakeRow.goal === 'lose' ? startWeight - currentWeight : currentWeight - startWeight
    const pct = span > 0 ? Math.max(0, Math.min(100, Math.round((progressed / span) * 100))) : 0

    return NextResponse.json({ pct })
  } catch {
    return NextResponse.json({ pct: 0 })
  }
}
