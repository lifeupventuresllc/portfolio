import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendOnboardingDay3Email, sendOnboardingDay7Email, sendPurchaseOnboardingDay3Email, sendPurchaseOnboardingDay7Email, sendCheckinEmail } from '@/lib/email'
import { publishToInstagram, publishToTikTok } from '@/lib/social'

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

  // --- 8. Auto-publish scheduled posts ---
  let postsPublished = 0
  const { data: duePosts } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now.toISOString())

  for (const post of duePosts || []) {
    if (!post.media_url) continue

    await supabase.from('scheduled_posts').update({ status: 'publishing' }).eq('id', post.id)

    const fullCaption = post.hashtags ? `${post.caption}\n\n${post.hashtags}` : post.caption
    let success = true
    let publishedId = ''
    const errors: string[] = []

    // Instagram
    if (post.platform === 'instagram' || post.platform === 'both') {
      const { data: igAccount } = await supabase
        .from('social_accounts')
        .select('page_access_token, ig_user_id')
        .eq('platform', 'instagram')
        .eq('active', true)
        .single()

      if (igAccount) {
        const result = await publishToInstagram(igAccount.page_access_token, igAccount.ig_user_id, post.media_url, fullCaption)
        if ('id' in result) { publishedId = result.id } else { success = false; errors.push(`IG: ${result.error}`) }
      } else { success = false; errors.push('IG: No account connected') }
    }

    // TikTok
    if (post.platform === 'tiktok' || post.platform === 'both') {
      const { data: ttAccount } = await supabase
        .from('social_accounts')
        .select('access_token')
        .eq('platform', 'tiktok')
        .eq('active', true)
        .single()

      if (ttAccount) {
        const result = await publishToTikTok(ttAccount.access_token, post.media_url, fullCaption)
        if ('id' in result) { if (!publishedId) publishedId = result.id } else { success = false; errors.push(`TT: ${result.error}`) }
      } else { success = false; errors.push('TT: No account connected') }
    }

    await supabase.from('scheduled_posts').update({
      status: success ? 'published' : 'failed',
      published_at: success ? now.toISOString() : null,
      published_id: publishedId || null,
      error_message: errors.length > 0 ? errors.join('; ') : null,
    }).eq('id', post.id)

    if (success) postsPublished++
  }

  return NextResponse.json({ ok: true, date: today, checkinsSent, postsPublished })
}
