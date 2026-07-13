import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Post to the Curve Collective feed.
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    const svc = createServiceClient()

    let { data: enrollment } = await svc
      .from('challenge_enrollments').select('id, name')
      .eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
    if (!enrollment && user.email) {
      const { data: byEmail } = await svc.from('challenge_enrollments').select('id, name').eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
      enrollment = byEmail || null
    }
    if (!enrollment) return NextResponse.json({ error: 'Join the challenge to post.' }, { status: 403 })

    const { body } = await request.json()
    const text = String(body || '').trim().slice(0, 800)
    if (!text) return NextResponse.json({ error: 'Say something first 💛' }, { status: 400 })

    const { error } = await svc.from('challenge_community_posts').insert({
      user_id: user.id, enrollment_id: enrollment.id,
      name: (enrollment.name as string) || user.email?.split('@')[0] || 'A sister', body: text,
    })
    if (error) { console.error('community post error:', error); return NextResponse.json({ error: 'Could not post right now.' }, { status: 500 }) }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('community error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
