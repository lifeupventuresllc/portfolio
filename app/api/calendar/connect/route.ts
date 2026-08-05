import { NextResponse } from 'next/server'
import { getMemberEnrollment } from '@/lib/member'
import { calendarAuthUrl, calendarConfigured } from '@/lib/google-calendar'

// Kicks off the SEPARATE calendar OAuth flow — not the login provider.
export async function GET(request: Request) {
  const { user, enrollment } = await getMemberEnrollment()
  if (!user || !enrollment) return NextResponse.redirect(new URL('/login', request.url))
  if (!calendarConfigured) return NextResponse.redirect(new URL('/plan?error=calendar_not_configured', request.url))

  const redirectUri = new URL('/api/calendar/callback', request.url).toString()
  const url = calendarAuthUrl(redirectUri, enrollment.id as string)
  return NextResponse.redirect(url)
}
