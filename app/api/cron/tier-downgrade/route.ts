import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { getOrCreatePrice, FITNESS_PRICE_KEYS, FITNESS_PRICE_AMOUNTS, FITNESS_PRICE_NICKNAMES } from '@/lib/stripe-prices'

// The $20/$50 fitness tiers were sold as a 6-week program — after 6 weeks (42 days)
// on the higher tier, auto-downgrade the Stripe subscription to the $10 app-only
// price unless the member has already upgraded/renewed (tier_started_at would have
// been reset by the webhook's customer.subscription.updated handler in that case).
// proration_behavior: 'none' — no surprise partial charge or refund on the swap.
export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const svc = createServiceClient()
  const cutoff = new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString()

  const { data: due } = await svc
    .from('challenge_enrollments')
    .select('id, stripe_subscription_id, tier')
    .in('tier', ['challenge', 'inner_circle'])
    .eq('status', 'active')
    .not('stripe_subscription_id', 'is', null)
    .lte('tier_started_at', cutoff)

  const appPriceId = await getOrCreatePrice(FITNESS_PRICE_KEYS.app, FITNESS_PRICE_AMOUNTS.app, FITNESS_PRICE_NICKNAMES.app)

  let downgraded = 0, failed = 0
  for (const row of due || []) {
    const subId = row.stripe_subscription_id as string
    try {
      const sub = await stripe().subscriptions.retrieve(subId)
      const itemId = sub.items.data[0]?.id
      if (!itemId) { failed++; continue }

      await stripe().subscriptions.update(subId, {
        items: [{ id: itemId, price: appPriceId }],
        proration_behavior: 'none',
      })
      await svc
        .from('challenge_enrollments')
        .update({ tier: 'app', tier_started_at: new Date().toISOString() })
        .eq('id', row.id)
      downgraded++
    } catch (err) {
      console.error('tier-downgrade failed for enrollment', row.id, err)
      failed++
    }
  }

  return NextResponse.json({ ok: true, downgraded, failed, checked: (due || []).length })
}
