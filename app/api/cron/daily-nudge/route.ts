import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendPush, pushConfigured, type StoredSub } from '@/lib/push'

// Daily reminder: nudge anyone who opted into push and hasn't shown up today.
// Recovery-mindset copy — an invitation, never a scold.
export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!pushConfigured) return NextResponse.json({ ok: true, note: 'push not configured', sent: 0 })

  const svc = createServiceClient()
  const today = new Date().toISOString().slice(0, 10) // UTC day (batch approximation)

  const { data: shown } = await svc.from('challenge_progress').select('enrollment_id').eq('note', '__daily__').eq('logged_on', today)
  const shownSet = new Set((shown || []).map((r) => r.enrollment_id as string))

  const { data: subs } = await svc.from('push_subscriptions').select('endpoint, p256dh, auth, enrollment_id')
  let sent = 0, removed = 0, skipped = 0
  for (const s of (subs || [])) {
    if (s.enrollment_id && shownSet.has(s.enrollment_id as string)) { skipped++; continue }
    const r = await sendPush(s as StoredSub, {
      title: 'Your workout’s waiting 💪🏽',
      body: "Even 20 minutes counts. Tap to start today's session — your plan's ready.",
      url: '/plan',
    })
    if (r === 'ok') sent++
    else if (r === 'gone') { await svc.from('push_subscriptions').delete().eq('endpoint', (s as StoredSub).endpoint); removed++ }
  }
  return NextResponse.json({ ok: true, sent, skipped, removed })
}
