import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ATOMIC_LIBRARY } from '@/lib/exercise-library'
import { COMBO_MOVES } from '@/lib/combo-moves'
import { readAlwaysSwaps } from '@/lib/always-swaps'

// Swap → "Always" (2026-11-12): that move never shows up for her again; the
// one she picked takes its place (lib/always-swaps.ts). Saved on her intake.
const known = (n: string) => ATOMIC_LIBRARY.some((e) => e.name === n) || COMBO_MOVES.some((m) => m.name === n)

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
  const svc = createServiceClient()
  let { data: enrollment } = await svc.from('challenge_enrollments').select('id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc.from('challenge_enrollments').select('id').eq('email', user.email).order('created_at', { ascending: false }).limit(1).maybeSingle()
    enrollment = byEmail || null
  }
  if (!enrollment) return NextResponse.json({ error: 'No enrollment found.' }, { status: 404 })

  const body = (await request.json().catch(() => null)) as { from?: unknown; to?: unknown } | null
  const from = typeof body?.from === 'string' ? body.from : ''
  const to = typeof body?.to === 'string' ? body.to : ''
  if (!from || !to || from === to || !known(to)) return NextResponse.json({ error: 'That swap isn’t available.' }, { status: 400 })

  const { data: intake } = await svc.from('challenge_intake').select('form_data').eq('enrollment_id', enrollment.id).maybeSingle()
  if (!intake) return NextResponse.json({ error: 'No plan yet.' }, { status: 404 })
  const form = (intake.form_data as Record<string, unknown> | null) || {}
  const swaps = readAlwaysSwaps(form)
  delete swaps[to] // picking B for A undoes an older B→something
  swaps[from] = to
  const { error } = await svc.from('challenge_intake').update({ form_data: { ...form, always_swaps: swaps } }).eq('enrollment_id', enrollment.id)
  if (error) return NextResponse.json({ error: 'Could not save.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
