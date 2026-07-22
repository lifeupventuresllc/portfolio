import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Every 👍/👎 pulse-check + written note from FeedbackForm, joined with who sent it.
// Previously write-only (challenge_progress note='__feedback__') with no way for Asa to read it.
async function verifyAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' || profile?.role === 'support'
}

export async function GET() {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const svc = createServiceClient()

  const { data: rows, error } = await svc
    .from('challenge_progress')
    .select('id, enrollment_id, logged_on, created_at, measurements')
    .eq('note', '__feedback__')
    .order('created_at', { ascending: false })
    .limit(1000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const enrollmentIds = Array.from(new Set((rows || []).map((r) => r.enrollment_id)))
  const { data: enrollments } = await svc
    .from('challenge_enrollments')
    .select('id, name, email')
    .in('id', enrollmentIds.length ? enrollmentIds : ['00000000-0000-0000-0000-000000000000'])
  const byId: Record<string, { name: string; email: string }> = {}
  for (const e of enrollments || []) byId[e.id] = { name: e.name, email: e.email }

  const out = (rows || []).map((r) => {
    const m = (r.measurements || {}) as { rating?: string; text?: string; category?: string; severity?: string; context?: string; page?: string; device?: string }
    return {
      id: r.id,
      rating: m.rating === 'up' || m.rating === 'down' ? m.rating : null,
      text: m.text || '',
      category: m.category || 'general',
      severity: m.severity || '',
      context: m.context || '',
      page: m.page || '',
      device: m.device || '',
      logged_on: r.logged_on,
      created_at: r.created_at,
      name: byId[r.enrollment_id]?.name || 'Unknown',
      email: byId[r.enrollment_id]?.email || '',
    }
  })

  return NextResponse.json(out)
}
