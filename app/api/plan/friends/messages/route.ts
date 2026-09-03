import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getActivePartnership, sendPartnerMessage } from '@/lib/partners'

// POST /api/plan/friends/messages — send a chat message, or a nudge (same
// thread, kind: 'nudge' so the UI can render it differently — a single
// tap on "Nudge" posts a fixed body through here, no separate endpoint).
export async function POST(request: NextRequest) {
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

    const partnership = await getActivePartnership(enrollment.id as string)
    if (!partnership) return NextResponse.json({ error: 'No accountability partner yet.' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const kind = body.kind === 'nudge' ? 'nudge' : 'text'
    const text = kind === 'nudge' ? '👋 nudged you' : String(body.body || '').trim().slice(0, 1000)
    if (!text) return NextResponse.json({ error: 'Message is empty.' }, { status: 400 })

    await sendPartnerMessage(partnership.id, enrollment.id as string, text, kind)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('friends messages error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
