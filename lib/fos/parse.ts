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
      workout_style: { type: 'string', enum: ['cardio'], description: 'Set ONLY if she explicitly asks for cardio/HIIT/a different type of workout than her usual one today — independent of kind, can accompany any category.' },
      location: { type: 'string', enum: ['home', 'gym', 'traveling'], description: 'Set ONLY if she explicitly states where she is or will be working out today (e.g. "I\'m home", "at the gym", "traveling for work", "no equipment here") — independent of kind, can accompany any category. Do not guess from context.' },
      focus_areas: { type: 'array', items: { type: 'string', enum: ['core', 'legs', 'arms', 'chest', 'back', 'shoulders'] }, description: 'Set to EVERY specific body area she explicitly asks to target for today\'s workout — can be one value or several, e.g. "give me an arm workout" is ["arms"], "I want to hit my legs and core today" is ["legs","core"]. Never drop a named area just because she named more than one — a compound ask like "arms, legs, and core" must capture all three, not just the first. Chest, back, and shoulders are each their own real value — do not force everything into "arms"; "arms" means biceps/triceps specifically. Independent of kind, can accompany any category. Do not guess from context or set this for her permanent/default focus, only a request for TODAY.' },
    },
    required: ['kind'],
  },
}

const CLASSIFY_SYSTEM = `You read a RECENT CONVERSATION between a woman and her AI fitness coach — not just her latest message in isolation — and classify her most recent message into exactly one category:
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

Pick the single best match. If more than one could apply (other than injury, which always wins), pick whichever is most central to what she needs right now. Use "none" liberally — only classify a real signal when it's clearly there.

Separately, if she explicitly asks for cardio/HIIT/a different type of workout than usual (not just describing how she feels), also set workout_style — this can accompany any kind, e.g. "only have 20 min, want cardio" is still kind=time_crunch with workout_style=cardio.

Separately again, if she explicitly says where she is or will be training today (home, gym, traveling, "no equipment", a hotel, etc.), also set location — this can accompany any kind too. Never infer it from what she's asking for; only set it when she actually stated it — but "stated it" includes earlier in this same conversation, not only the newest line. If she said "I'm at home, no equipment" two messages ago and this message is a follow-up about the same session (e.g. approving a change, asking a clarifying question, saying "yes"), location is still 'home' — carry it forward. Only drop it if a later message clearly moves on to a different day/session.

Separately again, if she explicitly asks to target specific body area(s) for TODAY's workout, also set focus_areas — this can accompany any kind too, e.g. "I'm at a hotel, give me an arm workout" is kind=none, location=traveling, focus_areas=["arms"]. Chest, back, and shoulders are each real distinct values now (not folded into "arms" — "arms" means biceps/triceps specifically). CAPTURE EVERY AREA SHE NAMES, not just one: "I want to tone my arms and hit my legs and core today" is focus_areas=["arms","legs","core"] — dropping any of the three is a real failure, not a simplification. If she names a specific body part alongside a general phrase like "full body"/"whole body"/"everything" in the same message (e.g. "focus on my full body and also my core"), the specific part wins — set focus_areas=["core"], not omit it. Same carry-forward rule as location: if she named focus area(s) earlier in this conversation and hasn't since said something that contradicts or replaces them, they're still her focus for this message too — don't drop them just because her newest line didn't repeat the words. Only her permanent/default focus area lives elsewhere (her profile) — this field is only for an explicit one-off request stated in this conversation.`

// A confident "none" from Claude (nothing situational here) and "the call never
// happened" (unconfigured / failed) are different outcomes — the first should NOT
// fall through to the regex matcher (which can misfire on unrelated words, e.g.
// "my daughter's stressed about her exam" hitting the stressed pattern), only the
// second should. `ok: false` means the caller should try parseSignal() instead.
export type FocusAreaRequest = 'core' | 'legs' | 'arms' | 'chest' | 'back' | 'shoulders'
type AIClassifyResult = { ok: true; signal: LifeSignal | null; workoutStyle?: 'cardio'; location?: 'home' | 'gym' | 'traveling'; focusAreas?: FocusAreaRequest[] } | { ok: false }

