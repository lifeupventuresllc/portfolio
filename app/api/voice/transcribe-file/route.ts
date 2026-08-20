import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deepgramConfigured, transcribeAudioFile } from '@/lib/voice/deepgram-server'

// The isolated test path — feed it a sample audio file, get Deepgram's raw
// transcript + word-level confidence straight back. No chat, no LLM, no
// downstream logic at all; see app/admin/voice-test/page.tsx for the UI.
export async function POST(request: NextRequest) {
  if (!deepgramConfigured()) {
    return NextResponse.json({ error: 'Voice transcription is not configured yet (missing DEEPGRAM_API_KEY / DEEPGRAM_PROJECT_ID).' }, { status: 503 })
  }
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const form = await request.formData().catch(() => null)
  const file = form?.get('audio')
  if (!file || !(file instanceof Blob)) return NextResponse.json({ error: 'No audio file provided.' }, { status: 400 })
  if (file.size > 25 * 1024 * 1024) return NextResponse.json({ error: 'File too large (25MB max for this test path).' }, { status: 413 })

  try {
    const buf = await file.arrayBuffer()
    const result = await transcribeAudioFile(buf, file.type || 'audio/wav')
    return NextResponse.json(result)
  } catch (err) {
    console.error('Deepgram file transcription error:', err)
    return NextResponse.json({ error: 'Transcription failed.' }, { status: 502 })
  }
}
