import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { compoundExercisesForLevel } from '@/lib/compound-exercises'
import type { Level, Injury } from '@/lib/workout-exercises'
import { localDayNumber } from '@/lib/localdate'
import CompoundDayClient from '@/components/CompoundDayClient'

export const dynamic = 'force-dynamic'

// Optional full-body compound/HIIT day — from Asa's curated screenshot batch
// (2026-07-23). Standalone here, OR swappable in for a regular split day
// (she can just come do this instead any day she wants). Completing it marks
// today's workout done the same as the regular split, so streak/rotation stay intact.
export default async function CompoundDayPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/plan/compound')

  const svc = createServiceClient()
  let { data: enrollment } = await svc.from('challenge_enrollments').select('id').eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc.from('challenge_enrollments').select('id').eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
    enrollment = byEmail || null
  }
  if (!enrollment) redirect('/plan')

  const { data: intake } = await svc.from('challenge_intake').select('experience_level, form_data').eq('enrollment_id', enrollment.id).maybeSingle()
  const level = (intake?.experience_level === 'advanced' ? 3 : intake?.experience_level === 'intermediate' ? 2 : 1) as Level
  const injuries = (Array.isArray((intake?.form_data as { injuries?: Injury[] } | null)?.injuries)
    ? (intake!.form_data as { injuries?: Injury[] }).injuries! : []) as Injury[]

  const pool = compoundExercisesForLevel(level, injuries)
  // Rotate today's 6-move circuit by calendar day so it varies without repeating the same 6 every time.
  const offset = localDayNumber() % pool.length
  const rotated = pool.slice(offset).concat(pool.slice(0, offset))
  const today = rotated.slice(0, 6)

  return (
    <div className="min-h-screen bg-obsidian px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Link href="/plan" className="text-ivory/50 text-sm mb-6 inline-block hover:text-gold transition-colors">← Back to my plan</Link>
        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-1">Optional</p>
        <h1 className="text-3xl font-bold text-white mb-2">Compound &amp; HIIT Full-Body</h1>
        <p className="text-ivory/60 text-sm mb-8">Do this instead of today&apos;s regular session, or anytime you want a full-body burn. Completing it counts as today&apos;s workout either way.</p>
        <CompoundDayClient exercises={today} />
      </div>
    </div>
  )
}
