import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { syncBuilderState } from '@/lib/builder/engine'

export const dynamic = 'force-dynamic'

const EMPTY = { phase: 'foundation' as const, totalCount: 0, elements: [] as unknown[] }

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json(EMPTY)

  const svc = createServiceClient()

  let { data: enrollment } = await svc
    .from('challenge_enrollments')
    .select('id, intake_completed')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .maybeSingle()

  if (!enrollment && user.email) {
    const { data: byEmail } = await svc
      .from('challenge_enrollments')
      .select('id, intake_completed')
      .eq('email', user.email)
      .order('created_at', { ascending: false })
      .maybeSingle()
    enrollment = byEmail || null
  }

  if (!enrollment || !enrollment.intake_completed) return NextResponse.json(EMPTY)

  const { elements, phase } = await syncBuilderState(enrollment.id as string, user.id)

  return NextResponse.json({
    phase,
    totalCount: elements.length,
    elements: elements.map((e) => ({
      id: e.id,
      tier: e.tier,
      sourceType: e.source_type,
      sequence: e.sequence,
      variant: e.variant,
      placedAt: e.placed_at,
    })),
  })
}
