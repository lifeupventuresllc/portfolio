import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

// FALLBACK ONLY — when a food isn't in the USDA database, Claude estimates
// its macros from the description. Results are clearly labeled "estimated" in the UI
// so verified DB facts and AI guesses never get confused (accuracy is the priority).

const SCHEMA = {
  type: 'object',
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
} as const

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ configured: false, foods: [] })
  }
  const description = (await request.json())?.description?.toString().trim()
  if (!description) return NextResponse.json({ foods: [] })

  try {
    const client = new Anthropic()
    const msg = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      system:
        'You are a nutrition estimator. Given a spoken/typed description of food someone ate, return your best estimate of each distinct food item with realistic calories and macros in grams for the amount described. Use standard serving sizes when quantity is vague. Return integers for calories and grams. Only estimate — never claim these are exact.',
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: `Estimate the nutrition for: ${description}` }],
    })
    const block = msg.content.find((b) => b.type === 'text')
    const parsed = block && block.type === 'text' ? JSON.parse(block.text) : { foods: [] }
    const foods = (Array.isArray(parsed?.foods) ? parsed.foods : []).map((f: Record<string, unknown>) => ({
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
    return NextResponse.json({ configured: true, foods })
  } catch {
    return NextResponse.json({ configured: true, foods: [], error: 'Could not estimate right now.' }, { status: 200 })
  }
}
