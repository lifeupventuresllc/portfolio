import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropicConfigured, estimateFoods } from '@/lib/food-estimate'

// FALLBACK ONLY — when a food isn't in the USDA database, Claude estimates
// its macros from the description. Results are clearly labeled "estimated" in the UI
// so verified DB facts and AI guesses never get confused (accuracy is the priority).

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  if (!anthropicConfigured()) return NextResponse.json({ configured: false, foods: [] })
  const description = (await request.json())?.description?.toString().trim()
  if (!description) return NextResponse.json({ foods: [] })

  const foods = await estimateFoods(description)
  return NextResponse.json({ configured: true, foods })
}
