import { createServiceClient } from '@/lib/supabase/server'

// Layer 1 Phase 2: calendar signal — sees a stacking or packed schedule
// before it becomes an obvious crisis. Deliberately a SEPARATE OAuth client
// from the Supabase login provider (Asa creates this one specifically for
// calendar access in Google Cloud Console) — never touches her auth
// session, purely an opt-in read.
const CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID || ''
const CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET || ''
const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'

export const calendarConfigured = !!(CLIENT_ID && CLIENT_SECRET)

export function calendarAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent', // forces a refresh_token every time, not just first consent
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

interface TokenResponse { access_token: string; refresh_token?: string; expires_in: number }

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenResponse> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      redirect_uri: redirectUri, grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`)
  return res.json()
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken, client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`Google token refresh failed: ${res.status}`)
  return res.json()
}

// Returns a valid access token for this enrollment, refreshing + persisting
// if the stored one has expired. Null if she's never connected a calendar.
async function getValidAccessToken(enrollmentId: string): Promise<string | null> {
  const svc = createServiceClient()
  const { data: conn } = await svc.from('calendar_connections').select('*').eq('enrollment_id', enrollmentId).maybeSingle()
  if (!conn) return null
  if (new Date(conn.expires_at as string) > new Date(Date.now() + 60_000)) return conn.access_token as string

  const refreshed = await refreshAccessToken(conn.refresh_token as string)
  const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
  await svc.from('calendar_connections').update({ access_token: refreshed.access_token, expires_at: expiresAt }).eq('enrollment_id', enrollmentId)
  return refreshed.access_token
}

// The actual signal: how many events land in the next 3 days. A stacking
// schedule (multiple appointments, not just a normal single event) is the
// early warning — not any one event, the DENSITY.
const PACKED_THRESHOLD = 4

export async function isPackedSchedule(enrollmentId: string): Promise<boolean> {
  const token = await getValidAccessToken(enrollmentId)
  if (!token) return false

  const now = new Date()
  const in3Days = new Date(now.getTime() + 3 * 86400000)
  const params = new URLSearchParams({
    timeMin: now.toISOString(), timeMax: in3Days.toISOString(),
    singleEvents: 'true', orderBy: 'startTime', maxResults: '50',
  })
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return false
  const data = await res.json()
  const count = Array.isArray(data.items) ? data.items.length : 0
  return count >= PACKED_THRESHOLD
}
