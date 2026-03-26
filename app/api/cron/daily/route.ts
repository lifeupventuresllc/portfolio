import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendOnboardingDay3Email, sendOnboardingDay7Email } from '@/lib/email'
import { sendFollowUpEmail, FUNNEL_NURTURE_SEQUENCE } from '@/lib/follow-up-emails'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // --- 1. Snapshot daily metrics ---
  const today = new Date().toISOString().split('T')[0]

  const [profilesRes, purchasesRes] = await Promise.all([
    supabase.from('profiles').select('role'),
    supabase.from('purchases').select('amount, status'),
  ])

  const profiles = profilesRes.data || []
  const purchases = purchasesRes.data || []
  const completed = purchases.filter(p => p.status === 'completed')
  const refunded = purchases.filter(p => p.status === 'refunded')

  await supabase.from('daily_metrics').upsert({
    date: today,
    total_users: profiles.length,
    total_customers: profiles.filter(p => p.role === 'customer').length,
    total_revenue: completed.reduce((sum, p) => sum + p.amount, 0),
    total_sales: completed.length,
    total_refunds: refunded.length,
  }, { onConflict: 'date' })

  // --- 2. Send onboarding emails ---
  const now = new Date()
  const day3Ago = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const day3Start = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString()
  const day7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const day7Start = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString()

  // Day 3 onboarding
  const { data: day3Users } = await supabase
    .from('profiles')
    .select('id, email')
    .gte('created_at', day3Start)
    .lt('created_at', day3Ago)

  for (const user of day3Users || []) {
    const { data: alreadySent } = await supabase
      .from('emails')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'onboarding_day3')
      .limit(1)

    if (!alreadySent || alreadySent.length === 0) {
      await sendOnboardingDay3Email(user.email)
      await supabase.from('emails').insert({
        user_id: user.id,
        email: user.email,
        type: 'onboarding_day3',
      })
    }
  }

  // Day 7 onboarding
  const { data: day7Users } = await supabase
    .from('profiles')
    .select('id, email')
    .gte('created_at', day7Start)
    .lt('created_at', day7Ago)

  for (const user of day7Users || []) {
    const { data: alreadySent } = await supabase
      .from('emails')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'onboarding_day7')
      .limit(1)

    if (!alreadySent || alreadySent.length === 0) {
      await sendOnboardingDay7Email(user.email)
      await supabase.from('emails').insert({
        user_id: user.id,
        email: user.email,
        type: 'onboarding_day7',
      })
    }
  }

  // --- 3. Process funnel follow-up sequences ---
  let followUpsSent = 0
  const { data: pendingFollowUps } = await supabase
    .from('follow_up_queue')
    .select('id, lead_id, step, sequence_type')
    .eq('status', 'pending')
    .lte('scheduled_for', now.toISOString())
    .limit(50)

  for (const item of pendingFollowUps || []) {
    if (item.sequence_type !== 'funnel-nurture') continue

    const { data: lead } = await supabase
      .from('funnel_leads')
      .select('name, email, service, status')
      .eq('id', item.lead_id)
      .single()

    if (!lead || lead.status === 'converted' || lead.status === 'lost') {
      await supabase.from('follow_up_queue').update({ status: 'skipped' }).eq('id', item.id)
      continue
    }

    const firstName = lead.name.split(' ')[0]
    const sent = await sendFollowUpEmail(lead.email, firstName, lead.service, item.step)

    await supabase.from('follow_up_queue').update({
      status: sent ? 'sent' : 'skipped',
      sent_at: sent ? now.toISOString() : null,
    }).eq('id', item.id)

    if (sent) {
      await supabase.from('funnel_leads').update({
        last_email_at: now.toISOString(),
        follow_up_stage: item.step + 1,
        lead_score: lead.status === 'new' ? 10 + (item.step * 5) : undefined,
      }).eq('id', item.lead_id)

      followUpsSent++
    }
  }

  // --- 4. Auto-schedule follow-ups for new funnel leads ---
  const { data: newLeads } = await supabase
    .from('funnel_leads')
    .select('id, created_at')
    .eq('follow_up_stage', 0)
    .eq('status', 'new')

  for (const lead of newLeads || []) {
    const leadDate = new Date(lead.created_at)

    for (let i = 0; i < FUNNEL_NURTURE_SEQUENCE.length; i++) {
      const step = FUNNEL_NURTURE_SEQUENCE[i]
      const scheduledFor = new Date(leadDate.getTime() + step.delayDays * 24 * 60 * 60 * 1000)

      // Only schedule if in the future
      if (scheduledFor > now) {
        await supabase.from('follow_up_queue').insert({
          lead_id: lead.id,
          sequence_type: 'funnel-nurture',
          step: i,
          scheduled_for: scheduledFor.toISOString(),
          status: 'pending',
        })
      }
    }

    // Mark as scheduled
    await supabase.from('funnel_leads').update({ follow_up_stage: 1 }).eq('id', lead.id)
  }

  return NextResponse.json({ ok: true, date: today, followUpsSent })
}
