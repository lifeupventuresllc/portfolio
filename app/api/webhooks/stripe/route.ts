import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
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
        await supabase.from('emails').insert({
          user_id: userId,
          email: session.customer_email || '',
          type: 'purchase',
        })

        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const paymentIntent = charge.payment_intent as string

        // Find the purchase
        const { data: purchase } = await supabase
          .from('purchases')
          .select('id, user_id')
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

          // Record refund email
          await supabase.from('emails').insert({
            user_id: purchase.user_id,
            email: '',
            type: 'refund',
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
