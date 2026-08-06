import Anthropic from '@anthropic-ai/sdk'
import type { LifeSignal } from './recovery'
import { anthropicConfigured } from '@/lib/food-estimate'
import type { Injury } from '@/lib/workout-exercises'

const INJURY_BODY_PARTS = ['knee', 'lower_back', 'shoulder', 'wrist', 'elbow', 'hip', 'ankle'] as const

const CLASSIFY_TOOL = {
  name: 'classify_life_signal',
  description: 'Classify what she just said into the life-signal category the recovery engine understands.',
  input_schema: {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      kind: {
        type: 'string',
        enum: ['time_crunch', 'exhausted', 'poor_sleep', 'schedule_change', 'eat_out', 'missed', 'craving', 'stressed', 'injury', 'none'],
      },
      minutes: { type: 'integer', description: 'time_crunch only: minutes she said she has available' },
      days: { type: 'integer', description: 'missed only: how many days she thinks she missed' },
      free_at: { type: 'string', description: 'schedule_change only: a time she mentioned being free, if any' },
      body_part: { type: 'string', enum: [...INJURY_BODY_PARTS], description: 'injury only: which body part, using lower_back for any back pain' },
    },
    required: ['kind'],
  },
}

const CLASSIFY_SYSTEM = `You read a message a woman sends her fitness coach about her day and classify it into exactly one category:
- injury: she mentions a NEW pain, strain, or injury (hurt/pulled/tweaked/sprained/rolled/twisted something) — not routine post-workout soreness. If she mentions an injury AND something else (like time), still classify as injury — safety takes priority.
- time_crunch: she's short on time today ("only have 20 min", "in a hurry")
- exhausted: low energy, drained, burnt out
- poor_sleep: didn't sleep well / no sleep
- schedule_change: her day shifted — kids, work, appointments, errands
- eat_out: eating at a restaurant / ordering out / a meal out with others
- missed: she's acknowledging missed/skipped workouts, falling off track
- craving: a food craving or urge to stress/emotional eat
- stressed: stressed, overwhelmed, anxious, too much going on
- none: nothing above applies — small talk, a question, describing food already eaten, or anything unclear

Pick the single best match. If more than one could apply (other than injury, which always wins), pick whichever is most central to what she needs right now. Use "none" liberally — only classify a real signal when it's clearly there.`

// A confident "none" from Claude (nothing situational here) and "the call never
// happened" (unconfigured / failed) are different outcomes — the first should NOT
// fall through to the regex matcher (which can misfire on unrelated words, e.g.
// "my daughter's stressed about her exam" hitting the stressed pattern), only the
// second should. `ok: false` means the caller should try parseSignal() instead.
type AIClassifyResult = { ok: true; signal: LifeSignal | null } | { ok: false }

// Claude-based intent classifier — replaces the regex matcher below as the primary
// path now that the key is live. Falls back to the rule-based parser (still
// zero-AI, always available) only when unconfigured or the call fails, so the
// operator never goes silent. Output shape is identical either way: recover()'s
// hand-tuned, identity-affirming copy is untouched — only how we read her is upgraded.
export async function parseSignalAI(text: string): Promise<AIClassifyResult> {
  if (!anthropicConfigured() || !text.trim()) return { ok: false }
  try {
    const client = new Anthropic()
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: CLASSIFY_SYSTEM,
      tools: [CLASSIFY_TOOL],
      tool_choice: { type: 'tool', name: 'classify_life_signal' },
      messages: [{ role: 'user', content: text }],
    })
    const block = msg.content.find((b) => b.type === 'tool_use')
    if (!block || block.type !== 'tool_use') return { ok: false }
    const input = block.input as { kind: string; minutes?: number; days?: number; free_at?: string; body_part?: string }
    switch (input.kind) {
      case 'time_crunch': return { ok: true, signal: { kind: 'time_crunch', minutes: input.minutes ?? 20 } }
      case 'exhausted': return { ok: true, signal: { kind: 'exhausted' } }
      case 'poor_sleep': return { ok: true, signal: { kind: 'poor_sleep' } }
      case 'schedule_change': return { ok: true, signal: { kind: 'schedule_change', freeAt: input.free_at || undefined } }
      case 'eat_out': return { ok: true, signal: { kind: 'eat_out' } }
      case 'missed': return { ok: true, signal: { kind: 'missed', days: input.days ?? 2 } }
      case 'craving': return { ok: true, signal: { kind: 'craving' } }
      case 'stressed': return { ok: true, signal: { kind: 'stressed' } }
      case 'injury': {
        const part = (INJURY_BODY_PARTS as readonly string[]).includes(input.body_part || '') ? (input.body_part as Injury) : null
        return part ? { ok: true, signal: { kind: 'injury', bodyPart: part } } : { ok: false }
      }
      case 'none': return { ok: true, signal: null }
      default: return { ok: false }
    }
  } catch { return { ok: false } }
}

