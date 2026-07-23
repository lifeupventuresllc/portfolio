import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Step 6 of the Daily 10 — "The Refinement": weekly review & adjustment.
// Compares this rolling 7-day window against the prior one for each live stage,
// flags the biggest week-over-week drop as the likely leak, and stores Asa's
// written adjustment decision for the week.
async function verifyAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'support') return null
  return user
}

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? null : 0 // null = "new" (no baseline to compare against)
  return Math.round(((current - previous) / previous) * 100)
}

export async function GET() {
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const svc = createServiceClient()

  const currentStart = startOfDay(daysAgo(6)).toISOString()
  const previousStart = startOfDay(daysAgo(13)).toISOString()
  const previousEnd = currentStart

  const [
    leadsCurrent, leadsPrevious,
    emailsCurrent, emailsPrevious,
    enrollmentsCurrent, enrollmentsPrevious,
    postsCurrent, postsPrevious,
    reviewsRes,
  ] = await Promise.all([
    svc.from('funnel_leads').select('id', { count: 'exact', head: true }).eq('source', 'blueprint').gte('created_at', currentStart),
    svc.from('funnel_leads').select('id', { count: 'exact', head: true }).eq('source', 'blueprint').gte('created_at', previousStart).lt('created_at', previousEnd),
    svc.from('follow_up_queue').select('id', { count: 'exact', head: true }).eq('sequence_type', 'funnel-nurture').eq('status', 'sent').gte('sent_at', currentStart),
    svc.from('follow_up_queue').select('id', { count: 'exact', head: true }).eq('sequence_type', 'funnel-nurture').eq('status', 'sent').gte('sent_at', previousStart).lt('sent_at', previousEnd),
    svc.from('challenge_enrollments').select('id', { count: 'exact', head: true }).gte('created_at', currentStart),
    svc.from('challenge_enrollments').select('id', { count: 'exact', head: true }).gte('created_at', previousStart).lt('created_at', previousEnd),
    svc.from('scheduled_posts').select('id', { count: 'exact', head: true }).eq('status', 'published').gte('published_at', currentStart),
    svc.from('scheduled_posts').select('id', { count: 'exact', head: true }).eq('status', 'published').gte('published_at', previousStart).lt('published_at', previousEnd),
    svc.from('daily_10_weekly_reviews').select('week_start, note, updated_at').order('week_start', { ascending: false }).limit(8),
  ])

  const stages = [
    { key: 'content', label: 'Content', live: false, current: postsCurrent.count || 0, previous: postsPrevious.count || 0 },
    { key: 'blueprint_leads', label: 'Blueprint Leads', live: true, current: leadsCurrent.count || 0, previous: leadsPrevious.count || 0 },
    { key: 'nurture_emails', label: 'Nurture Emails', live: true, current: emailsCurrent.count || 0, previous: emailsPrevious.count || 0 },
    { key: 'app_conversions', label: 'App Conversions', live: true, current: enrollmentsCurrent.count || 0, previous: enrollmentsPrevious.count || 0 },
  ].map(s => ({ ...s, change_pct: pctChange(s.current, s.previous) }))

  const liveDrops = stages.filter(s => s.live && s.change_pct !== null && s.change_pct < 0)
  const leak = liveDrops.length > 0
    ? liveDrops.reduce((worst, s) => (s.change_pct! < worst.change_pct! ? s : worst))
    : null

  const reviews = reviewsRes.data || []
  const currentWeekStart = currentStart.slice(0, 10)
  const currentReview = reviews.find(r => r.week_start === currentWeekStart) || null

  return NextResponse.json({
    window: { current_start: currentStart, previous_start: previousStart },
    stages,
    leak: leak ? { stage: leak.label, change_pct: leak.change_pct } : null,
    current_week_start: currentWeekStart,
    current_note: currentReview?.note || '',
    history: reviews.filter(r => r.week_start !== currentWeekStart),
  })
}

export async function POST(req: Request) {
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const svc = createServiceClient()

  const { week_start, note } = await req.json()
  if (!week_start || typeof note !== 'string') {
    return NextResponse.json({ error: 'week_start and note are required' }, { status: 400 })
  }

  const { error } = await svc.from('daily_10_weekly_reviews').upsert(
    { week_start, note, created_by: user.id, updated_at: new Date().toISOString() },
    { onConflict: 'week_start' }
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
