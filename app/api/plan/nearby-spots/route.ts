import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { openChainsNear } from '@/lib/fos/nearby-food'
import { verifiedChains } from '@/lib/chain-menu'

export const dynamic = 'force-dynamic'

// The new intake's location screen (2026-10-25): right after she turns on
// location, the real spots open near her drop onto the map — the same
// chains, the same 1 mile (then 3 mile) reach, and the same cached Google
// search the Nutrition tab uses, so what she sees here is where her picks
// will come from. Reads her own position from the ping she just sent.
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ spots: [] })
  const svc = createServiceClient()
  const { data: enrollment } = await svc.from('challenge_enrollments').select('last_lat, last_lng, last_location_at')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  const lat = enrollment?.last_lat as number | null, lng = enrollment?.last_lng as number | null
  if (lat == null || lng == null) return NextResponse.json({ spots: [] })

  const near = (await openChainsNear(lat, lng, verifiedChains())) || new Map<string, number>()
  const spots = Array.from(near).sort((a, b) => a[1] - b[1]).slice(0, 4).map(([name, miles]) => ({ name, miles: Math.round(miles * 10) / 10 }))
  return NextResponse.json({ spots })
}
