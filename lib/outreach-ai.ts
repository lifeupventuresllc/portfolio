import Anthropic from '@anthropic-ai/sdk'
import { anthropicConfigured } from '@/lib/food-estimate'

// Drafts cold-outreach DMs (opener / follow-up / reply) for Life-Up Ventures.
// Same fixed voice as lib/content-ai.ts: male trainer, tabloid-adjacent curiosity
// tone, never a pitch in the opener. Sending is always a manual tap — Instagram/
// TikTok don't allow automated sending of the first message to a stranger — this
// only drafts the text.

export type OutreachMessageType = 'opener' | 'fu2' | 'matcher'

export type OutreachProspect = {
  name: string
  platform: string
  prospect_type: string
  notes: string | null
}

export type OutreachHistoryItem = {
  message_type: string
  message_content: string | null
}

const DRAFT_TOOL = {
  name: 'draft_message',
  description: 'Write the DM.',
  input_schema: {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      message: { type: 'string', description: 'The DM text, under 3 sentences, no stacked emojis.' },
    },
    required: ['message'],
  },
}

const VOICE_SYSTEM_PROMPT =
  'You are a male fitness trainer (Asa, Life-Up Ventures) drafting cold outreach DMs. ' +
  'Keep every message under 3 sentences. No stacked emojis. Sound like a real person messaging, not a script.'

const TYPE_INSTRUCTIONS: Record<OutreachMessageType, string> = {
  opener:
    'Write the OPENER — the first-touch message. Personalize it by referencing something specific from their ' +
    'profile/notes. No pitch, low pressure, tabloid-adjacent curiosity tone.',
  fu2:
    "Write FU2 — a permission-ask follow-up because they haven't replied yet. Low-pressure, gives them an easy out, " +
    'references the opener lightly without repeating it.',
  matcher:
    'Write the MATCHER — the value-delivery message now that they have engaged/replied. Connect them to a ' +
    '"who transforms your body" outcome, not "I will transform you." Respond directly to what they said.',
}

function historyBlock(history: OutreachHistoryItem[]): string {
  if (!history.length) return ''
  const lines = history.map((h) => `[${h.message_type}] ${h.message_content || ''}`).join('\n')
  return `\n\nConversation so far:\n${lines}`
}

export async function draftMessage(
  prospect: OutreachProspect,
  messageType: OutreachMessageType,
  history: OutreachHistoryItem[] = []
): Promise<string | null> {
  if (!anthropicConfigured()) return null
  try {
    const client = new Anthropic()
    const profile = `Name: ${prospect.name}\nPlatform: ${prospect.platform}\nType: ${prospect.prospect_type}\nNotes/bio: ${prospect.notes || 'none'}`
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: `${VOICE_SYSTEM_PROMPT}\n\n${TYPE_INSTRUCTIONS[messageType]}`,
      tools: [DRAFT_TOOL],
      tool_choice: { type: 'tool', name: 'draft_message' },
      messages: [{ role: 'user', content: `${profile}${historyBlock(history)}` }],
    })
    const block = msg.content.find((b) => b.type === 'tool_use')
    if (!block || block.type !== 'tool_use') return null
    return String((block.input as Record<string, unknown>).message || '').trim() || null
  } catch { return null }
}
