import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendOnboardingDay3Email, sendOnboardingDay7Email } from '@/lib/email'

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

  return NextResponse.json({ ok: true, date: today })
}
