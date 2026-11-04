import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { GUEST_COOKIE, readGuestToken, adoptGuest } from '@/lib/adopt-guest'

// After a password log-in: if she started as a guest and her email already
// had an account, move the guest's answers into it (lib/adopt-guest.ts).
// No-op when there's no guest to move.
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const guestId = readGuestToken(request.cookies.get(GUEST_COOKIE)?.value)
  if (!user || user.is_anonymous || !guestId) return NextResponse.json({ result: 'nothing' })
  const result = await adoptGuest(createServiceClient(), guestId, user).catch(() => 'nothing' as const)
  const res = NextResponse.json({ result })
  res.cookies.set({ name: GUEST_COOKIE, value: '', maxAge: 0, path: '/' })
  return res
}
