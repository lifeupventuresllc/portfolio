import { NextResponse } from 'next/server'
import { getMemberEnrollment } from '@/lib/member'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const { user, enrollment } = await getMemberEnrollment()
  if (!user || !enrollment) return NextResponse.json({ connected: false })
  const svc = createServiceClient()
  const { data } = await svc.from('calendar_connections').select('id').eq('enrollment_id', enrollment.id as string).maybeSingle()
  return NextResponse.json({ connected: !!data })
}
