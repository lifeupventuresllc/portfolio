import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { purchaseId, paymentIntent } = await request.json()

    if (!purchaseId || !paymentIntent) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create refund in Stripe
    await stripe().refunds.create({
      payment_intent: paymentIntent,
    })

    // The webhook will handle updating the purchase status and user role
    // But we also update directly for immediate feedback
    const { data: purchase } = await supabase
      .from('purchases')
      .select('user_id')
      .eq('id', purchaseId)
      .single()

    await supabase
      .from('purchases')
      .update({ status: 'refunded' })
      .eq('id', purchaseId)

    if (purchase) {
      // Check if user has other completed purchases
      const { data: otherPurchases } = await supabase
        .from('purchases')
        .select('id')
        .eq('user_id', purchase.user_id)
        .eq('status', 'completed')
        .neq('id', purchaseId)

      if (!otherPurchases || otherPurchases.length === 0) {
        await supabase
          .from('profiles')
          .update({ role: 'free' })
          .eq('id', purchase.user_id)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Refund error:', error)
    return NextResponse.json(
      { error: 'Failed to process refund' },
      { status: 500 }
    )
  }
}
