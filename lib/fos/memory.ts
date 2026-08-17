import Anthropic from '@anthropic-ai/sdk'
import { anthropicConfigured } from '@/lib/food-estimate'
import type { LifeSignal, RecoveryPlan } from './recovery'
import type { FosProfile, FosEvent } from './types'

// The "AI reads her and remembers/speaks" layer — parallel to parse.ts's "AI reads
// her and classifies." Two calls: extractProfileFacts() pulls durable life facts into
// fos_profile (a table that's existed since migration 017 but never had a writer),
// generateReply() writes Coach Asa's actual reply from scratch each time using that
// profile + recent history, instead of restyling one of recovery.ts's fixed sentences.
// Both degrade to null on any failure/misconfiguration — callers fall back to
// recovery.ts's hand-written copy, unchanged from before this file existed.

export type ExtractedFacts = {
  goal_summary?: string
  work_schedule_note?: string
  energy_note?: string
  foods_loved?: string[]
  foods_avoided?: string[]
  motivators?: string[]
  discouragers?: string[]
  barriers?: string[]
  // General durable personal-life facts that don't fit the fitness-specific buckets
  // above — family, home life, anything a real coach would just remember about her.
  personal_notes?: string[]
}

function describeProfile(profile: FosProfile | null): string {
  if (!profile) return 'Nothing known yet.'
  const lines: string[] = []
  if (profile.goalSummary) lines.push(`Goal: ${profile.goalSummary}`)
  if (profile.foodsLoved.length) lines.push(`Loves: ${profile.foodsLoved.join(', ')}`)
  if (profile.foodsAvoided.length) lines.push(`Avoids: ${profile.foodsAvoided.join(', ')}`)
  if (profile.motivators.length) lines.push(`Motivated by: ${profile.motivators.join(', ')}`)
  if (profile.discouragers.length) lines.push(`Discouraged by: ${profile.discouragers.join(', ')}`)
  if (profile.barriers.length) lines.push(`Known barriers: ${profile.barriers.join(', ')}`)
  const workNote = profile.preferences?.work_schedule_note
  if (typeof workNote === 'string' && workNote) lines.push(`Work: ${workNote}`)
  const energyNote = profile.preferences?.energy_note
  if (typeof energyNote === 'string' && energyNote) lines.push(`Energy: ${energyNote}`)
  const personalNotes = profile.preferences?.personal_notes
  if (Array.isArray(personalNotes) && personalNotes.length) lines.push(`Personal: ${personalNotes.join('; ')}`)
  return lines.length ? lines.join('\n') : 'Nothing known yet.'
}

function describeEvents(events: FosEvent[]): string {
  if (!events.length) return 'No recent history.'
  return events.slice(0, 20).map((e) => `- ${e.occurredOn}: ${e.kind}${e.summary ? ` — "${e.summary}"` : ''}`).join('\n')
}

const EXTRACT_TOOL = {
  name: 'extract_profile_facts',
  description: 'Pull durable, generalizable facts about her life worth remembering permanently, if any.',
  input_schema: {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      goal_summary: { type: 'string', description: 'Her stated overall goal, if she just restated/clarified it' },
      work_schedule_note: { type: 'string', description: 'A durable note about her job/schedule, e.g. "works night shifts at a hospital"' },
      energy_note: { type: 'string', description: 'A durable note about when she tends to have more/less energy' },
      foods_loved: { type: 'array', items: { type: 'string' } },
      foods_avoided: { type: 'array', items: { type: 'string' } },
      motivators: { type: 'array', items: { type: 'string' }, description: 'What keeps her going' },
      discouragers: { type: 'array', items: { type: 'string' }, description: 'What tends to knock her off track emotionally' },
      barriers: { type: 'array', items: { type: 'string' }, description: 'Recurring practical obstacles, e.g. "no gym access on weekends"' },
      personal_notes: { type: 'array', items: { type: 'string' }, description: 'Durable family/home/personal-life facts that don\'t fit the fields above, e.g. "has two kids, ages 4 and 7" or "husband travels for work most weeks"' },
    },
    required: [],
  },
}

function extractSystem(profile: FosProfile | null): string {
  return `You read one message a woman sends her fitness coach and pull out only the durable facts about her real life worth remembering permanently — the kind a good human coach would silently jot in her file and recall next month, not just today's mood.

Extract a fact ONLY if it is:
- A concrete, generalizable fact about her life, schedule, work, family, home life, food preferences, motivations, or recurring obstacles — stated as fact, not as a one-off feeling. Family/home details that don't obviously fit the fitness-specific fields (foods, motivators, barriers, etc.) still matter — use personal_notes for those, e.g. kids' ages, a partner's travel schedule, a move, anything that helps you actually know her as a person.
- Something that would still be true and useful next week, not just how she feels right now.

Do NOT extract:
- Transient state — she's tired, stressed, sore, short on time, ate out TODAY. That's today's situation, already handled elsewhere. Do not extract "she's tired" just because she said "I'm exhausted today."
- Anything you're inferring or guessing rather than something she actually said.
- Anything already covered by her existing known profile below, unless she's adding meaningfully new detail.

Her existing known profile (do not repeat these — only add what's new):
${describeProfile(profile)}

If nothing in her message rises to a durable, new fact, call the tool with no fields set — that's the common case; most messages add nothing. Never fabricate a fact she didn't actually state.`
}

