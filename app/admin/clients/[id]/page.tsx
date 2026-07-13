import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import CoachNotes from '@/components/CoachNotes'

export const dynamic = 'force-dynamic'

function shortDate(s: string | null) {
  if (!s) return ''
  const d = new Date(s)
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`
}

export default async function ClientProfile({ params }: { params: { id: string } }) {
  const { svc } = await requireAdmin(`/admin/clients/${params.id}`)
  const id = params.id

  const { data: enrollment } = await svc.from('challenge_enrollments').select('*').eq('id', id).maybeSingle()
  if (!enrollment) notFound()

  const [{ data: intake }, { data: workout }, { data: nutrition }, { data: checkins }, { data: progress }] = await Promise.all([
    svc.from('challenge_intake').select('*').eq('enrollment_id', id).maybeSingle(),
    svc.from('challenge_workout_plans').select('plan, week_number').eq('enrollment_id', id).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_nutrition_plans').select('calories, protein_g, carbs_g, fats_g').eq('enrollment_id', id).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_checkins').select('*').eq('enrollment_id', id).order('week_number', { ascending: false }),
    svc.from('challenge_progress').select('note, photo_urls, logged_on, measurements').eq('enrollment_id', id),
  ])

  // Sign the private progress photos for display
  const photoPaths = (progress || []).filter((p) => p.note === 'photo').flatMap((p) => (p.photo_urls as string[] | null) || [])
  const photos = (await Promise.all(photoPaths.map(async (path) => {
    const { data } = await svc.storage.from('progress-photos').createSignedUrl(path, 3600)
    return data?.signedUrl || null
  }))).filter(Boolean) as string[]

  const e = enrollment as Record<string, unknown>
  const i = (intake || {}) as Record<string, unknown>
  const name = (e.name as string) || (e.email as string)?.split('@')[0] || 'Client'
  const workoutPlan = workout?.plan as { levelLabel?: string; track?: string; daysPerWeek?: number } | undefined
  const pending = (checkins || []).filter((c) => c.status === 'submitted').length

  const stat = (label: string, value: React.ReactNode) => (
    <div className="bg-obsidian border border-smoke rounded-xl p-3">
      <p className="text-ivory/40 text-[10px] uppercase tracking-wider">{label}</p>
      <p className="text-white font-semibold text-sm mt-0.5">{value || '—'}</p>
    </div>
  )
  const Section = ({ title, children, extra }: { title: string; children: React.ReactNode; extra?: React.ReactNode }) => (
    <section className="bg-charcoal border border-smoke rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white font-bold text-base">{title}</h2>{extra}
      </div>
      {children}
    </section>
  )

  return (
    <div className="min-h-screen bg-obsidian px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-4">
        <Link href="/admin/clients" className="text-ivory/40 text-xs hover:text-gold">← All clients</Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-white">{name}</h1>
            <p className="text-ivory/50 text-sm">{e.email as string}</p>
          </div>
          <div className="flex gap-2">
            <span className="text-[10px] bg-gold/15 text-gold px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold">{(e.tier as string) === 'inner_circle' ? 'Inner Circle' : 'Challenge'}</span>
            <span className="text-[10px] bg-obsidian border border-smoke text-ivory/60 px-2.5 py-1 rounded-full uppercase tracking-wider">{e.status as string}</span>
          </div>
        </div>

        {pending > 0 && (
          <Link href="/admin/checkins" className="block bg-red-500/10 border border-red-500/40 rounded-2xl p-4 text-red-300 text-sm font-semibold hover:bg-red-500/15">
            ⚠ {pending} check-in{pending > 1 ? 's' : ''} waiting for your reply → open the check-in queue
          </Link>
        )}

        <Section title="Coach notes">
          <CoachNotes enrollmentId={id} initial={(e.coach_notes as string) || ''} />
        </Section>

        <Section title="Their stats" extra={<Link href="#" className="text-ivory/30 text-xs">from intake</Link>}>
          {intake ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {stat('Goal', (i.goal as string))}
              {stat('Sex', (i.sex as string))}
              {stat('Age', (i.age as number))}
              {stat('Weight', i.weight_lbs ? `${i.weight_lbs} lbs` : '')}
              {stat('Experience', (i.experience_level as string))}
              {stat('Training', (i.training_location as string))}
              {stat('Activity', (i.activity_level as string))}
              {stat('Budget', i.weekly_food_budget ? `$${i.weekly_food_budget}/wk` : '')}
              {stat('Injuries', (i.injuries_limitations as string) || 'none')}
            </div>
          ) : <p className="text-ivory/40 text-sm">No intake completed yet.</p>}
        </Section>

        <Section title="Current plan">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {stat('Workout', workoutPlan ? `${workoutPlan.levelLabel || ''} ${workoutPlan.track || ''}`.trim() : 'not built')}
            {stat('Calories', nutrition?.calories ? `${nutrition.calories}` : '')}
            {stat('Protein', nutrition?.protein_g ? `${nutrition.protein_g}g` : '')}
            {stat('Days/wk', workoutPlan?.daysPerWeek)}
          </div>
        </Section>

        <Section title={`Check-ins (${(checkins || []).length})`}>
          {(checkins || []).length ? (
            <div className="space-y-2">
              {(checkins || []).map((c) => {
                const m = (c.measurements || {}) as Record<string, unknown>
                return (
                  <div key={c.id as string} className="bg-obsidian border border-smoke rounded-xl p-3">
                    <div className="flex justify-between items-baseline">
                      <p className="text-white text-sm font-semibold">Week {c.week_number as number}{c.weight_lbs ? ` · ${c.weight_lbs} lbs` : ''}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${c.status === 'reviewed' ? 'bg-green-500/15 text-green-400' : 'bg-amber-500/15 text-amber-400'}`}>{c.status as string}</span>
                    </div>
                    <p className="text-ivory/40 text-xs">{shortDate(c.submitted_at as string)}</p>
                    {c.notes ? <p className="text-ivory/70 text-sm mt-1">{c.notes as string}</p> : null}
                    {Object.keys(m).length > 0 && <p className="text-ivory/40 text-xs mt-1">{Object.entries(m).map(([k, v]) => `${k}: ${v}`).join(' · ')}</p>}
                    {c.coach_response ? <p className="text-gold/80 text-xs mt-2">Your reply: {c.coach_response as string}</p> : null}
                  </div>
                )
              })}
            </div>
          ) : <p className="text-ivory/40 text-sm">No check-ins yet.</p>}
        </Section>

        <Section title={`Progress photos (${photos.length})`}>
          {photos.length ? (
            <div className="grid grid-cols-3 gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {photos.map((url, idx) => <img key={idx} src={url} alt={`Progress ${idx + 1}`} className="w-full h-32 object-cover rounded-xl border border-smoke" />)}
            </div>
          ) : <p className="text-ivory/40 text-sm">No photos uploaded yet.</p>}
        </Section>
      </div>
    </div>
  )
}
