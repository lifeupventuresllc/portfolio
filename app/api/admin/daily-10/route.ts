import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Live status of the whole "Daily 10" pipeline: Content -> Blueprint Leads -> Nurture Emails -> App Conversions.
// Pure aggregation of existing tables, no new schema.
async function verifyAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' || profile?.role === 'support'
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

export async function GET() {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const svc = createServiceClient()

  const todayStart = startOfDay(new Date()).toISOString()
  const weekStart = startOfDay(daysAgo(6)).toISOString()

  const [
    accountsRes,
    postsPublishedTodayRes,
    postsQueuedRes,
    leadsTodayRes,
    leadsWeekRes,
    emailsSentTodayRes,
    emailsPendingRes,
    enrollmentsTodayRes,
    enrollmentsWeekRes,
    recentLeadsRes,
  ] = await Promise.all([
    svc.from('social_accounts').select('platform, active').eq('active', true),
    svc.from('scheduled_posts').select('id', { count: 'exact', head: true }).eq('status', 'published').gte('published_at', todayStart),
    svc.from('scheduled_posts').select('id', { count: 'exact', head: true }).in('status', ['scheduled', 'draft']),
    svc.from('funnel_leads').select('id', { count: 'exact', head: true }).eq('source', 'blueprint').gte('created_at', todayStart),
    svc.from('funnel_leads').select('id', { count: 'exact', head: true }).eq('source', 'blueprint').gte('created_at', weekStart),
    svc.from('follow_up_queue').select('id', { count: 'exact', head: true }).eq('sequence_type', 'funnel-nurture').eq('status', 'sent').gte('sent_at', todayStart),
    svc.from('follow_up_queue').select('id', { count: 'exact', head: true }).eq('sequence_type', 'funnel-nurture').eq('status', 'pending'),
    svc.from('challenge_enrollments').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
    svc.from('challenge_enrollments').select('id', { count: 'exact', head: true }).gte('created_at', weekStart),
    svc.from('funnel_leads').select('email, created_at').eq('source', 'blueprint').gte('created_at', weekStart),
  ])

  // Conversion match: did any of this week's blueprint leads show up as a challenge enrollment (by email)?
  let convertedThisWeek = 0
  const leadEmails = (recentLeadsRes.data || []).map(l => l.email).filter(Boolean)
  if (leadEmails.length > 0) {
    const { data: matched } = await svc
      .from('challenge_enrollments')
      .select('email')
      .in('email', leadEmails)
    convertedThisWeek = new Set((matched || []).map(m => m.email)).size
  }

  const connectedPlatforms = (accountsRes.data || []).map(a => a.platform)

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    stages: {
      content: {
        automated: connectedPlatforms.length > 0,
        connected_platforms: connectedPlatforms,
        published_today: postsPublishedTodayRes.count || 0,
        queued: postsQueuedRes.count || 0,
      },
      blueprint_leads: {
        automated: true,
        today: leadsTodayRes.count || 0,
        this_week: leadsWeekRes.count || 0,
      },
      nurture_emails: {
        automated: true,
        sent_today: emailsSentTodayRes.count || 0,
        pending_in_queue: emailsPendingRes.count || 0,
      },
      app_conversions: {
        automated: true,
        today: enrollmentsTodayRes.count || 0,
        this_week: enrollmentsWeekRes.count || 0,
        matched_from_blueprint_this_week: convertedThisWeek,
      },
    },
    daily_10_goal: {
      metric: 'blueprint_leads_today',
      target: 10,
      actual: leadsTodayRes.count || 0,
    },
  })
}
