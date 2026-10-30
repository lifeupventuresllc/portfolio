import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { answerOffer, ownOffer } from '@/lib/meal-offer-server'
import { isStale } from '@/lib/meal-offer'

// Her Yes / No on a meal-time offer (Prompt 3, 2026-10-30). Called by the
// offer page (/plan/offer/[id]) and by the notification's own Yes / No
// buttons (public/sw.js, Android + desktop). Saves every answer
// (meal_offers + meal_memory). Nothing is ordered or charged here — a Yes
// logs the meal and hands back the delivery link (lib/order-link yesAction is
// the one place that changes once full ordering is connected).
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  let body: { answer?: string; via?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Bad request.' }, { status: 400 }) }
  if (body.answer !== 'yes' && body.answer !== 'no') return NextResponse.json({ error: 'Bad answer.' }, { status: 400 })

  const svc = createServiceClient()
  const offer = await ownOffer(svc, params.id, user)
  if (!offer) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  // Never answered and hours old → gone (never logs an old meal by accident).
  if (!offer.answer && isStale(offer.shown_at)) return NextResponse.json({ error: 'This pick is gone.' }, { status: 410 })
  const result = await answerOffer(svc, offer, body.answer, body.via === 'notification' ? 'notification' : 'page')
  return NextResponse.json(result)
}

