import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { localDateISO, addDaysISO } from '@/lib/localdate'

// Beta metrics, step 2 — scores every flag from fos_risk_flags (written by
// daily-nudge/meal-nudge, see lib/fos/pattern.ts) once it's old enough to know what
// actually happened. Two questions: did she actually go quiet after being flagged
// (prediction accuracy), and if we reached out, did it bring her back, get ignored,
// or make things worse (intervention response). N=7 days: the same order of
// magnitude as the 3-day silent threshold and 5-day eating-out window — long enough
// to tell a real drop-off from a one-week blip, short enough to keep the beta
// feedback loop fast. Not tuned against real outcome data yet — revisit once this
// job has a few weeks of real numbers behind it (see app/admin/beta-metrics).
const BACKTEST_WINDOW_DAYS = 7

export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const svc = createServiceClient()
  const cutoff = addDaysISO(localDateISO(), -BACKTEST_WINDOW_DAYS)
  const { data: flags } = await svc.from('fos_risk_flags').select('*').is('backtested_at', null).lte('flagged_on', cutoff)

  if (!flags || flags.length === 0) {
    return NextResponse.json({ ok: true, backtested: 0, wentQuiet: 0, falseAlarm: 0, reengaged: 0, noResponse: 0, acceleratedDropoff: 0 })
  }

  const enrollmentIds = Array.from(new Set(flags.map((f) => f.enrollment_id as string)))
  const [{ data: progressRows }, { data: foodRows }, { data: enrollments }] = await Promise.all([
    svc.from('challenge_progress').select('enrollment_id, logged_on').eq('note', '__daily__').in('enrollment_id', enrollmentIds),
    svc.from('challenge_food_log').select('enrollment_id, logged_on').in('enrollment_id', enrollmentIds),
    svc.from('challenge_enrollments').select('id, last_active_at, status').in('id', enrollmentIds),
  ])

  const datesByEnrollment = new Map<string, Set<string>>()
  for (const row of [...(progressRows || []), ...(foodRows || [])]) {
    const id = row.enrollment_id as string
    if (!datesByEnrollment.has(id)) datesByEnrollment.set(id, new Set())
    datesByEnrollment.get(id)!.add(row.logged_on as string)
  }
  const enrollmentById = new Map((enrollments || []).map((e) => [e.id as string, e]))

  let wentQuiet = 0, falseAlarm = 0, reengaged = 0, noResponse = 0, acceleratedDropoff = 0

  for (const flag of flags) {
    const enrollmentId = flag.enrollment_id as string
    const flaggedOn = flag.flagged_on as string
    const windowEnd = addDaysISO(flaggedOn, BACKTEST_WINDOW_DAYS)
    const dates = datesByEnrollment.get(enrollmentId) || new Set<string>()
    const activeDaysAfter = Array.from(dates).filter((d) => d > flaggedOn && d <= windowEnd).length

    const predictionOutcome = activeDaysAfter <= 1 ? 'went_quiet' : 'false_alarm'
    if (predictionOutcome === 'went_quiet') wentQuiet++; else falseAlarm++

    let responseOutcome: string | null = null
    if (flag.intervention_sent) {
      const enrollment = enrollmentById.get(enrollmentId)
      const neverActiveSince = !enrollment?.last_active_at || (enrollment.last_active_at as string) <= flaggedOn
      if (neverActiveSince || enrollment?.status === 'cancelled') { responseOutcome = 'accelerated_dropoff'; acceleratedDropoff++ }
      else if (activeDaysAfter >= 3) { responseOutcome = 'reengaged'; reengaged++ }
      else { responseOutcome = 'no_response'; noResponse++ }
    }

    await svc.from('fos_risk_flags').update({
      backtested_at: new Date().toISOString(),
      prediction_outcome: predictionOutcome,
      response_outcome: responseOutcome,
    }).eq('id', flag.id)
  }

  return NextResponse.json({ ok: true, backtested: flags.length, wentQuiet, falseAlarm, reengaged, noResponse, acceleratedDropoff })
}
