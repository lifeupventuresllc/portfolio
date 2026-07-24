import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import OperatorChat from '@/components/OperatorChat'

export const dynamic = 'force-dynamic'

// The operator surface (Fitness OS Phase 1) — "Coach Asa, your operator."
export default async function CoachOperator() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/plan/coach')

  const svc = createServiceClient()
  let { data: enrollment } = await svc.from('challenge_enrollments').select('name, email').eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc.from('challenge_enrollments').select('name, email').eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
    enrollment = byEmail || null
  }
  if (!enrollment) redirect('/plan')

  const firstName = (enrollment.name || user.email?.split('@')[0] || 'there').split(' ')[0]

  return (
    <div className="min-h-screen bg-obsidian px-4 py-10">
      <OperatorChat firstName={firstName} />
    </div>
  )
}
