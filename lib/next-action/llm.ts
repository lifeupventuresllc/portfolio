import Anthropic from '@anthropic-ai/sdk'
import { anthropicConfigured } from '@/lib/food-estimate'

// Prompt 5's LLM half — the ONLY two jobs the model is ever given in this
// engine, never the decision itself (lib/next-action/score.ts's weighted
// rules are always what picks the winning action): (1) reword the winning
// instruction into warm, human copy, and (2) turn a free-text/voice message
// into the handful of structured signals the scorer already knows how to
// consume. Same Claude setup this repo already uses for nutrition
// estimation (lib/food-estimate.ts) — reused, not reinvented. Both
// functions degrade to a safe default on missing key or any failure; the
// engine must never be blocked by an LLM call.

const REWORD_TOOL = {
  name: 'reword_instruction',
  description: 'Return the reworded instruction.',
  input_schema: {
    type: 'object' as const,
    additionalProperties: false,
    properties: { text: { type: 'string' } },
    required: ['text'],
  },
}

export async function humanizeInstruction(instruction: string, context: { energy: string }): Promise<string> {
  if (!anthropicConfigured() || !instruction.trim()) return instruction
  try {
    const client = new Anthropic()
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system:
        "You rewrite ONE fitness-coaching instruction so it reads warm and human, like a supportive coach speaking directly to her — never robotic, never a status report. Keep the exact same real content: same food/workout/action, same numbers, nothing invented or dropped. You are only adjusting tone and phrasing. One or two short sentences, max. No emoji unless the original had one. If today's energy is low, keep the tone extra gentle and low-pressure.",
      tools: [REWORD_TOOL],
      tool_choice: { type: 'tool', name: 'reword_instruction' },
      messages: [{ role: 'user', content: `Energy today: ${context.energy}\nInstruction to reword: ${instruction}` }],
    })
    const block = msg.content.find((b) => b.type === 'tool_use')
    const text = block && block.type === 'tool_use' ? (block.input as { text?: string }).text : null
    return text && text.trim() ? text.trim() : instruction
  } catch {
    return instruction
  }
}

const SIGNAL_TOOL = {
  name: 'record_signal',
  description: "Record structured signals extracted from her message about right now.",
  input_schema: {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      energy: { type: 'string', enum: ['low', 'normal', 'high'] },
      minutes_available: { type: 'integer' },
      day_changed: { type: 'boolean' },
      eating_out: { type: 'boolean' },
    },
    required: [],
  },
}

export type ParsedSignal = { energy?: 'low' | 'normal' | 'high'; minutesAvailable?: number; dayChanged?: boolean; eatingOut?: boolean }

// Only ever extracts what she actually stated — every field is optional and
// omitted, never guessed, when she didn't address it. This keeps the
// scorer's "unknown means neutral, never assumed-low" rule intact even when
// natural language is the input path.
export async function parseNextActionSignal(message: string): Promise<ParsedSignal> {
  if (!anthropicConfigured() || !message.trim()) return {}
  try {
    const client = new Anthropic()
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system:
        "Read a short message she just sent about her day, right now. Extract ONLY what's clearly and explicitly stated, never infer or guess: her current energy/capacity level (low/normal/high) if she said something about how she's feeling or how much she can do, how many minutes she has available if she gave an actual number, whether she's saying her day or plans changed/got disrupted, and whether she's saying she's eating out / at a restaurant right now. Omit any field she didn't actually address — an empty result is correct and expected for a message that doesn't touch any of these.",
      tools: [SIGNAL_TOOL],
      tool_choice: { type: 'tool', name: 'record_signal' },
      messages: [{ role: 'user', content: message }],
    })
    const block = msg.content.find((b) => b.type === 'tool_use')
    if (!block || block.type !== 'tool_use') return {}
    const input = block.input as { energy?: string; minutes_available?: number; day_changed?: boolean; eating_out?: boolean }
    const result: ParsedSignal = {}
    if (input.energy === 'low' || input.energy === 'normal' || input.energy === 'high') result.energy = input.energy
    if (typeof input.minutes_available === 'number' && input.minutes_available > 0) result.minutesAvailable = Math.round(input.minutes_available)
    if (typeof input.day_changed === 'boolean') result.dayChanged = input.day_changed
    if (typeof input.eating_out === 'boolean') result.eatingOut = input.eating_out
    return result
  } catch {
    return {}
  }
}
