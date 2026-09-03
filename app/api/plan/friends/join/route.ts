import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redeemInviteCode } from '@/lib/partners'

// POST /api/plan/friends/join — redeem a partner's invite code, pairing the
// two of them up. One partner at a time for v1 (see redeemInviteCode).
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

    const body = await request.json().catch(() => ({}))
    const code = String(body.code || '').trim()
    if (!code) return NextResponse.json({ error: 'Enter a code first.' }, { status: 400 })

    const result = await redeemInviteCode(code, enrollment.id as string)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('friends join error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
