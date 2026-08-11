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
  const { data: subs } = await svc.from('push_subscriptions').select('endpoint, p256dh, auth, enrollment_id, user_id, timezone')
  const enrollmentIds = (subs || []).map((s) => s.enrollment_id).filter(Boolean) as string[]

  // Keyed per enrollment, not one shared UTC date — same fix as daily-nudge:
  // a single shared "today" silently mismatches her real local logged_on
  // rows for a large share of non-US timezones.
  const { data: logged } = enrollmentIds.length
    ? await svc.from('challenge_food_log').select('enrollment_id, logged_on').in('enrollment_id', enrollmentIds)
    : { data: [] }
  const loggedByEnrollment = new Map<string, Set<string>>()
  for (const row of logged || []) {
    const id = row.enrollment_id as string
    if (!loggedByEnrollment.has(id)) loggedByEnrollment.set(id, new Set())
    loggedByEnrollment.get(id)!.add(row.logged_on as string)
  }

  let sent = 0, removed = 0, skipped = 0, dipsCaught = 0
  for (const s of (subs || [])) {
    const localToday = localDateISO((s.timezone as string) || undefined)
    if (s.enrollment_id && loggedByEnrollment.get(s.enrollment_id as string)?.has(localToday)) { skipped++; continue }

    let payload = {
      title: 'Have you eaten yet today? 🍽️',
      body: "No stress if not — here's exactly what to eat, already decided. Tap and go.",
      url: '/plan/today',
    }

    let assessment: Awaited<ReturnType<typeof assessLifePattern>> | null = null
    if (s.enrollment_id) {
      assessment = await assessLifePattern(s.enrollment_id as string, localToday)
      if (assessment.isDip) {
        dipsCaught++
        const { title, body } = messageForPattern(assessment)
        payload = { title, body, url: '/plan/today' }
      }
    }

    const r = await sendPush(s as StoredSub, payload)
    if (r === 'ok') sent++
    else if (r === 'gone') { await svc.from('push_subscriptions').delete().eq('endpoint', (s as StoredSub).endpoint); removed++ }

    // Beta metrics — same convention as daily-nudge; see lib/fos/pattern.ts's note.
    if (s.enrollment_id && assessment?.isDip) {
      await svc.from('fos_risk_flags').upsert({
        enrollment_id: s.enrollment_id, user_id: s.user_id ?? null, flagged_on: localToday,
        source: 'meal-nudge', signals: assessment.signals, score: assessment.score, risk_band: assessment.riskBand,
        intervention_sent: r === 'ok', intervention_sent_at: r === 'ok' ? new Date().toISOString() : null,
      }, { onConflict: 'enrollment_id,flagged_on,source', ignoreDuplicates: true })
    }
  }
  return NextResponse.json({ ok: true, sent, skipped, removed, dipsCaught })
}
