import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getActivePartnership, sendPartnerMessage, enrollmentIdFor, pushToPartner } from '@/lib/partners'
import { CHEERS, type CheerId } from '@/lib/partner-cheers'

// POST /api/plan/friends/messages — send a chat message, a nudge, or a
// one-tap cheer (same thread; kind tells the UI which). A cheer also sends
// her partner a phone alert when push is set up.
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    const enrollmentId = await enrollmentIdFor(user)
    if (!enrollmentId) return NextResponse.json({ error: 'No enrollment found.' }, { status: 404 })

    const partnership = await getActivePartnership(enrollmentId)
    if (!partnership) return NextResponse.json({ error: 'No accountability partner yet.' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const kind = body.kind === 'nudge' ? 'nudge' : body.kind === 'cheer' ? 'cheer' : 'text'
    const cheer = kind === 'cheer' ? CHEERS[body.cheer as CheerId] : null
    if (kind === 'cheer' && !cheer) return NextResponse.json({ error: 'Unknown cheer.' }, { status: 400 })
    const text = kind === 'nudge' ? '👋 nudged you' : cheer ? cheer.body : String(body.body || '').trim().slice(0, 1000)
    if (!text) return NextResponse.json({ error: 'Message is empty.' }, { status: 400 })

    await sendPartnerMessage(partnership.id, enrollmentId, text, kind)

    if (cheer) {
      const { data: me } = await createServiceClient().from('challenge_enrollments').select('name').eq('id', enrollmentId).maybeSingle()
      const first = String(me?.name || '').trim().split(/\s+/)[0] || 'Your partner'
      await pushToPartner(partnership.enrollment_a === enrollmentId ? partnership.enrollment_b : partnership.enrollment_a, `${first} cheered you on`, cheer.body)
    }
    return NextResponse.json({ ok: true, body: text })
  } catch (error) {
    console.error('friends messages error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
