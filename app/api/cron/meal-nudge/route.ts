import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendPush, pushConfigured, type StoredSub } from '@/lib/push'
import { localDateISO } from '@/lib/localdate'
import { assessLifePattern, messageForPattern } from '@/lib/fos/pattern'

// Midday reminder: nudge anyone who hasn't logged any food yet today. Layer 1
// of the primary feature, nutrition side: the unified life-pattern engine
// (see lib/fos/pattern.ts) reads across every signal already collected, not
// just food-logging alone — if something real is going on, she gets the
// smaller ask instead of the standard "have you eaten?" nudge — no macro
// breakdown to hit, no guilt over the gap. Recovery-mindset copy either way.
export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!pushConfigured) return NextResponse.json({ ok: true, note: 'push not configured', sent: 0 })

  const svc = createServiceClient()
  const today = new Date().toISOString().slice(0, 10) // UTC day (batch approximation)

  const { data: logged } = await svc.from('challenge_food_log').select('enrollment_id').eq('logged_on', today)
  const loggedSet = new Set((logged || []).map((r) => r.enrollment_id as string))

  const { data: subs } = await svc.from('push_subscriptions').select('endpoint, p256dh, auth, enrollment_id, timezone')

  let sent = 0, removed = 0, skipped = 0, dipsCaught = 0
  for (const s of (subs || [])) {
    if (s.enrollment_id && loggedSet.has(s.enrollment_id as string)) { skipped++; continue }

    let payload = {
      title: 'Have you eaten yet today? 🍽️',
      body: "No stress if not — here's exactly what to eat, already decided. Tap and go.",
      url: '/plan/today',
    }

    if (s.enrollment_id) {
      const localToday = localDateISO((s.timezone as string) || undefined)
      const assessment = await assessLifePattern(s.enrollment_id as string, localToday)
      if (assessment.isDip) {
        dipsCaught++
        const { title, body } = messageForPattern(assessment)
        payload = { title, body, url: '/plan/today' }
      }
    }

    const r = await sendPush(s as StoredSub, payload)
    if (r === 'ok') sent++
    else if (r === 'gone') { await svc.from('push_subscriptions').delete().eq('endpoint', (s as StoredSub).endpoint); removed++ }
  }
  return NextResponse.json({ ok: true, sent, skipped, removed, dipsCaught })
}