export async function extractProfileFacts(text: string, profile: FosProfile | null): Promise<ExtractedFacts | null> {
  if (!anthropicConfigured() || !text.trim()) return null
  try {
    const client = new Anthropic()
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: extractSystem(profile),
      tools: [EXTRACT_TOOL],
      tool_choice: { type: 'tool', name: 'extract_profile_facts' },
      messages: [{ role: 'user', content: text }],
    })
    const block = msg.content.find((b) => b.type === 'tool_use')
    if (!block || block.type !== 'tool_use') return null
    const input = block.input as ExtractedFacts
    const hasAny = Object.values(input).some((v) => (Array.isArray(v) ? v.length > 0 : !!v))
    return hasAny ? input : null
  } catch { return null }
}

const GENERATE_SYSTEM = `You are Coach Asa. She just told you something about her day. A decision has already been made about her plan — the concrete facts in DECISION are final and correct (exact minutes, what's swapped, any reason given) — but nothing about HOW you tell her is fixed. Write it fresh, the way you actually would.

You must convey every concrete fact in DECISION accurately — don't drop or invent numbers or changes. Everything else is yours: how you open, what you notice about her, how you phrase it. Two people asking the same thing should never get identical replies.

Use what you know about her (PROFILE) and her recent history (RECENT) only when it genuinely fits — weave it in like something a person who knows her would naturally say, never like a log entry ("I see you've mentioned X three times"). If nothing fits, don't force it.

Her name is given below (NAME). Use it the way someone who actually knows her would — naturally, sometimes, where it lands well (an opener, a moment of real warmth) — never stapled onto every single reply like a mail-merge field.

If GOAL CONTEXT is present below, it's a quiet observation about her longer-term pace — not a score, not something to report. Only bring it up if it genuinely fits this specific reply, the way a person who's been paying attention might gently check in, never as a status update.

Never say you're an AI, that you "track," "log," or "analyze" her. You remember her. Never guilt — no "you failed," no "you missed." She approves, modifies, or rejects what you recommend — you don't control her. Warm, direct, brief — a couple sentences, not a lecture.

Reply with ONLY the message to send her. No preamble, no quotes, no explanation.`

export async function generateReply(input: {
  herMessage: string
  decision: string
  profile: FosProfile | null
  events: FosEvent[]
  goalContext?: string | null
  name?: string | null
}): Promise<string | null> {
  if (!anthropicConfigured()) return null
  try {
    const client = new Anthropic()
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: GENERATE_SYSTEM,
      messages: [{
        role: 'user',
        content: `${input.name ? `NAME: ${input.name}\n\n` : ''}SHE SAID: ${input.herMessage}\n\nDECISION: ${input.decision}\n\nPROFILE:\n${describeProfile(input.profile)}\n\nRECENT:\n${describeEvents(input.events)}${input.goalContext ? `\n\nGOAL CONTEXT:\n${input.goalContext}` : ''}`,
      }],
    })
    const block = msg.content.find((b) => b.type === 'text')
    const text = block && block.type === 'text' ? block.text.trim() : ''
    if (!text || text.length > 700) return null
    return text
  } catch { return null }
}

// Plain-language rendering of what recover() decided — NOT its hand-written .message.
// This is what generateReply() is grounded in, so the model never sees (and can't
// just restyle) one of recovery.ts's fixed sentences.
export function describeDecision(signal: LifeSignal | null, plan: RecoveryPlan): string {
  const parts: string[] = []
  if (plan.workoutChange) {
    const wc = plan.workoutChange
    const bits: string[] = []
    if (wc.toMinutes != null) bits.push(`shorten today's workout to ${wc.toMinutes} minutes`)
    if (wc.swapTo) bits.push(`swap to ${wc.swapTo}`)
    if (wc.trackOverride) bits.push(`switch to a ${wc.trackOverride} workout`)
    if (bits.length) parts.push(`Workout: ${bits.join(', ')}${wc.reason ? ` (reason: ${wc.reason})` : ''}.`)
  }
  if (plan.nutritionChange) {
    const nc = plan.nutritionChange
    const bits: string[] = []
    if (nc.calorieDelta) bits.push(`adjust calories by ${nc.calorieDelta}`)
    if (nc.dinnerSuggestion) bits.push(nc.dinnerSuggestion)
    if (bits.length) parts.push(`Nutrition: ${bits.join(', ')}${nc.reason ? ` (reason: ${nc.reason})` : ''}.`)
  }
  if (!parts.length) parts.push(`Acknowledge what she said${signal ? ` (${signal.kind.replace('_', ' ')})` : ''} — no concrete plan change this time.`)
  return parts.join(' ')
}
