import Anthropic from '@anthropic-ai/sdk'
import { anthropicConfigured } from '@/lib/food-estimate'
import type { Injury } from '@/lib/workout-exercises'

// Detects a cold-start "build me a plan" ask inside Coach Asa's chat — she has no
// workout/nutrition plan on file yet and wants one built right there instead of
// through the separate structured intake form. Reads the WHOLE recent conversation,
// not just her latest line, since her answer to Coach Asa's one allowed follow-up
// question lands in a later message — that's how we tell "still missing what we
// need" from "she just gave it" without any separate pending-state to track.
//
// The only follow-up worth asking is injuries/limitations + target area — a wrong
// guess there can actually hurt her or just miss what she wanted; everything else
// (weight, goal, days/week, experience) gets a silent, disclosed default instead,
// since asking for those before showing her anything is exactly the friction this
// whole feature exists to remove.

const INJURY_VALUES = ['knee', 'lower_back', 'shoulder', 'wrist', 'elbow', 'hip', 'ankle'] as const

export type PlanIntent = {
  wantsWorkout: boolean
  wantsNutrition: boolean
  // 'today' = a same-session ask ("give me something to do right now", "I have 20
  // minutes") — reply leads with today's actual session. 'week' = an ongoing
  // program/meal-plan ask — reply leads with the week overview. Both persist the
  // same full plan underneath; only the reply framing differs.
  scope: 'today' | 'week'
  minutesAvailable?: number
  age?: number
  sex?: 'female' | 'male'
  height_in?: number
  weight_lbs?: number
  goal?: 'lose' | 'gain' | 'maintain'
  days_per_week?: number
  training_location?: 'home' | 'gym'
  experience_level?: 'beginner' | 'intermediate' | 'advanced'
  focus_area?: 'core' | 'legs' | 'arms' | 'overall'
  // True the moment she's said ANYTHING about injuries/pain/limitations — including
  // "no injuries" / "I'm good." False means genuinely never addressed, the only
  // case worth asking about.
  injuriesAddressed: boolean
  injuries: Injury[]
} | null

const PLAN_INTENT_TOOL = {
  name: 'plan_intent',
  description: 'Classify whether she is asking to be given a real workout and/or nutrition plan right now, and pull out any concrete stats/preferences she has already given anywhere in the conversation.',
  input_schema: {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      is_plan_request: { type: 'boolean', description: 'True only if she is asking to be given/built a workout and/or a nutrition/meal/calorie plan — not just chatting, logging food, or reporting how her day went.' },
      wants_workout: { type: 'boolean' },
      wants_nutrition: { type: 'boolean', description: 'True if she wants a meal plan, calorie target, or nutrition guidance built for her' },
      scope: { type: 'string', enum: ['today', 'week'], description: '"today" if she\'s asking what to do right now / this session / names a time budget ("I have 20 minutes", "I\'m at the gym right now"). "week" if she\'s asking for an ongoing program or a week of meals. Default to "today" when genuinely ambiguous — a bare "give me a workout" reads as wanting something to do right now.' },
      minutes_available: { type: 'number', description: 'Only if she named how much time she has right now, e.g. "15 minutes" -> 15.' },
      age: { type: 'number' },
      sex: { type: 'string', enum: ['female', 'male'] },
      height_in: { type: 'number', description: 'Height in inches — convert if she gave feet/inches or cm' },
      weight_lbs: { type: 'number', description: 'Weight in pounds — convert if she gave kg' },
      goal: { type: 'string', enum: ['lose', 'gain', 'maintain'] },
      days_per_week: { type: 'number' },
      training_location: { type: 'string', enum: ['home', 'gym'] },
      experience_level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
      focus_area: { type: 'string', enum: ['core', 'legs', 'arms', 'overall'], description: 'Set "core" or "legs"/"arms" if she named a specific body-part focus that maps to one of these (do not force-fit — "glutes" maps to legs, "abs" maps to core). The app has no separate "chest" bucket — chest, pecs, shoulders, and back all map to "arms" too, e.g. "build me a chest and arm workout" -> arms. Set "overall" if she explicitly said she has NO specific focus — "overall", "whole body", "everything", "no preference", "doesn\'t matter", "whatever you think" all count as an explicit "overall" answer and MUST be captured as focus_area: "overall", not omitted. Only omit this field entirely if she has never addressed the question of focus area at all.' },
      injuries_addressed: { type: 'boolean', description: 'True if she has said ANYTHING about injuries/pain/limitations anywhere in the conversation, even just "no injuries" or "I\'m fine." False only if it has genuinely never come up.' },
      injuries: { type: 'array', items: { type: 'string', enum: [...INJURY_VALUES] }, description: 'Specific body parts she named as injured/limited, if any.' },
    },
    required: ['is_plan_request', 'wants_workout', 'wants_nutrition', 'scope', 'injuries_addressed'],
  },
}

