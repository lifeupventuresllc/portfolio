import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ownOffer, latestForKey } from '@/lib/meal-offer-server'
import { afterNo, isStale } from '@/lib/meal-offer'
import MealOffer, { type OfferView } from '@/components/MealOffer'

export const dynamic = 'force-dynamic'

// The meal-time offer, full screen (Prompt 3, 2026-10-30). iPhone web push
// has no action buttons, so tapping the notification lands here: the meal's
// photo, name, price, when it'd arrive, and two huge buttons — Yes / No.
// Android's Yes / No buttons on the notification do the same thing without
// opening this page (public/sw.js).
export default async function OfferPage({ params, searchParams }: { params: { id: string }; searchParams: { a?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=/plan/offer/${params.id}`)

  const svc = createServiceClient()
  const offer = await ownOffer(svc, params.id, user)
  if (!offer) return <Gone />
  // She may have already said No once — show the meal she's on now.
  const latest = (await latestForKey(svc, offer.enrollment_id, offer.offer_key)) || offer

  let view: OfferView
  if (!latest.answer && isStale(latest.shown_at)) return <Gone />
  if (latest.answer === 'yes') view = { state: 'yes', id: latest.id, card: latest.card, meal: latest.meal }
  else if (latest.answer === 'no') {
    const step = afterNo(latest.attempt, latest.meal, !!latest.backup)
    // A No from the notification that didn't get to show her the other meal
    // yet → the page asks for it (same answer, saved once).
    view = step.next === 'stop' ? { state: 'stop', line: step.line } : { state: 'ask', id: latest.id, card: latest.card, meal: latest.meal, attempt: latest.attempt, resumeNo: true }
  } else view = { state: 'ask', id: latest.id, card: latest.card, meal: latest.meal, attempt: latest.attempt, resumeNo: searchParams.a === 'no' }

  return <MealOffer view={view} />
}

function Gone() {
  return (
    <div className="min-h-[100dvh] px-6 pt-20" style={{ background: '#021F16', color: '#EDE7DA' }}>
      <div className="max-w-sm mx-auto text-center flex flex-col gap-4">
        <h1 style={{ margin: 0, fontFamily: "var(--font-barlow), 'Barlow Condensed', sans-serif", fontStyle: 'italic', fontWeight: 800, fontSize: 40, lineHeight: 0.9, textTransform: 'uppercase' }}>This pick is gone.</h1>
        <p style={{ color: 'rgba(237,231,218,.72)' }}>Your meals for right now are on the Nutrition tab.</p>
        <Link href="/plan/nutrition" className="rounded-full flex items-center justify-center" style={{ height: 56, background: '#E5A93C', color: '#021F16', fontFamily: "var(--font-jbmono), 'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: '.12em' }}>SEE MY PICKS</Link>
      </div>
    </div>
  )
}
