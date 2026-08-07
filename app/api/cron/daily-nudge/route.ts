import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendPush, pushConfigured, type StoredSub } from '@/lib/push'
import { localDateISO } from '@/lib/localdate'
import { assessLifePattern, messageForPattern } from '@/lib/fos/pattern'

// Daily reminder: nudge anyone who opted into push and hasn't shown up today.
// Layer 1 of the primary feature ("the app that already knows you"): this is
// no longer one flat message for everyone. The unified life-pattern engine
// (see lib/fos/pattern.ts) reads across every signal already collected —
// workout, food logging, app-open silence, eating-out frequency, chat-
// reported stress, calendar — as ONE combined read, so she gets a smaller
// ask and identity-affirming language when something real is going on,
// instead of the standard "your workout's waiting" nudge. Everyone else
// still gets the normal invitation, unchanged.
export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!pushConfigured) return NextResponse.json({ ok: true, note: 'push not configured', sent: 0 })

  const svc = createServiceClient()
  const today = new Date().toISOString().slice(0, 10) // UTC day (batch approximation) — used for the "shown today" check below

  const { data: shown } = await svc.from('challenge_progress').select('enrollment_id').eq('note', '__daily__').eq('logged_on', today)
  const shownSet = new Set((shown || []).map((r) => r.enrollment_id as string))

  const { data: subs } = await svc.from('push_subscriptions').select('endpoint, p256dh, auth, enrollment_id, timezone')

  let sent = 0, removed = 0, skipped = 0, dipsCaught = 0
  for (const s of (subs || [])) {
    if (s.enrollment_id && shownSet.has(s.enrollment_id as string)) { skipped++; continue }

    let payload = {
      title: 'Your workout’s waiting 💪🏽',
      body: "Even 20 minutes counts. Tap to start today's session — your plan's ready.",
      url: '/plan',
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