// Claude-based intent classifier — replaces the regex matcher below as the primary
// path now that the key is live. Falls back to the rule-based parser (still
// zero-AI, always available) only when unconfigured or the call fails, so the
// operator never goes silent. Output shape is identical either way: recover()'s
// hand-tuned, identity-affirming copy is untouched — only how we read her is upgraded.
//
// Real root cause found live, after several individual symptoms (leg content
// resurfacing after asking for "back," equipment/location not respected on a
// follow-up message) turned out to be the same underlying bug: this only ever
// looked at her single latest message, with zero memory of anything said
// earlier in the SAME conversation — unlike detectPlanIntent (the cold-start
// classifier), which reads the whole thread. So the moment she said "I'm at
// home, no equipment" or "focus on my back" in one message and then sent
// ANYTHING else afterward (approving a change, a follow-up question, even
// just "yes"), that context vanished completely for every message after it,
// since each call started from nothing. `conversationText` is the recent
// thread formatted as "role: content" lines (same shape detectPlanIntent
// already uses) — her latest message is still the one being classified, the
// difference is the model can now actually see what came before it.
export async function parseSignalAI(conversationText: string): Promise<AIClassifyResult> {
  if (!anthropicConfigured() || !conversationText.trim()) return { ok: false }
  try {
    const client = new Anthropic()
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: CLASSIFY_SYSTEM,
      tools: [CLASSIFY_TOOL],
      tool_choice: { type: 'tool', name: 'classify_life_signal' },
      messages: [{ role: 'user', content: conversationText }],
    })
    const block = msg.content.find((b) => b.type === 'tool_use')
    if (!block || block.type !== 'tool_use') return { ok: false }
    const input = block.input as { kind: string; minutes?: number; days?: number; free_at?: string; body_part?: string; workout_style?: string; location?: string; focus_areas?: unknown }
    const workoutStyle: 'cardio' | undefined = input.workout_style === 'cardio' ? 'cardio' : undefined
    const location: 'home' | 'gym' | 'traveling' | undefined =
      input.location === 'home' || input.location === 'gym' || input.location === 'traveling' ? input.location : undefined
    const VALID_AREAS = ['core', 'legs', 'arms', 'chest', 'back', 'shoulders']
    const focusAreas: FocusAreaRequest[] | undefined = Array.isArray(input.focus_areas)
      ? (input.focus_areas as unknown[]).filter((v): v is FocusAreaRequest => VALID_AREAS.includes(v as string))
      : undefined
    const extras = { workoutStyle, location, focusAreas: focusAreas?.length ? focusAreas : undefined }
    switch (input.kind) {
      case 'time_crunch': return { ok: true, signal: { kind: 'time_crunch', minutes: input.minutes ?? 20 }, ...extras }
      case 'exhausted': return { ok: true, signal: { kind: 'exhausted' }, ...extras }
      case 'poor_sleep': return { ok: true, signal: { kind: 'poor_sleep' }, ...extras }
      case 'schedule_change': return { ok: true, signal: { kind: 'schedule_change', freeAt: input.free_at || undefined }, ...extras }
      case 'eat_out': return { ok: true, signal: { kind: 'eat_out' }, ...extras }
      case 'missed': return { ok: true, signal: { kind: 'missed', days: input.days ?? 2 }, ...extras }
      case 'craving': return { ok: true, signal: { kind: 'craving' }, ...extras }
      case 'stressed': return { ok: true, signal: { kind: 'stressed' }, ...extras }
      case 'injury': {
        const part = (INJURY_BODY_PARTS as readonly string[]).includes(input.body_part || '') ? (input.body_part as Injury) : null
        return part ? { ok: true, signal: { kind: 'injury', bodyPart: part }, ...extras } : { ok: false }
      }
      case 'none': return { ok: true, signal: null, ...extras }
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

// Independent of whichever kind matched — the regex-fallback counterpart to
// CLASSIFY_TOOL's workout_style field, used only when parseSignalAI is
// unconfigured/failed (see app/api/plan/operator/route.ts).
export function detectWorkoutStyle(text: string): 'cardio' | undefined {
  return /\b(cardio|hiit|high.intensity)\b/i.test(text) ? 'cardio' : undefined
}

// Regex-fallback counterpart to CLASSIFY_TOOL's location field. "Traveling" checked
// before "home"/"gym" so "traveling, no equipment" doesn't also need to match a
// home/gym word to be caught — most travel phrasing won't mention either.
export function detectLocation(text: string): 'home' | 'gym' | 'traveling' | undefined {
  const t = ` ${text.toLowerCase()} `
  if (/traveling|travelling|on the road|\bhotel\b|no equipment|no gym access/.test(t)) return 'traveling'
  if (/\b(at |from |i'?m )?home\b/.test(t)) return 'home'
  if (/\bgym\b/.test(t)) return 'gym'
  return undefined
}

// Real gap, Asa's direct ask 2026-08-31: home-track requests should ask
// what equipment is actually available (dumbbells/bands/machines/nothing)
// instead of always assuming pure bodyweight — matches the same
// never-assume principle as detectLocation above. Deterministic keyword
// check only (no AI classifier for this yet, matching detectFocusAreas'
// own regex-only approach) — returns undefined when nothing in THIS
// message says anything about equipment, which the caller treats as "not
// stated," never as "none available."
export function detectEquipment(text: string): string[] | undefined {
  const t = ` ${text.toLowerCase()} `
  const found: string[] = []
  const add = (e: string) => { if (!found.includes(e)) found.push(e) }
  if (/no equipment|bodyweight only|nothing at home|don'?t have (any )?equipment|just my body/.test(t)) add('bodyweight only')
  if (/dumbbells?|\bdb'?s?\b/.test(t)) add('dumbbells')
  if (/resistance bands?|\bbands?\b/.test(t)) add('bands')
  if (/kettlebells?|\bkb'?s?\b/.test(t)) add('kettlebell')
  if (/barbell/.test(t)) add('barbell')
  if (/\bmachines?\b|home gym|full (gym )?setup|cable machine/.test(t)) add('machines')
  return found.length ? found : undefined
}

// Regex-fallback counterpart to CLASSIFY_TOOL's focus_area field — an explicit
// one-off "give me an arm workout today" request, not her permanent default.
export function detectFocusArea(text: string): FocusAreaRequest | undefined {
  const t = ` ${text.toLowerCase()} `
  // Real gap found live (formal bug report + a live screenshot showing "Focus
  // → arms today" right under Coach Asa's own reply describing a "back day"):
  // chest/back/shoulders used to all collapse into 'arms', so three genuinely
  // different asks returned the identical workout. Each is its own value now,
  // matching the real Muscle tags the exercise pool already carries — checked
  // in a specific order since a message can plausibly mention more than one.
  if (/\bchest\b|\bpecs?\b/.test(t)) return 'chest'
  if (/\bback\b/.test(t)) return 'back'
  if (/\bshoulders?\b|\bdelts?\b/.test(t)) return 'shoulders'
  if (/\barms?\b|\bbiceps?\b|\btriceps?\b/.test(t)) return 'arms'
  if (/\blegs?\b|\bglutes?\b|\bquads?\b|\bhamstrings?\b/.test(t)) return 'legs'
  if (/\bcore\b|\babs?\b|\bwaistline\b/.test(t)) return 'core'
  return undefined
}

// Multi-area counterpart — real gap found live via Asa's own screenshot:
// "I wanna focus on toning up my arms and I wanna hit my legs and core
// today" only ever built "arms," silently dropping legs and core, because
// the single-value version (and the AI classifier's old single-value field)
// physically couldn't hold more than one answer. Scans for every area
// mentioned instead of stopping at the first match — a real multi-area ask
// is common and deserves a real multi-area session, not one third of it.
export function detectFocusAreas(text: string): FocusAreaRequest[] {
  const t = ` ${text.toLowerCase()} `
  const found: FocusAreaRequest[] = []
  const add = (a: FocusAreaRequest) => { if (!found.includes(a)) found.push(a) }
  if (/\bchest\b|\bpecs?\b/.test(t)) add('chest')
  if (/\bback\b/.test(t)) add('back')
  if (/\bshoulders?\b|\bdelts?\b/.test(t)) add('shoulders')
  if (/\barms?\b|\bbiceps?\b|\btriceps?\b/.test(t)) add('arms')
  if (/\blegs?\b|\bglutes?\b|\bquads?\b|\bhamstrings?\b/.test(t)) add('legs')
  if (/\bcore\b|\babs?\b|\bwaistline\b/.test(t)) add('core')
  return found
}

// Real, reproducible bug found via a live stress test: detectPlanIntent's AI
// classifier can self-report injuries_addressed: true even when injuries were
// NEVER mentioned anywhere in the conversation — a plain "build me a workout"
// followed by answering level/location/focus quick-replies sailed straight
// through to a built plan with the injury question never asked at all. This
// is the one question where a wrong guess can actually hurt her, so it can't
// rest on an LLM's self-report of "I already handled that." Grounded instead
// in the actual stored conversation: either she was directly asked the real
// injury question and replied at all afterward (the strongest possible
// signal — a real question, a real answer), or she volunteered
// injury/pain/limitation language on her own, unprompted, in her own words.
export function injuriesGenuinelyAddressed(history: { role: string; content: string }[]): boolean {
  const askedIdx = history.findIndex((h) => h.role === 'operator' && /any injuries or areas i should work around/i.test(h.content))
  if (askedIdx >= 0 && history.slice(askedIdx + 1).some((h) => h.role === 'user')) return true
  const userText = history.filter((h) => h.role === 'user').map((h) => h.content).join(' ').toLowerCase()
  return /\b(injur(y|ies|ed)?|hurt|pain(ful)?|sore(ness)?|tweak(ed)?|sprain(ed)?|pulled|strain(ed)?|no injuries|i'?m fine|nothing wrong|nothing to report)\b/.test(userText)
}
