import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// All Calorie Blueprint leads: canonical contact + CRM status from funnel_leads,
// enriched with the full stats captured in the blueprint_lead events.
async function verifyAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' || profile?.role === 'support'
}

// Fallback: pull what we can from the summary note of older leads (pre full-capture).
function parseNotes(notes: string | null) {
  if (!notes) return {}
  const goal = notes.match(/Blueprint:\s*([a-z]+)/i)?.[1]
  const eats = notes.match(/workout\s*([\d,]+)\s*\/\s*rest\s*([\d,]+)\s*cal/i)
  const prot = notes.match(/([\d]+)\s*g\s*protein/i)
  const num = (s?: string) => (s ? Number(s.replace(/,/g, '')) : undefined)
  return {
    goal: goal || undefined,
    steady_workout: num(eats?.[1]),
    steady_rest: num(eats?.[2]),
    protein_g: prot ? Number(prot[1]) : undefined,
  }
}

export async function GET() {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const svc = createServiceClient()

  // Both funnels write into the SAME funnel_leads row per email (Find Your Fix
  // creates it, a later Blueprint completion just updates it, or vice versa) —
  // one merged list, not two separate dashboards.
  const [leadsRes, blueprintEventsRes, quizEventsRes] = await Promise.all([
    svc.from('funnel_leads').select('*').in('source', ['blueprint', 'find-your-fix']).order('created_at', { ascending: false }).limit(1000),
    svc.from('events').select('metadata, created_at').eq('event_type', 'blueprint_lead').order('created_at', { ascending: false }).limit(2000),
    svc.from('events').select('metadata, created_at').eq('event_type', 'blocker_quiz_completed').order('created_at', { ascending: false }).limit(2000),
  ])

  if (leadsRes.error) return NextResponse.json({ error: leadsRes.error.message }, { status: 500 })

  // latest full-stats event per email, for each event type
  const statsByEmail: Record<string, Record<string, unknown>> = {}
  for (const ev of blueprintEventsRes.data || []) {
    const m = (ev.metadata || {}) as Record<string, unknown>
    const email = String(m.email || '').toLowerCase()
    if (email && !statsByEmail[email]) statsByEmail[email] = m
  }
  const blockerByEmail: Record<string, string> = {}
  for (const ev of quizEventsRes.data || []) {
    const m = (ev.metadata || {}) as Record<string, unknown>
    const email = String(m.email || '').toLowerCase()
    if (email && !blockerByEmail[email]) blockerByEmail[email] = String(m.blocker || '')
  }

  const rows = (leadsRes.data || []).map((l) => {
    const email = String(l.email || '').toLowerCase()
    const stats = statsByEmail[email] || parseNotes(l.notes)
    return {
      id: l.id,
      name: l.name,
      email: l.email,
      phone: l.phone || null,
      status: l.status,
      lead_score: l.lead_score || 0,
      created_at: l.created_at,
      last_email_at: l.last_email_at || null,
      notes: l.notes || null,
      source: l.source || 'blueprint',
      blocker: blockerByEmail[email] || null,
      stats,
    }
  })

  return NextResponse.json(rows)
}
