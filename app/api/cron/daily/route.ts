import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendOnboardingDay3Email, sendOnboardingDay7Email, sendPurchaseOnboardingDay3Email, sendPurchaseOnboardingDay7Email, sendUpsellEmail, sendCheckinEmail } from '@/lib/email'
import { sendFollowUpEmail, sendProspectFollowUpEmail, FUNNEL_NURTURE_SEQUENCE } from '@/lib/follow-up-emails'
import { computeLeadScore } from '@/lib/lead-scoring'

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

  // --- 2b. Send purchase onboarding emails ---

  // Purchase Day 3: check-in / intake form reminder
  const { data: day3Purchases } = await supabase
    .from('purchases')
    .select('id, user_id, product_id')
    .eq('status', 'completed')
    .gte('created_at', day3Start)
    .lt('created_at', day3Ago)

  for (const purchase of day3Purchases || []) {
    const { data: alreadySent } = await supabase
      .from('emails')
      .select('id')
      .eq('user_id', purchase.user_id)
      .eq('type', 'purchase_onboarding_day3')
      .limit(1)

    if (!alreadySent || alreadySent.length === 0) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', purchase.user_id)
        .single()

      const { data: product } = await supabase
        .from('products')
        .select('name')
        .eq('id', purchase.product_id)
        .single()

      if (profile?.email) {
        await sendPurchaseOnboardingDay3Email(profile.email, product?.name || 'your service')
        await supabase.from('emails').insert({
          user_id: purchase.user_id,
          email: profile.email,
          type: 'purchase_onboarding_day3',
        })
      }
    }
  }

  // Purchase Day 7: tips for best results
  const { data: day7Purchases } = await supabase
    .from('purchases')
    .select('id, user_id, product_id')
    .eq('status', 'completed')
    .gte('created_at', day7Start)
    .lt('created_at', day7Ago)

  for (const purchase of day7Purchases || []) {
    const { data: alreadySent } = await supabase
      .from('emails')
      .select('id')
      .eq('user_id', purchase.user_id)
      .eq('type', 'purchase_onboarding_day7')
      .limit(1)

    if (!alreadySent || alreadySent.length === 0) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', purchase.user_id)
        .single()

      const { data: product } = await supabase
        .from('products')
        .select('name')
        .eq('id', purchase.product_id)
        .single()

      if (profile?.email) {
        await sendPurchaseOnboardingDay7Email(profile.email, product?.name || 'your service')
        await supabase.from('emails').insert({
          user_id: purchase.user_id,
          email: profile.email,
          type: 'purchase_onboarding_day7',
        })
      }
    }
  }

  // --- 2c. Send upsell emails for completed projects (3-stage sequence) ---
  // Stage 1: Day 3 after completion
  // Stage 2: Day 7 after completion
  // Stage 3: Day 14 after completion
  const upsellStages = [
    { daysAfter: 3, stage: 1 },
    { daysAfter: 7, stage: 2 },
    { daysAfter: 14, stage: 3 },
  ]

  for (const { daysAfter, stage } of upsellStages) {
    const targetDate = new Date(now.getTime() - daysAfter * 24 * 60 * 60 * 1000)
    const targetStart = new Date(targetDate)
    targetStart.setHours(0, 0, 0, 0)
    const targetEnd = new Date(targetDate)
    targetEnd.setHours(23, 59, 59, 999)

    const { data: completedProjects } = await supabase
      .from('projects')
      .select('id, client_name, client_email, service_type')
      .eq('status', 'complete')
      .gte('completed_at', targetStart.toISOString())
      .lte('completed_at', targetEnd.toISOString())

    for (const project of completedProjects || []) {
      if (!project.client_email) continue

      const { data: clientProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', project.client_email)
        .single()

      if (!clientProfile) continue

      // Check if this stage already sent
      const { data: alreadySent } = await supabase
        .from('emails')
        .select('id')
        .eq('user_id', clientProfile.id)
        .eq('type', `upsell-${stage}`)
        .limit(1)

      if (!alreadySent || alreadySent.length === 0) {
        const firstName = project.client_name.split(' ')[0]
        await sendUpsellEmail(project.client_email, firstName, project.service_type, stage)
        await supabase.from('emails').insert({
          user_id: clientProfile.id,
          email: project.client_email,
          type: `upsell-${stage}`,
        })
      }
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

  // --- 5. Process prospect follow-ups ---
  let prospectFollowUpsSent = 0
  const { data: pendingProspectFollowUps } = await supabase
    .from('follow_up_queue')
    .select('id, prospect_id, step')
    .eq('status', 'pending')
    .not('prospect_id', 'is', null)
    .lte('scheduled_for', now.toISOString())
    .limit(50)

  for (const item of pendingProspectFollowUps || []) {
    const { data: prospect } = await supabase
      .from('outreach_prospects')
      .select('name, email, status')
      .eq('id', item.prospect_id)
      .single()

    if (!prospect || !prospect.email || ['closed', 'lost', 'replied'].includes(prospect.status)) {
      await supabase.from('follow_up_queue').update({ status: 'skipped' }).eq('id', item.id)
      continue
    }

    const firstName = prospect.name.split(' ')[0]
    const sent = await sendProspectFollowUpEmail(prospect.email, firstName, item.step)

    await supabase.from('follow_up_queue').update({
      status: sent ? 'sent' : 'skipped',
      sent_at: sent ? now.toISOString() : null,
    }).eq('id', item.id)

    if (sent) {
      await supabase.from('outreach_prospects').update({
        touch_count: (prospect as Record<string, unknown>).touch_count as number + 1 || 1,
        last_contacted_at: now.toISOString(),
      }).eq('id', item.prospect_id)
      prospectFollowUpsSent++
    }
  }

  // --- 6. Client check-ins (30/60/90 day) ---
  let checkinsSent = 0
  const checkinDays: Array<{ days: number; type: '30' | '60' | '90' }> = [
    { days: 30, type: '30' },
    { days: 60, type: '60' },
    { days: 90, type: '90' },
  ]

  for (const { days, type } of checkinDays) {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() - days)
    const targetStr = targetDate.toISOString().split('T')[0]

    // Find customers who purchased on this date
    const { data: customers } = await supabase
      .from('purchases')
      .select('user_id, profiles!inner(email, full_name)')
      .eq('status', 'completed')
      .gte('created_at', targetStr + 'T00:00:00')
      .lt('created_at', targetStr + 'T23:59:59')

    for (const customer of customers || []) {
      const profile = (customer as Record<string, unknown>).profiles as Record<string, string>
      const customerEmail = profile?.email
      if (!customerEmail) continue

      // Check if already sent
      const { data: existing } = await supabase
        .from('client_checkins')
        .select('id')
        .eq('customer_email', customerEmail)
        .eq('checkin_type', type)
        .single()

      if (existing) continue

      await sendCheckinEmail(customerEmail, profile.full_name || 'there', type)
      await supabase.from('client_checkins').insert({
        customer_email: customerEmail,
        checkin_type: type,
      })
      checkinsSent++
    }
  }

  // --- 7. Recalculate lead scores ---
  const { data: activeLeads } = await supabase
    .from('funnel_leads')
    .select('id, status, follow_up_stage, last_email_at, phone, instagram, service, source')
    .not('status', 'in', '("converted","lost")')
    .limit(200)

  for (const lead of activeLeads || []) {
    const score = computeLeadScore(lead.status, lead.follow_up_stage || 0, lead.last_email_at, {
      hasPhone: !!lead.phone,
      hasInstagram: !!lead.instagram,
      serviceInterest: lead.service,
      funnelSource: lead.source,
    })
    await supabase.from('funnel_leads').update({ lead_score: score }).eq('id', lead.id)
  }

  return NextResponse.json({ ok: true, date: today, followUpsSent, prospectFollowUpsSent, checkinsSent })
}
