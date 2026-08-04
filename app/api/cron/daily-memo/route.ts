import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendPush, pushConfigured, type StoredSub } from '@/lib/push'
import { localDateISO, localHourNumber, localDayNumber } from '@/lib/localdate'
import { pickDailyMemo, dailySendHour } from '@/lib/daily-memos'

// Runs hourly (see vercel.json). For each subscriber with a known timezone,
// fires once per local day at a time that's stable-for-the-day but varies
// day to day — never exactly on the hour every day, never at night. Cheap
// to run hourly since almost every check is a no-op (wrong hour, or already
// sent today).
export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!pushConfigured) return NextResponse.json({ ok: true, note: 'push not configured', sent: 0 })

  const svc = createServiceClient()
  const { data: subs } = await svc.from('push_subscriptions').select('endpoint, p256dh, auth, timezone, last_daily_memo_sent').not('timezone', 'is', null)

  let sent = 0, skipped = 0, removed = 0
  for (const s of (subs || [])) {
    const tz = s.timezone as string
    const today = localDateISO(tz)
    if (s.last_daily_memo_sent === today) { skipped++; continue }

    const hourNow = localHourNumber(tz)
    const targetHour = dailySendHour(tz + s.endpoint, today)
    if (hourNow < targetHour) { skipped++; continue }

    const memo = pickDailyMemo(tz + s.endpoint, today, localDayNumber(tz))
    const r = await sendPush(s as StoredSub, { title: memo.title, body: memo.body, url: '/plan' })
    if (r === 'ok') {
      sent++
      await svc.from('push_subscriptions').update({ last_daily_memo_sent: today }).eq('endpoint', s.endpoint)
    } else if (r === 'gone') {
      await svc.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
      removed++
    }
  }
  return NextResponse.json({ ok: true, sent, skipped, removed })
}
