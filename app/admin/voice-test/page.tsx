import { requireAdmin } from '@/lib/admin'
import VoiceTestClient from '@/components/VoiceTestClient'

export const dynamic = 'force-dynamic'

// Isolated test path for the voice pipeline (Deepgram Nova-3) — raw
// transcript + word-level confidence, nothing downstream of it. No chat, no
// LLM, no plan logic touched here. Two ways to test:
//   1. Live mic, same streaming path Coach Asa's chat actually uses.
//   2. Upload a sample audio file — hits the prerecorded REST endpoint
//      directly, useful for feeding the same clip repeatedly while tuning.
export default async function VoiceTestPage() {
  await requireAdmin('/admin/voice-test')
  return <VoiceTestClient />
}
