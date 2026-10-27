import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enrollmentIdFor, endPartnership } from '@/lib/partners'

// POST /api/plan/friends/end — end her partnership. All sharing stops right
// away; her partner only sees "This partnership ended", never a reason.
export async function POST() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    const enrollmentId = await enrollmentIdFor(user)
    if (!enrollmentId) return NextResponse.json({ error: 'No enrollment found.' }, { status: 404 })

    const ok = await endPartnership(enrollmentId)
    if (!ok) return NextResponse.json({ error: 'No partner to end with.' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('friends end error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
