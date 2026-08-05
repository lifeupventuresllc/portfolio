import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendPush, pushConfigured, type StoredSub } from '@/lib/push'
import { localDateISO } from '@/lib/localdate'
import { detectDip } from '@/lib/dip-detection'

// Daily reminder: nudge anyone who opted into push and hasn't shown up today.
// Layer 1, Phase 1 of the primary feature ("the app that already knows you"):
// this is no longer one flat message for everyone. If she was on a real
// streak and it just broke, that's a DIP, not a failure — she gets a
// smaller ask and identity-affirming language instead of the standard
// "your workout's waiting" nudge. Everyone else still gets the normal
// invitation, unchanged.
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
  const enrollmentIds = (subs || []).map((s) => s.enrollment_id).filter(Boolean) as string[]

  const { data: progress } = enrollmentIds.length
    ? await svc.from('challenge_progress').select('enrollment_id, logged_on').eq('note', '__daily__').in('enrollment_id', enrollmentIds)
    : { data: [] }
  const byEnrollment = new Map<string, Set<string>>()
  for (const row of progress || []) {
    const id = row.enrollment_id as string
    if (!byEnrollment.has(id)) byEnrollment.set(id, new Set())
    byEnrollment.get(id)!.add(row.logged_on as string)
  }

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
      const dip = detectDip(byEnrollment.get(s.enrollment_id as string) || new Set(), localToday)
      if (dip.isDip) {
        dipsCaught++
        payload = {
          title: 'You’ve been carrying a lot 💛',
          body: 'No pressure to bounce back to full speed. A few minutes today still counts — tap for a smaller version.',
          url: '/plan/today',
        }
      }
    }

    const r = await sendPush(s as StoredSub, payload)
    if (r === 'ok') sent++
    else if (r === 'gone') { await svc.from('push_subscriptions').delete().eq('endpoint', (s as StoredSub).endpoint); removed++ }
  }
  return NextResponse.json({ ok: true, sent, skipped, removed, dipsCaught })
}
