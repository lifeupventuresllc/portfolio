import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getMemberEnrollment } from '@/lib/member'
import { localDateISO, localMondayIndex, addDaysISO } from '@/lib/localdate'
import { streakFrom } from '@/lib/streak'
import { selectMondayMemoSlot, mondayMemoFor } from '@/lib/monday-memos'

// Challenge + Inner Circle exclusive. Returns null (nothing to show) unless
// it's actually Monday for HER, she's on an eligible tier, and Asa has
// recorded real audio for the slot her actual week earned. No decision for
// her to make — either it's there or it isn't.
export async function GET() {
  const { user, enrollment } = await getMemberEnrollment()
  if (!user || !enrollment) return NextResponse.json({ memo: null })
  if (enrollment.tier !== 'challenge' && enrollment.tier !== 'inner_circle') return NextResponse.json({ memo: null })

  const todayISO = localDateISO()
  if (localMondayIndex() !== 0) return NextResponse.json({ memo: null }) // only relevant on her Monday

  const svc = createServiceClient()
  const [{ data: intake }, { data: progress }] = await Promise.all([
    svc.from('challenge_intake').select('days_per_week').eq('enrollment_id', enrollment.id).maybeSingle(),
    svc.from('challenge_progress').select('logged_on, measurements').eq('enrollment_id', enrollment.id).eq('note', '__daily__'),
  ])

  const dates = new Set<string>((progress || []).map((r) => r.logged_on as string))
  const lastWeekStart = addDaysISO(todayISO, -7)
  const lastWeekEnd = addDaysISO(todayISO, -1)
  let completedLastWeek = 0
  for (const r of progress || []) {
    const d = r.logged_on as string
    if (d >= lastWeekStart && d <= lastWeekEnd && (r.measurements as { workout?: boolean } | null)?.workout) completedLastWeek++
  }
  const streakDays = streakFrom(dates, todayISO)
  const daysPerWeek = Number(intake?.days_per_week) || 3

  const slot = selectMondayMemoSlot({ completedLastWeek, daysPerWeek, streakDays })
  const memo = mondayMemoFor(slot)
  if (!memo?.audioUrl) return NextResponse.json({ memo: null }) // nothing recorded for this slot yet

  return NextResponse.json({ memo })
}
