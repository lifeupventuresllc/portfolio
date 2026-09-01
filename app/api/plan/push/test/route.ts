import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendPush, pushConfigured, type StoredSub } from '@/lib/push'

// Send a test notification to the signed-in user's own devices ("it works!").
export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  if (!pushConfigured) return NextResponse.json({ sent: 0, note: 'Push not configured yet.' })

  const svc = createServiceClient()
  const { data: subs } = await svc.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', user.id)
  let sent = 0, removed = 0
  for (const s of (subs || []) as StoredSub[]) {
    const r = await sendPush(s, { title: 'Coach 💛', body: "Reminders are on. I've got you — see you at your workout.", url: '/plan' })
    if (r === 'ok') sent++
    else if (r === 'gone') { await svc.from('push_subscriptions').delete().eq('endpoint', s.endpoint); removed++ }
  }
  return NextResponse.json({ sent, removed })
}
