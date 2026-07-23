import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { sendPurchaseConfirmation, sendRefundConfirmation, sendChallengeWelcome } from '@/lib/email'
import { dispatchWebhooks } from '@/lib/webhooks'
import { FITNESS_PRICE_KEYS } from '@/lib/stripe-prices'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const productId = session.metadata?.productId

        // ---- Fitness subscription tiers (app/challenge/inner_circle, $10/$20/$50 mo) ----
        // Guest-friendly, keyed by email, same account-linking pattern as the legacy
        // one-time challenge flow below — but idempotent on stripe_subscription_id
        // since this is an ongoing subscription, not a single payment.
        if (session.metadata?.type === 'fitness_subscription') {
          const email = session.customer_email || session.customer_details?.email || ''
          const tier = (['app', 'challenge', 'inner_circle'].includes(session.metadata.tier || '')
            ? session.metadata.tier : 'app') as 'app' | 'challenge' | 'inner_circle'
          const name = session.metadata.name || ''
          const subscriptionId = session.subscription as string
          const customerId = session.customer as string

          const { data: existingEnrollment } = await supabase
            .from('challenge_enrollments')
            .select('id')
            .eq('stripe_subscription_id', subscriptionId)
            .maybeSingle()

          if (existingEnrollment) {
            console.log('Fitness subscription enrollment already recorded:', subscriptionId)
            break
          }

          let linkedUserId: string | null = null
          if (email) {
            const { data: prof } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', email)
              .maybeSingle()
            linkedUserId = prof?.id || null
          }

          const { error: enrollError } = await supabase
            .from('challenge_enrollments')
            .insert({
              user_id: linkedUserId,
              email,
              name,
              tier,
              status: 'active',
              amount: session.amount_total || 0,
              stripe_session_id: session.id,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              tier_started_at: new Date().toISOString(),
              started_at: new Date().toISOString(),
            })

          if (enrollError) {
            console.error('Failed to create fitness subscription enrollment:', enrollError)
            break
          }

          if (email && linkedUserId) {
            await supabase.from('emails').insert({ user_id: linkedUserId, email, type: 'purchase' })
          }
          if (email) {
            await sendChallengeWelcome(email, name, tier)
          }

          await dispatchWebhooks('challenge.enrolled', { email, tier, amount: session.amount_total })
          break
        }

        // ---- Challenge enrollment (guest-friendly, keyed by email) ----
        if (session.metadata?.type === 'challenge') {
          const email = session.customer_email || session.customer_details?.email || ''
          const tier = session.metadata.tier === 'inner_circle' ? 'inner_circle' : 'challenge'
          const cohortSlug = session.metadata.cohortSlug || 'founding'
          const name = session.metadata.name || ''

          // Idempotency
          const { data: existingEnrollment } = await supabase
            .from('challenge_enrollments')
            .select('id')
            .eq('stripe_session_id', session.id)
            .maybeSingle()

          if (existingEnrollment) {
            console.log('Enrollment already recorded for session:', session.id)
            break
          }

          // Find the cohort (for slot tracking)
          const { data: cohort } = await supabase
            .from('challenge_cohorts')
            .select('id, slots_filled, inner_circle_filled')
            .eq('slug', cohortSlug)
            .maybeSingle()

          // Link to an existing account if the email already has one
          let linkedUserId: string | null = null
          if (email) {
            const { data: prof } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', email)
              .maybeSingle()
            linkedUserId = prof?.id || null
          }

          const { error: enrollError } = await supabase
            .from('challenge_enrollments')
            .insert({
              user_id: linkedUserId,
              cohort_id: cohort?.id || null,
              email,
              name,
              tier,
              status: 'active',
              amount: session.amount_total || 0,
              stripe_session_id: session.id,
              stripe_payment_intent: session.payment_intent as string,
              started_at: new Date().toISOString(),
            })

          if (enrollError) {
            console.error('Failed to create enrollment:', enrollError)
            break
          }

          // Increment cohort slot counts
          if (cohort) {
            await supabase
              .from('challenge_cohorts')
              .update({
                slots_filled: (cohort.slots_filled || 0) + 1,
                ...(tier === 'inner_circle'
                  ? { inner_circle_filled: (cohort.inner_circle_filled || 0) + 1 }
                  : {}),
              })
              .eq('id', cohort.id)
          }

          // Log + send the challenge welcome email
          if (email && linkedUserId) {
            await supabase.from('emails').insert({ user_id: linkedUserId, email, type: 'purchase' })
          }
          if (email) {
            await sendChallengeWelcome(email, name, tier)
          }

          await dispatchWebhooks('challenge.enrolled', {
            email,
            tier,
            amount: session.amount_total,
            cohortSlug,
          })

          break
        }

        if (!userId || !productId) {
          console.error('Missing metadata in checkout session')
          break
        }

        // Check for idempotency — avoid duplicate purchases
        const { data: existingPurchase } = await supabase
          .from('purchases')
          .select('id')
          .eq('stripe_session_id', session.id)
          .single()

        if (existingPurchase) {
          console.log('Purchase already recorded for session:', session.id)
          break
        }

        // Record purchase
        const { error: purchaseError } = await supabase
          .from('purchases')
          .insert({
            user_id: userId,
            product_id: productId,
            stripe_payment_intent: session.payment_intent as string,
            stripe_session_id: session.id,
            amount: session.amount_total || 0,
            status: 'completed',
          })

        if (purchaseError) {
          console.error('Failed to insert purchase:', purchaseError)
          break
        }

        // Update user role to customer
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ role: 'customer' })
          .eq('id', userId)

        if (profileError) {
          console.error('Failed to update profile:', profileError)
        }

        // Record purchase email
        const customerEmail = session.customer_email || ''
        await supabase.from('emails').insert({
          user_id: userId,
          email: customerEmail,
          type: 'purchase',
        })

        // Send purchase confirmation email
        const { data: product } = await supabase
          .from('products')
          .select('name')
          .eq('id', productId)
          .single()

        if (customerEmail) {
          await sendPurchaseConfirmation(
            customerEmail,
            product?.name || 'FitPro Program',
            session.amount_total || 0
          )
        }

        // Process affiliate referral
        const affiliateCode = session.metadata?.affiliateCode
        if (affiliateCode) {
          const { data: affiliate } = await supabase
            .from('affiliates')
            .select('id, commission_rate')
            .eq('code', affiliateCode.toLowerCase())
            .eq('active', true)
            .single()

          if (affiliate) {
            const commissionAmount = Math.round((session.amount_total || 0) * affiliate.commission_rate / 100)

            // Get the purchase we just created
            const { data: newPurchase } = await supabase
              .from('purchases')
              .select('id')
              .eq('stripe_session_id', session.id)
              .single()

            await supabase.from('referrals').insert({
              affiliate_id: affiliate.id,
              referred_user_id: userId,
              purchase_id: newPurchase?.id || null,
              commission_amount: commissionAmount,
              status: 'earned',
            })
          }
        }

        // Dispatch outbound webhooks
        await dispatchWebhooks('purchase.completed', {
          userId,
          productId,
          amount: session.amount_total,
          email: customerEmail,
        })

        break
      }

      case 'invoice.payment_succeeded': {
        // Payment-plan installments: cancel the subscription once all payments are collected (3× $50).
        const invoice = event.data.object as Stripe.Invoice
        const subId = (invoice as unknown as { subscription?: string }).subscription
        if (!subId) break
        const sub = await stripe().subscriptions.retrieve(subId)
        const installments = Number(sub.metadata?.installments || 0)
        if (installments > 0) {
          const paid = await stripe().invoices.list({ subscription: subId, status: 'paid', limit: 100 })
          if (paid.data.length >= installments) {
            await stripe().subscriptions.cancel(subId)
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        // Keeps challenge_enrollments.tier in sync if a fitness subscription's price
        // changes for any reason (manual upgrade, the tier-downgrade cron, etc).
        const sub = event.data.object as Stripe.Subscription
        if (sub.metadata?.type !== 'fitness_subscription') break
        const priceId = sub.items.data[0]?.price?.id
        if (!priceId) break

        const [appPrice, challengePrice, innerPrice] = await Promise.all([
          stripe().prices.list({ lookup_keys: [FITNESS_PRICE_KEYS.app], limit: 1 }),
          stripe().prices.list({ lookup_keys: [FITNESS_PRICE_KEYS.challenge], limit: 1 }),
          stripe().prices.list({ lookup_keys: [FITNESS_PRICE_KEYS.inner_circle], limit: 1 }),
        ])
        const tier = priceId === innerPrice.data[0]?.id ? 'inner_circle'
          : priceId === challengePrice.data[0]?.id ? 'challenge'
          : priceId === appPrice.data[0]?.id ? 'app'
          : null
        if (!tier) break

        // Only reset tier_started_at when the tier actually changed — Stripe fires
        // subscription.updated for lots of unrelated reasons (payment method changes,
        // etc), and resetting the clock on every ping would defeat the 6-week
        // auto-downgrade entirely.
        const { data: current } = await supabase
          .from('challenge_enrollments')
          .select('tier')
          .eq('stripe_subscription_id', sub.id)
          .maybeSingle()
        if (current && current.tier !== tier) {
          await supabase
            .from('challenge_enrollments')
            .update({ tier, tier_started_at: new Date().toISOString() })
            .eq('stripe_subscription_id', sub.id)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        if (sub.metadata?.type !== 'fitness_subscription') break
        await supabase
          .from('challenge_enrollments')
          .update({ status: 'cancelled' })
          .eq('stripe_subscription_id', sub.id)
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const paymentIntent = charge.payment_intent as string

        // Find the purchase with product info
        const { data: purchase } = await supabase
          .from('purchases')
          .select('id, user_id, product_id, amount')
          .eq('stripe_payment_intent', paymentIntent)
          .single()

        if (purchase) {
          // Update purchase status
          await supabase
            .from('purchases')
            .update({ status: 'refunded' })
            .eq('id', purchase.id)

          // Check if user has other completed purchases
          const { data: otherPurchases } = await supabase
            .from('purchases')
            .select('id')
            .eq('user_id', purchase.user_id)
            .eq('status', 'completed')

          // If no other purchases, revert role to free
          if (!otherPurchases || otherPurchases.length === 0) {
            await supabase
              .from('profiles')
              .update({ role: 'free' })
              .eq('id', purchase.user_id)
          }

          // Get user email and product name for notification
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

          const userEmail = profile?.email || ''

          // Record refund email
          await supabase.from('emails').insert({
            user_id: purchase.user_id,
            email: userEmail,
            type: 'refund',
          })

          // Send refund confirmation email
          if (userEmail) {
            await sendRefundConfirmation(
              userEmail,
              product?.name || 'FitPro Program',
              charge.amount_refunded || purchase.amount || 0
            )
          }

          // Dispatch outbound webhooks
          await dispatchWebhooks('purchase.refunded', {
            userId: purchase.user_id,
            productId: purchase.product_id,
            amount: charge.amount_refunded,
            email: userEmail,
          })
        }

        break
      }
    }
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
