import Anthropic from '@anthropic-ai/sdk'

// Shared Claude-based nutrition estimator — used by both the dedicated food-search
// "Estimate with AI" button (app/api/plan/food-estimate) and Coach Asa chat's
// eaten-food detection (app/api/plan/operator). Gated on ANTHROPIC_API_KEY; both
// callers degrade gracefully (no logging attempted) when it's not configured —
// this is real AI wiring, not a rule-based stand-in, so it just starts working
// the moment the key lands, nothing to rebuild later.

export type FoodEstimate = {
  name: string; brand: string | null; servings: number; serving_label: string | null
  calories: number; protein_g: number; carbs_g: number; fats_g: number; source: 'estimated'
}

// Forced tool-use is how this SDK version gets schema-constrained output —
// there is no `output_config`/`json_schema` response-format shorthand.
const RECORD_FOODS_TOOL = {
  name: 'record_foods',
  description: 'Record the estimated foods and their nutrition.',
  input_schema: {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      foods: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string' },
            servings: { type: 'number' },
            calories: { type: 'integer' },
            protein_g: { type: 'integer' },
            carbs_g: { type: 'integer' },
            fats_g: { type: 'integer' },
          },
          required: ['name', 'servings', 'calories', 'protein_g', 'carbs_g', 'fats_g'],
        },
      },
    },
    required: ['foods'],
  },
}

export function anthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

function parseFoods(input: unknown): FoodEstimate[] {
  const foods = Array.isArray((input as Record<string, unknown>)?.foods) ? (input as { foods: unknown[] }).foods : []
  return foods.map((f) => f as Record<string, unknown>).map((f) => ({
    name: String(f.name || 'Food'),
    brand: null,
    servings: Number(f.servings) || 1,
    serving_label: 'serving',
    calories: Math.round(Number(f.calories) || 0),
    protein_g: Math.round(Number(f.protein_g) || 0),
    carbs_g: Math.round(Number(f.carbs_g) || 0),
    fats_g: Math.round(Number(f.fats_g) || 0),
    source: 'estimated' as const,
  }))
}

// Used by the dedicated food-search "Estimate with AI" button — the input is
// already known to be a food description (she typed/said it into a search box).
export async function estimateFoods(description: string): Promise<FoodEstimate[]> {
  if (!anthropicConfigured() || !description.trim()) return []
  try {
    const client = new Anthropic()
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:
        'You are a nutrition estimator. Given a spoken/typed description of food someone ate, return your best estimate of each distinct food item with realistic calories and macros in grams for the amount described. Use standard serving sizes when quantity is vague. Return integers for calories and grams. Only estimate — never claim these are exact.',
      tools: [RECORD_FOODS_TOOL],
      tool_choice: { type: 'tool', name: 'record_foods' },
      messages: [{ role: 'user', content: `Estimate the nutrition for: ${description}` }],
    })
    const block = msg.content.find((b) => b.type === 'tool_use')
    return block && block.type === 'tool_use' ? parseFoods(block.input) : []
  } catch { return [] }
}

// Used by Coach Asa chat — the input is a free-form message about her day, which
// may or may not describe something she already ate (could be a craving, a
// question, an unrelated update). Stricter prompt so we only log when she's
// actually describing something consumed, not every mention of food.
export async function detectEatenFood(message: string): Promise<FoodEstimate[]> {
  if (!anthropicConfigured() || !message.trim()) return []
  try {
    const client = new Anthropic()
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:
        "You are reading a casual message someone sent their fitness coach about their day. Determine whether she is describing something she ALREADY ATE OR DRANK (past tense, actually consumed) — not a craving, not something she's considering, not a question, not a hypothetical. If she is not clearly describing food already consumed, return an empty foods array. If she is, return each distinct food item with a realistic calorie/macro estimate for the amount described (assume a standard serving if vague). Return integers for calories and grams.",
      tools: [RECORD_FOODS_TOOL],
      tool_choice: { type: 'tool', name: 'record_foods' },
      messages: [{ role: 'user', content: message }],
    })
    const block = msg.content.find((b) => b.type === 'tool_use')
    return block && block.type === 'tool_use' ? parseFoods(block.input) : []
  } catch { return [] }
}
