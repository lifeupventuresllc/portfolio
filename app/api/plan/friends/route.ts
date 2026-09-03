import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPartnerStatus, getOrCreateInviteCode, getPartnerMessages } from '@/lib/partners'

// GET /api/plan/friends — the Friends tab's one load call. Returns either an
// active partnership (status + recent chat) or, if she has none yet, a
// ready-to-share invite code so the empty state never needs a second round
// trip just to get something to show her.
export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    const svc = createServiceClient()

    let { data: enrollment } = await svc.from('challenge_enrollments').select('id')
      .eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
    if (!enrollment && user.email) {
      const { data: byEmail } = await svc.from('challenge_enrollments').select('id')
        .eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
      enrollment = byEmail || null
    }
    if (!enrollment) return NextResponse.json({ error: 'No enrollment found.' }, { status: 404 })

    const status = await getPartnerStatus(enrollment.id as string)
    if (!status) {
      const inviteCode = await getOrCreateInviteCode(enrollment.id as string)
      return NextResponse.json({ paired: false, inviteCode })
    }

    const messages = await getPartnerMessages(status.partnershipId)
    return NextResponse.json({ paired: true, status, messages })
  } catch (error) {
    console.error('friends GET error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
