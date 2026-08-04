import { NextResponse } from 'next/server'
import { getMemberEnrollment } from '@/lib/member'
import { getLeaderboard } from '@/lib/leaderboard'

// Community leaderboard, function-first (no design pass yet). Ranked by
// current streak — see lib/leaderboard.ts for the shared computation used
// here and on the server-rendered community page.
export async function GET() {
  const { user, enrollment } = await getMemberEnrollment()
  if (!user || !enrollment) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const result = await getLeaderboard(enrollment.id as string)
  return NextResponse.json(result)
}
