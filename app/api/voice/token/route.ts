import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deepgramConfigured, mintDeepgramTempKey } from '@/lib/voice/deepgram-server'

// Mints a short-lived Deepgram key for the browser to open a direct live
// WebSocket connection. Gated behind ANY authenticated session (including
// anonymous Supabase sessions — same no-signup-wall pattern as the rest of
// the app) purely to rate-limit who can mint a real credential, even a
// scoped/90-second one; not a feature gate.
export async function POST() {
  if (!deepgramConfigured()) {
    return NextResponse.json({ error: 'Voice transcription is not configured yet (missing DEEPGRAM_API_KEY / DEEPGRAM_PROJECT_ID).' }, { status: 503 })
  }
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  try {
    const { key, expiresInSeconds } = await mintDeepgramTempKey(90)
    return NextResponse.json({ key, expiresInSeconds, model: 'nova-3' })
  } catch (err) {
    console.error('Deepgram token mint error:', err)
    return NextResponse.json({ error: 'Could not start voice transcription.' }, { status: 502 })
  }
}
