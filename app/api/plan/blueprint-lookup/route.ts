import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Seamless blueprint→app conversion: if she already did the free Calorie
// Blueprint before signing up for the app, pull her answers forward into
// intake instead of making her retype her name/age/height/weight/goal.
//
// Auto-matches on her logged-in email by default. She can also type in a
// different email explicitly (?email=) — covers the real case where she
// signed up for the app with a different email than the one she used for
// the free Blueprint, which the automatic match alone can't catch. Still
// gated behind requiring a real session (not a fully public lookup), same
// as before.
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ found: false })

  const manualEmail = request.nextUrl.searchParams.get('email')?.trim().toLowerCase()
  const lookupEmail = manualEmail || user.email
  if (!lookupEmail) return NextResponse.json({ found: false })

  const svc = createServiceClient()
  const { data } = await svc
    .from('events')
    .select('metadata')
    .eq('event_type', 'blueprint_lead')
    .filter('metadata->>email', 'eq', lookupEmail)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data?.metadata) return NextResponse.json({ found: false })
  return NextResponse.json({ found: true, blueprint: data.metadata })
}
