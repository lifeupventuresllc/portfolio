import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { usdaConfigured, usdaSearchWithMacros } from '@/lib/usda-food'

// Accurate food search powered by USDA FoodData Central (free, verified whole-food
// database). POST {query} searches a single food term and returns resolved macros.
// Multi-item natural-language descriptions go through /api/plan/food-estimate instead.

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  if (!usdaConfigured()) return NextResponse.json({ configured: false, foods: [] })
  const query = (await request.json())?.query?.toString().trim()
  if (!query) return NextResponse.json({ configured: true, foods: [] })
  const foods = await usdaSearchWithMacros(query)
  return NextResponse.json({ configured: true, foods })
}
