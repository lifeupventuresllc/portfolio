import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// "Order on DoorDash / Uber Eats" hop (2026-10-28, Asa: the pick sent her
// into the DoorDash app's home screen and she had to type the restaurant and
// her address). A tap that goes through our own server first makes the
// iPhone open the delivery site in the browser — where the search link
// lands on the restaurant — instead of the app, which ignores the search.
// Only these two sites; the search words are the only input.
//
// GET /api/go?app=doordash|ubereats&q=<restaurant>
export function GET(request: NextRequest) {
  const app = request.nextUrl.searchParams.get('app')
  const q = (request.nextUrl.searchParams.get('q') || '').slice(0, 80)
  if (!q) return NextResponse.redirect(new URL('/plan/nutrition', request.url))
  const url = app === 'ubereats'
    ? `https://www.ubereats.com/search?q=${encodeURIComponent(q)}`
    : `https://www.doordash.com/search/store/${encodeURIComponent(q)}/`
  return NextResponse.redirect(url, 302)
}
