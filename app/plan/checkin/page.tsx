import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import CheckinForm from '@/components/CheckinForm'
import ProgressChart, { type ProgressPoint } from '@/components/ProgressChart'

export const dynamic = 'force-dynamic'

const shortDate = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export default async function CheckinPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/plan/checkin')

  const svc = createServiceClient()
  let { data: enrollment } = await svc
    .from('challenge_enrollments').select('*')
    .eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc
      .from('challenge_enrollments').select('*')
      .eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
    enrollment = byEmail || null
  }
  if (!enrollment) redirect('/plan')

  const firstName = (enrollment.name || user.email?.split('@')[0] || 'there').split(' ')[0]

  const [{ data: checkins }, { data: progress }] = await Promise.all([
    svc.from('challenge_checkins').select('*').eq('enrollment_id', enrollment.id).order('week_number', { ascending: false }),
    svc.from('challenge_progress').select('*').eq('enrollment_id', enrollment.id).order('created_at', { ascending: true }),
  ])

  const points: ProgressPoint[] = (progress || [])
    .filter((p) => p.weight_lbs != null)
    .map((p) => ({ label: shortDate(p.created_at), weight: Number(p.weight_lbs) }))

  return (
    <div className="min-h-screen bg-obsidian px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Link href="/plan" className="text-ivory/40 text-xs hover:text-gold mb-2 inline-block">← Back to my plan</Link>
        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-1">Weekly Check-In</p>
        <h1 className="text-3xl font-bold text-white mb-2">Let&apos;s see where you&apos;re at, {firstName}</h1>
        <p className="text-ivory/60 text-sm mb-8">This is the part that changes everything. Check in with me every week — I read every one myself and adjust your plan around it. Not a PDF, not a bot. Me.</p>

        {points.length >= 2 && (
          <div className="mb-8">
            <h2 className="text-white font-bold text-lg mb-3">Your progress</h2>
            <ProgressChart points={points} />
          </div>
        )}

        <div className="mb-10">
          <h2 className="text-white font-bold text-lg mb-3">This week&apos;s check-in</h2>
          <CheckinForm firstName={firstName} />
        </div>

        {checkins && checkins.length > 0 && (
          <div>
            <h2 className="text-white font-bold text-lg mb-3">Your check-in history</h2>
            <div className="space-y-3">
              {checkins.map((c) => (
                <div key={c.id} className="bg-charcoal border border-smoke rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white font-semibold text-sm">Week {c.week_number}</p>
                    <span className="text-ivory/40 text-xs">{c.weight_lbs ? `${c.weight_lbs} lbs` : ''}{c.submitted_at ? ` · ${shortDate(c.submitted_at)}` : ''}</span>
                  </div>
                  {c.client_notes && <p className="text-ivory/60 text-sm mb-3 italic">&ldquo;{c.client_notes}&rdquo;</p>}
                  {c.coach_response ? (
                    <div className="bg-obsidian border-l-2 border-gold rounded-r-xl p-4">
                      <p className="text-gold text-[10px] uppercase tracking-wider font-semibold mb-1">From Coach Asa</p>
                      <p className="text-ivory/80 text-sm">{c.coach_response}</p>
                    </div>
                  ) : (
                    <p className="text-ivory/40 text-xs">💬 Asa is reviewing this — you&apos;ll get his response here soon.</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
