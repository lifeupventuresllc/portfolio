import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens } from '@/lib/google-calendar'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const enrollmentId = searchParams.get('state') // enrollment.id, passed through as OAuth state
  if (!code || !enrollmentId) return NextResponse.redirect(`${origin}/plan?error=calendar_denied`)

  try {
    const redirectUri = new URL('/api/calendar/callback', request.url).toString()
    const tokens = await exchangeCodeForTokens(code, redirectUri)
    if (!tokens.refresh_token) {
      // Google only sends this on first consent (or with prompt=consent, which we always
      // pass) — if it's still missing, something's off with the OAuth client config.
      return NextResponse.redirect(`${origin}/plan?error=calendar_no_refresh_token`)
    }
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    const svc = createServiceClient()
    await svc.from('calendar_connections').upsert(
      { enrollment_id: enrollmentId, access_token: tokens.access_token, refresh_token: tokens.refresh_token, expires_at: expiresAt },
      { onConflict: 'enrollment_id' }
    )
    return NextResponse.redirect(`${origin}/plan?calendar=connected`)
  } catch (e) {
    console.error('Calendar OAuth callback failed:', e)
    return NextResponse.redirect(`${origin}/plan?error=calendar_failed`)
  }
}