// Rule-based intent parser: turn what she types ("I only have 20 minutes", "I'm
// exhausted", "eating out with coworkers") into a LifeSignal the recovery engine can
// act on. Fallback path when Claude is unconfigured or fails — see parseSignalAI above.
export function parseSignal(text: string): LifeSignal | null {
  const t = ` ${text.toLowerCase()} `

  // Injury — checked first, safety takes priority over anything else she also mentions.
  if (/\b(hurt|pulled|tweaked|sprained|rolled|twisted|strained|injured)\b/.test(t)) {
    const bodyPart: Injury | null =
      /ankle/.test(t) ? 'ankle'
      : /knee/.test(t) ? 'knee'
      : /back/.test(t) ? 'lower_back'
      : /shoulder/.test(t) ? 'shoulder'
      : /wrist/.test(t) ? 'wrist'
      : /elbow/.test(t) ? 'elbow'
      : /hip/.test(t) ? 'hip'
      : null
    if (bodyPart) return { kind: 'injury', bodyPart }
  }

  // Time crunch — "20 min", "only have 30 minutes", "short on time"
  const mMatch = t.match(/(\d{1,3})\s*(?:min|minute)/)
  if (mMatch || /short on time|only have|not much time|in a hurry|quick workout|no time/.test(t)) {
    return { kind: 'time_crunch', minutes: mMatch ? parseInt(mMatch[1], 10) : 20 }
  }
  // Craving / stress-eating — checked early so it doesn't fall into a generic bucket
  if (/craving|crave|want (some )?junk|want sugar|want something sweet|stress eat|emotional eat|binge|can'?t stop eating|want to eat everything/.test(t)) return { kind: 'craving' }
  if (/stress(ed)?|overwhelm(ed)?|anxious|anxiety|can'?t handle|too much on my plate|breaking down|losing it/.test(t)) return { kind: 'stressed' }
  if (/exhaust|drained|no energy|so tired|wiped|burnt out|burned out|worn out|low energy/.test(t)) return { kind: 'exhausted' }
  if (/didn'?t sleep|no sleep|couldn'?t sleep|bad sleep|slept (bad|poorly|terrible)|up all night|insomnia|barely slept/.test(t)) return { kind: 'poor_sleep' }
  if (/eat(ing)? out|lunch meeting|dinner out|restaurant|going out to (eat|lunch|dinner)|coworkers? for lunch|grabbing (lunch|dinner|food)|ordering out/.test(t)) return { kind: 'eat_out' }
  if (/schedule (chang|shift)|recital|appointment|meeting ran|got busy|working late|work from|kids?|daughter|son|family|pick up|drop off|errand|different today/.test(t)) return { kind: 'schedule_change' }
  if (/missed|skipped|fell off|haven'?t worked out|didn'?t work out|off track|been a few days|slacked/.test(t)) {
    const dMatch = t.match(/(\d{1,2})\s*days?/)
    return { kind: 'missed', days: dMatch ? parseInt(dMatch[1], 10) : 2 }
  }
  return null
}
