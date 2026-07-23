import { stripe } from '@/lib/stripe'

// Persisted recurring Prices for the 3 fitness subscription tiers, looked up by a
// fixed `lookup_key` and created once if missing. Keeps the "no manual Stripe
// dashboard setup" convention the rest of checkout.ts relies on (dynamic price_data)
// while still giving stable Price IDs — needed so the tier-downgrade cron can swap
// a subscription's item to a different price later (subscription.update needs a
// real price/price_data reference per item, and a stable lookup_key means we never
// accidentally create duplicate Price objects across repeated deploys/requests).
export async function getOrCreatePrice(lookupKey: string, unitAmount: number, nickname: string): Promise<string> {
  const existing = await stripe().prices.list({ lookup_keys: [lookupKey], limit: 1 })
  if (existing.data[0]) return existing.data[0].id

  const price = await stripe().prices.create({
    unit_amount: unitAmount,
    currency: 'usd',
    recurring: { interval: 'month' },
    lookup_key: lookupKey,
    nickname,
    product_data: { name: nickname },
  })
  return price.id
}

export const FITNESS_PRICE_KEYS = {
  app: 'fitness-app-10',
  challenge: 'fitness-challenge-20',
  inner_circle: 'fitness-inner-circle-50',
} as const

export const FITNESS_PRICE_AMOUNTS = {
  app: 1000,
  challenge: 2000,
  inner_circle: 5000,
} as const

export const FITNESS_PRICE_NICKNAMES = {
  app: 'Life-Up Fitness — App Access',
  challenge: 'Life-Up Fitness — 6-Week Challenge',
  inner_circle: 'Life-Up Fitness — Inner Circle',
} as const

export type FitnessTier = keyof typeof FITNESS_PRICE_KEYS
