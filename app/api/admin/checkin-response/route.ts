import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Coach-only: reply to a client's weekly check-in.
async function coachUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' || profile?.role === 'support' ? user : null
}

export async function POST(request: NextRequest) {
  if (!(await coachUser())) return NextResponse.json({ error: 'Coach login required.' }, { status: 403 })
  try {
    const { checkinId, response } = await request.json()
    if (!checkinId || !response?.trim()) return NextResponse.json({ error: 'Write a response first.' }, { status: 400 })
    const svc = createServiceClient()
    await svc.from('challenge_checkins').update({
      coach_response: response.trim(), status: 'reviewed', reviewed_at: new Date().toISOString(),
    }).eq('id', checkinId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Coach response error:', error)
    return NextResponse.json({ error: 'Failed to save response' }, { status: 500 })
  }
}
