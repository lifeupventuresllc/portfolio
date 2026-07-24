import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Seamless blueprint→app conversion: if she already did the free Calorie
// Blueprint before signing up for the app, pull her answers forward into
// intake instead of making her retype her name/age/height/weight/goal.
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ found: false })

  const svc = createServiceClient()
  const { data } = await svc
    .from('events')
    .select('metadata')
    .eq('event_type', 'blueprint_lead')
    .filter('metadata->>email', 'eq', user.email)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data?.metadata) return NextResponse.json({ found: false })
  return NextResponse.json({ found: true, blueprint: data.metadata })
}
