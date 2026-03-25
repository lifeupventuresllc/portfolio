import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { productId, email, packageSlug } = await request.json()

    // Direct checkout by slug (from service pages — no login required)
    if (packageSlug) {
      const PACKAGES: Record<string, { name: string; description: string; price: number; mode: 'payment' | 'subscription'; category: string }> = {
        'content-starter':    { name: 'Content Editing - Starter', description: '4 professionally edited Reels per month', price: 29700, mode: 'subscription', category: 'content-editing' },
        'content-growth':     { name: 'Content Editing - Growth', description: '8 professionally edited Reels per month', price: 59700, mode: 'subscription', category: 'content-editing' },
        'content-full-engine':{ name: 'Content Editing - Full Engine', description: '12+ professionally edited Reels per month', price: 99700, mode: 'subscription', category: 'content-editing' },
        'audio-single':       { name: 'Audio Engineering - Single', description: '1 track mix & master', price: 15000, mode: 'payment', category: 'audio-engineering' },
        'audio-ep':           { name: 'Audio Engineering - EP', description: '3-5 tracks mix & master', price: 50000, mode: 'payment', category: 'audio-engineering' },
        'audio-album':        { name: 'Audio Engineering - Album', description: '6-12 tracks mix & master', price: 100000, mode: 'payment', category: 'audio-engineering' },
      }

      const pkg = PACKAGES[packageSlug]
      if (!pkg) {
        return NextResponse.json({ error: 'Invalid package' }, { status: 400 })
      }

      const isSubscription = pkg.mode === 'subscription'
      const successCategory = pkg.category === 'content-editing' ? 'content-editing' : 'audio-engineering'

      const sessionParams: Record<string, unknown> = {
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: pkg.name,
                description: pkg.description,
              },
              unit_amount: pkg.price,
              ...(isSubscription ? { recurring: { interval: 'month' as const } } : {}),
            },
            quantity: 1,
          },
        ],
        mode: isSubscription ? 'subscription' : 'payment',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/services/${successCategory}?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/services/${successCategory}?canceled=true`,
        metadata: {
          userId: user?.id || 'guest',
          packageSlug,
          source: 'service-page',
        },
      }

      // Add customer email if available
      if (email) {
        sessionParams.customer_email = email
      } else if (user?.email) {
        sessionParams.customer_email = user.email
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const session = await stripe().checkout.sessions.create(sessionParams as any)
      return NextResponse.json({ url: session.url })
    }

    // Legacy product ID checkout (requires login)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!productId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    }

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('active', true)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const { data: existingPurchase } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .eq('status', 'completed')
      .single()

    if (existingPurchase) {
      return NextResponse.json({ error: 'Already purchased' }, { status: 400 })
    }

    const affiliateRef = request.cookies.get('affiliate_ref')?.value || ''

    const session = await stripe().checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: product.name,
              description: product.description || undefined,
            },
            unit_amount: product.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/content?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/?canceled=true`,
      customer_email: user.email,
      metadata: {
        userId: user.id,
        productId: product.id,
        affiliateCode: affiliateRef,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
