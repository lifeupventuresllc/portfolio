// Server-only Deepgram helpers. DEEPGRAM_API_KEY (the real, full-permission
// project key) never reaches the browser — every browser-facing use goes
// through a short-lived, minimally-scoped key minted here instead.

export function deepgramConfigured(): boolean {
  return !!process.env.DEEPGRAM_API_KEY && !!process.env.DEEPGRAM_PROJECT_ID
}

// Mints a temporary, scope-restricted key for a single browser session to
// connect directly to Deepgram's live WebSocket (wss://api.deepgram.com/v1/listen).
// Browsers can't send custom headers on a WebSocket handshake, so the master key
// can never be used directly from client code — this is the standard Deepgram
// pattern for browser-originated streaming: mint a real-but-short-lived,
// usage-only credential server-side, hand only that to the client. `usage:write`
// is the minimum scope that can transcribe — it cannot read/manage the project,
// billing, or other keys, so a leaked temp key is low-stakes and self-expires.
export async function mintDeepgramTempKey(ttlSeconds = 90): Promise<{ key: string; expiresInSeconds: number }> {
  const projectId = process.env.DEEPGRAM_PROJECT_ID
  const masterKey = process.env.DEEPGRAM_API_KEY
  if (!projectId || !masterKey) throw new Error('Deepgram not configured (DEEPGRAM_API_KEY / DEEPGRAM_PROJECT_ID missing)')

  const res = await fetch(`https://api.deepgram.com/v1/projects/${projectId}/keys`, {
    method: 'POST',
    headers: { Authorization: `Token ${masterKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      comment: 'browser live-transcription session (auto-expires)',
      scopes: ['usage:write'],
      time_to_live_in_seconds: ttlSeconds,
    }),
  })
  if (!res.ok) throw new Error(`Deepgram key mint failed: ${res.status} ${await res.text().catch(() => '')}`)
  const data = await res.json()
  return { key: data.key as string, expiresInSeconds: ttlSeconds }
}

export type DeepgramWord = { word: string; start: number; end: number; confidence: number }
export type DeepgramTranscribeResult = {
  transcript: string
  confidence: number
  words: DeepgramWord[]
  durationSeconds: number
}

// Prerecorded (file-upload) transcription — the isolated test path. Runs
// server-side with the real master key (never exposed), NO smart_format /
// punctuate, so what comes back is Deepgram's closest-to-raw read of the
// audio, word-level confidence included. This never touches chat/LLM code —
// see app/api/voice/transcribe-file/route.ts and app/admin/voice-test/page.tsx.
export async function transcribeAudioFile(audio: ArrayBuffer, contentType: string): Promise<DeepgramTranscribeResult> {
  const masterKey = process.env.DEEPGRAM_API_KEY
  if (!masterKey) throw new Error('Deepgram not configured (DEEPGRAM_API_KEY missing)')

  const params = new URLSearchParams({ model: 'nova-3', punctuate: 'false', smart_format: 'false' })
  const res = await fetch(`https://api.deepgram.com/v1/listen?${params.toString()}`, {
    method: 'POST',
    headers: { Authorization: `Token ${masterKey}`, 'Content-Type': contentType },
    body: audio,
  })
  if (!res.ok) throw new Error(`Deepgram transcription failed: ${res.status} ${await res.text().catch(() => '')}`)
  const data = await res.json()
  const alt = data?.results?.channels?.[0]?.alternatives?.[0]
  return {
    transcript: alt?.transcript || '',
    confidence: typeof alt?.confidence === 'number' ? alt.confidence : 0,
    words: (alt?.words || []) as DeepgramWord[],
    durationSeconds: Number(data?.metadata?.duration) || 0,
  }
}
