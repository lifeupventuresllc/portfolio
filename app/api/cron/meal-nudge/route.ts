import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendPush, pushConfigured, type StoredSub } from '@/lib/push'

// Midday reminder: nudge anyone who hasn't logged any food yet today. Directly answers
// the #1 raw customer complaint — "I've forgotten to eat because I was doing xyz" — which
// the existing daily-nudge (workout-only, end of day) never actually covered.
// Recovery-mindset copy — an invitation, never a scold.
export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!pushConfigured) return NextResponse.json({ ok: true, note: 'push not configured', sent: 0 })

  const svc = createServiceClient()
  const today = new Date().toISOString().slice(0, 10) // UTC day (batch approximation)

  const { data: logged } = await svc.from('challenge_food_log').select('enrollment_id').eq('logged_on', today)
  const loggedSet = new Set((logged || []).map((r) => r.enrollment_id as string))

  const { data: subs } = await svc.from('push_subscriptions').select('endpoint, p256dh, auth, enrollment_id')
  let sent = 0, removed = 0, skipped = 0
  for (const s of (subs || [])) {
    if (s.enrollment_id && loggedSet.has(s.enrollment_id as string)) { skipped++; continue }
    const r = await sendPush(s as StoredSub, {
      title: 'Have you eaten yet today? 🍽️',
      body: "No stress if not — here's exactly what to eat, already decided. Tap and go.",
      url: '/plan/today',
    })
    if (r === 'ok') sent++
    else if (r === 'gone') { await svc.from('push_subscriptions').delete().eq('endpoint', (s as StoredSub).endpoint); removed++ }
  }
  return NextResponse.json({ ok: true, sent, skipped, removed })
}
