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

// Real bug caught live (2026-08-25, direct production test): the earlier
// version put the "how to weave this in" directive INSIDE the user-message
// content, mixed in with the raw instruction text as one blob. Against
// Haiku, that occasionally produced an echo failure — the model returned
// the directive sentence itself as the "reworded" text instead of following
// it, and that verbatim internal prompt text nearly reached a real user.
// Fixed by moving all "how" guidance into the system prompt (instructions
// channel) and keeping the user message to plain labeled data only — plus a
// sanitize() safety net below so a similar echo can never reach her even if
// it recurs, regardless of root cause.
function sanitizeReworded(text: string, instruction: string): string | null {
  const t = text.trim()
  if (!t) return null
  const lower = t.toLowerCase()
  // Telltale fragments from our own system prompt / this function's doc —
  // if the model echoed instructions back, they show up verbatim here.
  // Real bug caught live, 2026-08-26: a PARTIAL echo slipped through this
  // list — the model appended the user-message's own "Energy today: low"
  // label straight onto the real instruction (e.g. "...just check in with
  // yourself. Energy today: low"), with none of the phrases below present,
  // so it read as legitimate warm copy while actually leaking raw input
  // labels. Added the literal template fragments from userContent above —
  // these can never appear in genuine reworded coaching copy.
  const leakMarkers = ['integrated part', 'not a second offer', 'reword', 'system prompt', 'energy today:', 'instruction to reword:']
  if (leakMarkers.some((m) => lower.includes(m))) return null
  // A real rewording stays in the same ballpark length as the source
  // content; an echo of the full directive text runs much longer.
  if (t.length > instruction.length * 3 + 80) return null
  return t
}

export async function humanizeInstruction(instruction: string, context: { energy: string }): Promise<string> {
  if (!anthropicConfigured() || !instruction.trim()) return instruction
  try {
    const client = new Anthropic()
    const userContent = `Energy today: ${context.energy}\nInstruction to reword: ${instruction}`
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system:
        "You rewrite ONE fitness-coaching instruction so it reads warm and LOVING — like someone genuinely on her side speaking directly to her, not giving her an order. Never a command (\"do this,\" \"take that\") and never robotic or like a status report — state the thing as an act of care instead of an instruction to follow. A term of endearment (\"love,\" \"beautiful\") used sparingly is welcome when it fits naturally, never forced into every line. Keep the exact same real content: same food/workout/action, same numbers, nothing invented or dropped. You are only adjusting tone and phrasing. One or two short sentences, max. No emoji unless the original had one. If today's energy is low, keep the tone extra gentle and low-pressure.",
      tools: [REWORD_TOOL],
      tool_choice: { type: 'tool', name: 'reword_instruction' },
      messages: [{ role: 'user', content: userContent }],
    })
    const block = msg.content.find((b) => b.type === 'tool_use')
    const text = block && block.type === 'tool_use' ? (block.input as { text?: string }).text : null
    if (!text) return instruction
    return sanitizeReworded(text, instruction) ?? instruction
  } catch {
    return instruction
  }
}

// NOTE: an earlier version of this file had a generateRestaurantOrder()
// here — asked the AI to invent a plausible order/calories for whatever
// restaurant she named. Removed 2026-08-26, Asa's explicit call: "we don't
// want estimates, we [won't base a] decision off that." Checked live
// whether USDA's database (already used elsewhere in this app for real
// food macros) could substitute a genuine per-restaurant lookup instead —
// confirmed it has no real restaurant-chain menu data at all (that's not
// what USDA FoodData Central is for). The only honest source available is
// the app's own curated Escape Plan data (lib/escape-plan.ts's new
// pickForRestaurant), which is what lib/next-action/state.ts uses now —
// real curated numbers only, never an AI guess, for this decision.

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
      // The actual restaurant/chain name, ONLY when she names one explicitly
      // ("I'm at Taco Bell") — omitted for a bare "I'm eating out" with no
      // place named. Real gap fixed 2026-08-26: this used to be thrown away,
      // so the engine's eating-out pick had no idea which restaurant she
      // was actually at and could suggest a completely unrelated one.
      restaurant_name: { type: 'string' },
      // Which meal she means, ONLY when her own words say so ("give me a
      // snack idea," "what should I get for lunch") — never inferred from
      // what time it happens to be right now. Real gap fixed 2026-08-26: a
      // 1pm "snack" request was being sized as a Lunch portion because the
      // engine only ever looked at the clock.
      meal_slot: { type: 'string', enum: ['breakfast', 'lunch', 'snack', 'dinner'] },
      // Reward profile, source #2 (explicit statement) — prompt 7. Only
      // filled when she's clearly saying something she personally enjoys or
      // finds relaxing/rewarding, whether volunteered or in answer to a
      // direct question about it. Never filled from a passing mention that
      // isn't really about what she likes (e.g. logging a food she ate
      // isn't the same as saying she loves it).
      stated_preference_label: { type: 'string' },
      stated_preference_category: { type: 'string', enum: ['nutrition', 'fitness', 'recovery', 'other'] },
    },
    required: [],
  },
}

