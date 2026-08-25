import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import NextActionCard from '@/components/NextActionCard'

export const dynamic = 'force-dynamic'

// Prompt 1's home screen — the single-instruction circle, on its own page.
// Deliberately additive: the existing dashboard (/plan) and its other
// screens (workout, nutrition, food log, eating-out) all still exist and
// still work exactly as they did — this is the new zero-decision surface
// that sits in front of them, not a replacement for the app's navigation.
export default async function NextActionPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/plan/next')

  const svc = createServiceClient()
  let { data: enrollment } = await svc.from('challenge_enrollments').select('id, intake_completed').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc.from('challenge_enrollments').select('id, intake_completed').eq('email', user.email).order('created_at', { ascending: false }).limit(1).maybeSingle()
    enrollment = byEmail || null
  }
  if (!enrollment) redirect('/plan')

  return (
    <div className="min-h-[100dvh] px-4 py-8" style={{ background: '#021F16' }}>
      <div className="max-w-lg mx-auto">
        <Link href="/plan" className="inline-flex items-center gap-1.5 bg-charcoal border border-gold/40 text-gold text-sm font-semibold px-4 py-2.5 rounded-full hover:border-gold active:scale-95 transition-all mb-6">← Dashboard</Link>
        <p className="text-[#E5A93C] text-xs font-semibold tracking-[0.25em] uppercase mb-2">Right now</p>
        <h1 className="text-white text-2xl font-bold mb-6">Just this — nothing else to decide.</h1>

        {enrollment.intake_completed ? (
          <NextActionCard />
        ) : (
          <div className="rounded-3xl p-6 text-center" style={{ background: '#0d3a2a', border: '1.5px solid rgba(229,169,60,0.3)' }}>
            <p className="text-white font-semibold mb-2">Let&apos;s build your plan first</p>
            <p className="text-ivory/50 text-sm mb-5">Your next action comes from your real plan — set that up and this fills in on its own.</p>
            <Link href="/plan" className="inline-block bg-gold text-obsidian px-6 py-3 font-bold text-sm uppercase tracking-wider rounded-2xl">Go to dashboard</Link>
          </div>
        )}
      </div>
    </div>
  )
}
