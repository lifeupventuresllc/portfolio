import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { enrollmentIdFor } from '@/lib/partners'
import { localDateISO, localMondayIndex, addDaysISO, getTimezone } from '@/lib/localdate'
import { cartLines, krogerState, sendToKroger } from '@/lib/kroger-cart'
import type { GrocerySection } from '@/lib/ingredients'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// "Send to my Kroger cart" — her week's grocery list into her own
// Kroger-family cart (lib/kroger-cart.ts). Signed-in women only.
//
// GET                         → { ready, lines, zip, store, sent }
// POST { zip?, force? }       → { status: 'sent' | 'login' | 'no_store' | 'error', … }

async function loadGrocery(enrollmentId: string): Promise<GrocerySection[]> {
  const svc = createServiceClient()
  const { data } = await svc.from('challenge_nutrition_plans').select('meals').eq('enrollment_id', enrollmentId).eq('week_number', 1).maybeSingle()
  const g = (data?.meals as { grocery?: GrocerySection[] } | null)?.grocery
  return Array.isArray(g) ? g : []
}

async function who() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return enrollmentIdFor(user)
}

export async function GET() {
  const enrollmentId = await who()
  if (!enrollmentId) return NextResponse.json({ ready: false }, { status: 401 })
  const [grocery, state] = await Promise.all([loadGrocery(enrollmentId), krogerState(enrollmentId)])
  const lines = cartLines(grocery)
  const tz = getTimezone()
  const week = addDaysISO(localDateISO(tz), -localMondayIndex(tz))
  // Only this week's cart counts as "already sent".
  const sent = state.sent && state.sent.week === week ? state.sent : null
  return NextResponse.json({ ready: !!process.env.MEALME_API_KEY && lines.length > 0, lines: lines.length, ...state, sent })
}

export async function POST(request: NextRequest) {
  const enrollmentId = await who()
  if (!enrollmentId) return NextResponse.json({ status: 'error', message: 'Sign in first.' }, { status: 401 })
  const body = await request.json().catch(() => ({})) as { zip?: string; force?: boolean; from?: string }
  const tz = getTimezone()
  const week = addDaysISO(localDateISO(tz), -localMondayIndex(tz))
  const from = typeof body.from === 'string' && body.from.startsWith('/plan/') ? body.from : '/plan/nutrition/log'
  const returnTo = `${request.nextUrl.origin}${from}${from.includes('?') ? '&' : '?'}kroger=back`
  const result = await sendToKroger({
    enrollmentId, grocery: await loadGrocery(enrollmentId), week,
    zip: body.zip ? String(body.zip).replace(/\D/g, '').slice(0, 5) : null,
    returnTo, force: !!body.force,
  })
  return NextResponse.json(result)
}