const SYSTEM = `You read a conversation between a woman and her AI fitness coach, Coach Asa. Determine whether she is asking Coach Asa to build her a real workout and/or nutrition plan right now — as opposed to just chatting, logging food, reporting her day, or asking a one-off question.

Read the WHOLE conversation given, not just the latest message — she may have already answered a clarifying question Coach Asa asked earlier in this same conversation, so pull stats from anywhere in it, not just the newest line.

Only set is_plan_request true for a genuine "build/give me a plan" ask (e.g. "give me a workout to do", "what should I eat this week", "build me a meal plan", "I want a plan for the gym", "I just downloaded this, what should I do"). A vague "I want to get in shape" with no ask to be given something concrete is NOT a plan request on its own.

Extract every concrete stat or preference she's actually stated anywhere in the conversation — age, sex, height, weight, goal (lose/gain/maintain), how many days a week she can train, home or gym, experience level, how much time she has right now, and anything about injuries or physical limitations (or her explicitly saying she has none). Convert units (kg to lbs, cm/ft-in to inches). Never fabricate or guess a number she didn't state.

For focus area specifically: a named body part counts ("glutes" -> legs, "abs" -> core, and "chest"/"pecs"/"shoulders"/"back" -> arms, since the app has no separate chest bucket — "build me a chest and arm workout" is focus_area=arms), but so does her explicitly saying she has no particular focus — "overall", "whole body", "everything", "no specific area", "doesn't matter" are all real answers and must be captured as focus_area: "overall". Do not treat "overall" as if it were the same as leaving the question unanswered — those are opposite things, and re-asking a question she already answered is a real failure.`

export async function detectPlanIntent(conversationText: string): Promise<PlanIntent> {
  if (!anthropicConfigured() || !conversationText.trim()) return null
  try {
    const client = new Anthropic()
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: SYSTEM,
      tools: [PLAN_INTENT_TOOL],
      tool_choice: { type: 'tool', name: 'plan_intent' },
      messages: [{ role: 'user', content: conversationText }],
    })
    const block = msg.content.find((b) => b.type === 'tool_use')
    if (!block || block.type !== 'tool_use') return null
    const input = block.input as Record<string, unknown>
    if (!input.is_plan_request) return null
    const injuries = Array.isArray(input.injuries)
      ? (input.injuries as unknown[]).filter((v): v is Injury => (INJURY_VALUES as readonly string[]).includes(v as string))
      : []
    return {
      wantsWorkout: !!input.wants_workout,
      wantsNutrition: !!input.wants_nutrition,
      scope: input.scope === 'week' ? 'week' : 'today',
      minutesAvailable: typeof input.minutes_available === 'number' ? input.minutes_available : undefined,
      age: typeof input.age === 'number' ? input.age : undefined,
      sex: input.sex === 'male' ? 'male' : input.sex === 'female' ? 'female' : undefined,
      height_in: typeof input.height_in === 'number' ? input.height_in : undefined,
      weight_lbs: typeof input.weight_lbs === 'number' ? input.weight_lbs : undefined,
      goal: input.goal === 'lose' || input.goal === 'gain' || input.goal === 'maintain' ? input.goal : undefined,
      days_per_week: typeof input.days_per_week === 'number' ? input.days_per_week : undefined,
      training_location: input.training_location === 'home' ? 'home' : input.training_location === 'gym' ? 'gym' : undefined,
      experience_level:
        input.experience_level === 'beginner' || input.experience_level === 'intermediate' || input.experience_level === 'advanced'
          ? input.experience_level
          : undefined,
      focus_area:
        input.focus_area === 'core' || input.focus_area === 'legs' || input.focus_area === 'arms' || input.focus_area === 'overall'
          ? input.focus_area
          : undefined,
      injuriesAddressed: !!input.injuries_addressed,
      injuries,
    }
  } catch {
    return null
  }
}