export type ParsedSignal = {
  energy?: 'low' | 'normal' | 'high'
  minutesAvailable?: number
  dayChanged?: boolean
  eatingOut?: boolean
  restaurantName?: string
  mealSlot?: 'Breakfast' | 'Lunch' | 'Snack' | 'Dinner'
  statedPreference?: { label: string; category: 'nutrition' | 'fitness' | 'recovery' | 'other' }
}

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
        "Read a short message she just sent about her day, right now. Extract ONLY what's clearly and explicitly stated, never infer or guess: her current energy/capacity level (low/normal/high) if she said something about how she's feeling or how much she can do, how many minutes she has available if she gave an actual number, whether she's saying her day or plans changed/got disrupted, whether she's saying she's eating out / at a restaurant right now, the SPECIFIC restaurant or chain name if she names one (omit if she just says she's eating out with no place named), which specific meal she means (breakfast/lunch/snack/dinner) ONLY if she actually says that word or something unambiguous like \"snack\" or \"for dinner\" — never guess this from what time it is, and — separately — whether she's naming something she personally enjoys, finds relaxing, or considers a treat (a favorite snack, a type of movement she likes, a way she likes to unwind). For that last one, only fill it in when she's clearly describing something SHE values, in her own words, as a short label (a few words), plus which of nutrition/fitness/recovery/other it best fits. Omit any field she didn't actually address — an empty result is correct and expected for a message that doesn't touch any of these.",
      tools: [SIGNAL_TOOL],
      tool_choice: { type: 'tool', name: 'record_signal' },
      messages: [{ role: 'user', content: message }],
    })
    const block = msg.content.find((b) => b.type === 'tool_use')
    if (!block || block.type !== 'tool_use') return {}
    const input = block.input as { energy?: string; minutes_available?: number; day_changed?: boolean; eating_out?: boolean; restaurant_name?: string; meal_slot?: string; stated_preference_label?: string; stated_preference_category?: string }
    const result: ParsedSignal = {}
    if (input.energy === 'low' || input.energy === 'normal' || input.energy === 'high') result.energy = input.energy
    if (typeof input.minutes_available === 'number' && input.minutes_available > 0) result.minutesAvailable = Math.round(input.minutes_available)
    if (typeof input.day_changed === 'boolean') result.dayChanged = input.day_changed
    if (typeof input.eating_out === 'boolean') result.eatingOut = input.eating_out
    if (input.restaurant_name && input.restaurant_name.trim()) result.restaurantName = input.restaurant_name.trim()
    if (input.meal_slot === 'breakfast') result.mealSlot = 'Breakfast'
    else if (input.meal_slot === 'lunch') result.mealSlot = 'Lunch'
    else if (input.meal_slot === 'snack') result.mealSlot = 'Snack'
    else if (input.meal_slot === 'dinner') result.mealSlot = 'Dinner'
    if (input.stated_preference_label && input.stated_preference_label.trim()) {
      const category = input.stated_preference_category
      result.statedPreference = {
        label: input.stated_preference_label.trim(),
        category: category === 'nutrition' || category === 'fitness' || category === 'recovery' ? category : 'other',
      }
    }
    return result
  } catch {
    return {}
  }
}
