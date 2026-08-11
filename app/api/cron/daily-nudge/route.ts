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
  const { data: subs } = await svc.from('push_subscriptions').select('endpoint, p256dh, auth, enrollment_id, user_id, timezone')
  const enrollmentIds = (subs || []).map((s) => s.enrollment_id).filter(Boolean) as string[]

  // Keyed per enrollment, not one shared UTC date — she may already be on the
  // next calendar day locally while the batch's UTC "today" hasn't rolled
  // over yet (or vice versa), so a single shared date silently mismatches
  // her real logged_on rows for a large share of non-US timezones.
  const { data: shown } = enrollmentIds.length
    ? await svc.from('challenge_progress').select('enrollment_id, logged_on').eq('note', '__daily__').in('enrollment_id', enrollmentIds)
    : { data: [] }
  const shownByEnrollment = new Map<string, Set<string>>()
  for (const row of shown || []) {
    const id = row.enrollment_id as string
    if (!shownByEnrollment.has(id)) shownByEnrollment.set(id, new Set())
    shownByEnrollment.get(id)!.add(row.logged_on as string)
  }

  let sent = 0, removed = 0, skipped = 0, dipsCaught = 0
  for (const s of (subs || [])) {
    const localToday = localDateISO((s.timezone as string) || undefined)
    if (s.enrollment_id && shownByEnrollment.get(s.enrollment_id as string)?.has(localToday)) { skipped++; continue }

    let payload = {
      title: 'Your workout’s waiting 💪🏽',
      body: "Even 20 minutes counts. Tap to start today's session — your plan's ready.",
      url: '/plan',
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

    // Beta metrics: one row per enrollment/day/source, upserted so a retry or a
    // second cron pass this same local day can't double-log (see fos_risk_flags'
    // unique index). Only from here and meal-nudge — the only two places outreach
    // actually happens; see lib/fos/pattern.ts's beta-metrics note.
    if (s.enrollment_id && assessment?.isDip) {
      await svc.from('fos_risk_flags').upsert({
        enrollment_id: s.enrollment_id, user_id: s.user_id ?? null, flagged_on: localToday,
        source: 'daily-nudge', signals: assessment.signals, score: assessment.score, risk_band: assessment.riskBand,
        intervention_sent: r === 'ok', intervention_sent_at: r === 'ok' ? new Date().toISOString() : null,
      }, { onConflict: 'enrollment_id,flagged_on,source', ignoreDuplicates: true })
    }
  }
  return NextResponse.json({ ok: true, sent, skipped, removed, dipsCaught })
}
