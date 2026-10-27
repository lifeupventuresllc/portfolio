import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPartnerStatus, getOrCreateInviteCode, getPartnerMessages, enrollmentIdFor } from '@/lib/partners'

// GET /api/plan/friends — the Friends tab's one load call. Returns either an
// active partnership (status + recent chat) or, if she has none yet, a
// ready-to-share invite code so the empty state never needs a second round
// trip just to get something to show her. Anything her partner doesn't
// share is already dropped from `status` on the server.
export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    const enrollmentId = await enrollmentIdFor(user)
    if (!enrollmentId) return NextResponse.json({ error: 'No enrollment found.' }, { status: 404 })

    const status = await getPartnerStatus(enrollmentId)
    if (!status) {
      const inviteCode = await getOrCreateInviteCode(enrollmentId)
      return NextResponse.json({ paired: false, inviteCode })
    }

    const messages = await getPartnerMessages(status.partnershipId)
    return NextResponse.json({ paired: true, status, messages })
  } catch (error) {
    console.error('friends GET error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
