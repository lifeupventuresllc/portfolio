import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendPush, pushConfigured, type StoredSub } from '@/lib/push'
import { localDateISO, localDayNumber } from '@/lib/localdate'
import { pickDailyMemo } from '@/lib/daily-memos'

// HOBBY-TIER VERSION: Vercel Hobby caps cron jobs at once/day, so this runs
// once daily (see vercel.json) instead of hourly — every subscriber gets
// today's memo on this single run, no per-user randomized send hour yet.
// `dailySendHour`/`DAILY_MEMO_WINDOW` in lib/daily-memos.ts are already
// built for the real "varies day to day, 8am-6pm local" experience — once
// Asa upgrades to Pro, switch vercel.json back to "0 * * * *" and restore
// the hour-gating check (see git history on this file for the exact diff)
// so it becomes per-user-randomized again instead of a single fixed time.
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
