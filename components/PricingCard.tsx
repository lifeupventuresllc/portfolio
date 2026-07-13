'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { trackEvent } from '@/lib/track'

type PricingCardProps = {
  productId: string
  name: string
  description: string
  price: number // in cents
  purchased?: boolean
  category?: string
  features?: string[]
  featured?: boolean
  guarantee?: string
}

export default function PricingCard({
  productId,
  name,
  description,
  price,
  purchased,
  category,
  features,
  featured,
  guarantee,
}: PricingCardProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  async function handlePurchase() {
    setLoading(true)
    setError(null)
    trackEvent('checkout_started', { productId })

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        window.location.href = '/login?redirect=/content'
        return
      }

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      window.location.href = data.url
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: price % 100 === 0 ? 0 : 2,
  }).format(price / 100)

  const billingLabel =
    category === 'content-editing' ? '/mo' :
    category === 'audio-engineering' ? '' :
    'one-time'

  const defaultFeatures = [
    'Custom workout plans',
    'Done-for-you weekly meals',
    'Weekly coach check-ins',
    'Lifetime access',
  ]

  const displayFeatures = features || defaultFeatures

  return (
    <div className={`w-full max-w-sm rounded-2xl p-8 text-center flex flex-col relative transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(201,168,76,0.15)] ${
      featured
        ? 'bg-gradient-to-b from-gold/10 to-charcoal border-2 border-gold'
        : 'bg-charcoal border border-smoke hover:border-gold/40'
    }`}>
      {featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-obsidian text-xs font-bold uppercase tracking-wider px-4 py-1 rounded-full">
          Most Popular
        </div>
      )}

      <h3 className="text-2xl font-bold text-white mb-1">{name}</h3>
      <p className="text-ivory/70 text-sm mb-6">{description}</p>

      <div className="mb-6">
        <span className="text-5xl font-bold text-gold">{formattedPrice}</span>
        {billingLabel && <span className="text-ivory/60 ml-2">{billingLabel}</span>}
      </div>

      <ul className="text-left space-y-3 mb-6 flex-1">
        {displayFeatures.map((feature, i) => (
          <li key={i} className="flex items-start text-sm">
            <span className="w-2 h-2 bg-gold rounded-full mt-1.5 mr-3 flex-shrink-0" />
            <span className="text-ivory">{feature}</span>
          </li>
        ))}
      </ul>

      {guarantee && (
        <div className="border-t border-smoke pt-4 mb-4">
          <p className="text-gold text-xs font-semibold uppercase tracking-wider mb-2">Guarantee</p>
          <p className="text-ivory/70 text-xs leading-relaxed">{guarantee}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg text-sm">
          {error}
        </div>
      )}

      {purchased ? (
        <a
          href="/content"
          className="block w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
        >
          Access Your Purchase
        </a>
      ) : (
        <button
          onClick={handlePurchase}
          disabled={loading}
          className={`w-full py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            featured
              ? 'bg-gold text-obsidian hover:bg-gold/90 hover:shadow-lg hover:shadow-gold/20'
              : 'border-2 border-gold text-gold hover:bg-gold hover:text-obsidian'
          }`}
        >
          {loading ? 'Processing...' : 'Get Started'}
        </button>
      )}
    </div>
  )
}
