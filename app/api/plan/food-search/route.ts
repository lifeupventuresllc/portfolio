import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { nutritionixConfigured, nutritionixNaturalNutrients, nutritionixInstant, nutritionixItem } from '@/lib/food-api'

// Accurate food search powered by Nutritionix. POST {query} runs the natural-language
// endpoint (verified macros for a typed food OR a spoken "2 eggs and toast"). GET ?q=
// returns fast autocomplete suggestions; GET ?item= resolves a branded item to macros.

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  if (!nutritionixConfigured()) return NextResponse.json({ configured: false, foods: [] })
  const query = (await request.json())?.query?.toString().trim()
  if (!query) return NextResponse.json({ configured: true, foods: [] })
  const foods = await nutritionixNaturalNutrients(query)
  return NextResponse.json({ configured: true, foods })
}

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  if (!nutritionixConfigured()) return NextResponse.json({ configured: false, suggestions: [], food: null })

  const item = request.nextUrl.searchParams.get('item')
  if (item) return NextResponse.json({ configured: true, food: await nutritionixItem(item) })

  const q = request.nextUrl.searchParams.get('q') || ''
  return NextResponse.json({ configured: true, suggestions: await nutritionixInstant(q) })
}
