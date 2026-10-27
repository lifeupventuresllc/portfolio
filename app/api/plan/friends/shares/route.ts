import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enrollmentIdFor, saveShares } from '@/lib/partners'

// POST /api/plan/friends/shares — save her four share switches for her
// current partner ({ showed_up, goal, meals, progress }). Her partner is
// never told when one changes; it just goes quiet.
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    const enrollmentId = await enrollmentIdFor(user)
    if (!enrollmentId) return NextResponse.json({ error: 'No enrollment found.' }, { status: 404 })

    const b = await request.json().catch(() => ({}))
    const ok = await saveShares(enrollmentId, { showed_up: b.showed_up === true, goal: b.goal === true, meals: b.meals === true, progress: b.progress === true })
    if (!ok) return NextResponse.json({ error: 'Could not save. Try again.' }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('friends shares error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
