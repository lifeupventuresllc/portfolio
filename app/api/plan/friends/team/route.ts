import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enrollmentIdFor, startTeamTarget, acceptTeamTarget, getActivePartnership, pushToPartner } from '@/lib/partners'

// POST /api/plan/friends/team — the team target ("Together, N workouts this
// week"). { action: 'start', goal } from one partner, { action: 'accept' }
// ("I'm in") from the other. The count resets every Monday on its own.
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    const enrollmentId = await enrollmentIdFor(user)
    if (!enrollmentId) return NextResponse.json({ error: 'No enrollment found.' }, { status: 404 })

    const b = await request.json().catch(() => ({}))
    const ok = b.action === 'accept' ? await acceptTeamTarget(enrollmentId) : await startTeamTarget(enrollmentId, Number(b.goal) || 8)
    if (!ok) return NextResponse.json({ error: 'Could not save. Try again.' }, { status: 400 })

    if (b.action !== 'accept') {
      const p = await getActivePartnership(enrollmentId)
      if (p) await pushToPartner(p.enrollment_a === enrollmentId ? p.enrollment_b : p.enrollment_a, 'Team goal?', `Your partner wants to do ${Number(b.goal) || 8} workouts together this week. Tap to say you're in.`)
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('friends team error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
