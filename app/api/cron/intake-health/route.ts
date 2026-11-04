import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendPush, pushConfigured, type StoredSub } from '@/lib/push'

export const dynamic = 'force-dynamic'

// "Never lose them at the door" (2026-11-04, after a live call where no
// intake had saved for days and nobody knew). Once a day: if people
// started in the last 24 hours but none of their answers saved, alert the
// admins — a push to their phones and a row in Feedback.
export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const svc = createServiceClient()
  const since = new Date(Date.now() - 24 * 3600000).toISOString()
  const [{ count: started }, { count: saved }, { count: savedNew }] = await Promise.all([
    svc.from('challenge_enrollments').select('id', { count: 'exact', head: true }).gte('created_at', since),
    svc.from('challenge_intake').select('id', { count: 'exact', head: true }).gte('updated_at', since),
    svc.from('challenge_intake').select('id', { count: 'exact', head: true }).gte('created_at', since),
  ])
  const savedAny = (saved || 0) + (savedNew || 0)
  // Only alarm when there's real traffic and nothing landed.
  const alarm = (started || 0) >= 5 && savedAny === 0
  if (alarm) {
    const msg = `${started} people started in the last 24 hours but 0 intakes saved. Check the intake save (api/challenge/intake) now.`
    await svc.from('app_feedback').insert({ user_id: null, email: null, screen: '/admin/alert', message: `[ALERT] ${msg}` }).then(() => null, () => null)
    if (pushConfigured) {
      const { data: admins } = await svc.from('profiles').select('id').in('role', ['admin'])
      const ids = (admins || []).map((a) => a.id as string)
      if (ids.length) {
        const { data: subs } = await svc.from('push_subscriptions').select('endpoint, p256dh, auth').in('user_id', ids)
        for (const s of subs || []) await sendPush(s as StoredSub, { title: 'Intakes are not saving', body: msg, url: '/admin' })
      }
    }
  }
  return NextResponse.json({ ok: true, started, saved: savedAny, alarm })
}
