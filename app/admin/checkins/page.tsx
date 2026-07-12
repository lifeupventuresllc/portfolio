import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import CoachResponse from '@/components/CoachResponse'

export const dynamic = 'force-dynamic'
const shortDate = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

type Enroll = { name: string | null; email: string | null }

export default async function AdminCheckins() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/admin/checkins')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!(profile?.role === 'admin' || profile?.role === 'support')) redirect('/plan')

  const svc = createServiceClient()
  const { data: checkins } = await svc
    .from('challenge_checkins')
    .select('*, challenge_enrollments(name, email)')
    .order('submitted_at', { ascending: false })

  const list = checkins || []
  const pending = list.filter((c) => c.status !== 'reviewed')

  return (
    <div className="min-h-screen bg-obsidian px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-2">Coach Tool</p>
        <h1 className="text-3xl font-bold text-white mb-2">Weekly Check-Ins</h1>
        <p className="text-ivory/50 text-sm mb-8">{pending.length} waiting on your response. Reply and it lands on her dashboard instantly.</p>

        {list.length === 0 && <p className="text-ivory/40 text-sm">No check-ins yet.</p>}

        <div className="space-y-4">
          {list.map((c) => {
            const e = (c.challenge_enrollments || {}) as Enroll
            const m = c.measurements || {}
            const reviewed = c.status === 'reviewed'
            return (
              <div key={c.id} className={`bg-charcoal border rounded-2xl p-5 ${reviewed ? 'border-smoke' : 'border-gold/40'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-white font-semibold text-sm">{e.name || e.email || 'Client'} · Week {c.week_number}</p>
                    <p className="text-ivory/40 text-xs">{c.submitted_at ? shortDate(c.submitted_at) : ''}{c.weight_lbs ? ` · ${c.weight_lbs} lbs` : ''}</p>
                  </div>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold ${reviewed ? 'bg-green-500/15 text-green-400' : 'bg-gold/15 text-gold'}`}>
                    {reviewed ? 'Replied' : 'Needs reply'}
                  </span>
                </div>
                {(m.waist || m.hips || m.thighs || m.arms) && (
                  <p className="text-ivory/50 text-xs mb-2">
                    {[['Waist', m.waist], ['Hips', m.hips], ['Thighs', m.thighs], ['Arms', m.arms]]
                      .filter(([, v]) => v).map(([l, v]) => `${l} ${v}"`).join(' · ')}
                  </p>
                )}
                {c.client_notes && <p className="text-ivory/70 text-sm mb-1 italic">&ldquo;{c.client_notes}&rdquo;</p>}
                <CoachResponse checkinId={c.id} existing={c.coach_response} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
