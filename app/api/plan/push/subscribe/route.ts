import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Save (or remove) a device's push subscription so we can send reminders to it.
async function resolve() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, enrollment: null, svc: null }
  const svc = createServiceClient()
  let { data: enrollment } = await svc.from('challenge_enrollments').select('id').eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc.from('challenge_enrollments').select('id').eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
    enrollment = byEmail || null
  }
  return { user, enrollment, svc }
}

export async function POST(request: NextRequest) {
  const { user, enrollment, svc } = await resolve()
  if (!user || !svc) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  let body
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Bad request.' }, { status: 400 }) }
  const sub = body?.subscription || body
  const endpoint = sub?.endpoint
  const p256dh = sub?.keys?.p256dh
  const auth = sub?.keys?.auth
  const timezone: string | undefined = body?.timezone
  if (!endpoint || !p256dh || !auth) return NextResponse.json({ error: 'Invalid subscription.' }, { status: 400 })
  await svc.from('push_subscriptions').upsert(
    { endpoint, p256dh, auth, user_id: user.id, enrollment_id: enrollment?.id ?? null, timezone: timezone || null },
    { onConflict: 'endpoint' }
  )
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const { user, svc } = await resolve()
  if (!user || !svc) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const endpoint = request.nextUrl.searchParams.get('endpoint')
  if (endpoint) await svc.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}
