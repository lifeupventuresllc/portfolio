import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendPush, pushConfigured, type StoredSub } from '@/lib/push'
import { localDateISO, localDayNumber } from '@/lib/localdate'
import { affirmationForDay } from '@/lib/affirmations'

// Morning self-talk push (2026-09-24, Asa's direct ask): the exact same
// "Today's self-talk" line Home already shows her (affirmationForDay,
// keyed to her own local day — same function, same pool, never a second
// copy of this content) — just reaching her before she opens the app,
// not only after. Skipped for anyone who's already opened the app today
// local time (challenge_enrollments.last_active_at) — if she's already
// seen it on Home, a duplicate push adds nothing.
export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!pushConfigured) return NextResponse.json({ ok: true, note: 'push not configured', sent: 0 })

  const svc = createServiceClient()
  const { data: subs } = await svc.from('push_subscriptions').select('endpoint, p256dh, auth, enrollment_id, user_id, timezone')
  const enrollmentIds = (subs || []).map((s) => s.enrollment_id).filter(Boolean) as string[]

  const { data: enrollments } = enrollmentIds.length
    ? await svc.from('challenge_enrollments').select('id, last_active_at').in('id', enrollmentIds)
    : { data: [] }
  const lastActiveById = new Map((enrollments || []).map((e) => [e.id as string, e.last_active_at as string | null]))

  let sent = 0, removed = 0, skipped = 0
  for (const s of (subs || [])) {
    const tz = (s.timezone as string) || undefined
    const localToday = localDateISO(tz)
    const lastActiveAt = s.enrollment_id ? lastActiveById.get(s.enrollment_id as string) : null
    if (lastActiveAt && localDateISO(tz, new Date(lastActiveAt)) === localToday) { skipped++; continue }

    const line = affirmationForDay(localDayNumber(tz))
    const payload = { title: 'Today’s self-talk 💛', body: line, url: '/plan' }

    const r = await sendPush(s as StoredSub, payload)
    if (r === 'ok') sent++
    else if (r === 'gone') { await svc.from('push_subscriptions').delete().eq('endpoint', (s as StoredSub).endpoint); removed++ }
  }
  return NextResponse.json({ ok: true, sent, skipped, removed })
}
