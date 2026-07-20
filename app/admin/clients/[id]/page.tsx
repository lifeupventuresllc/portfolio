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

  const [{ data: intake }, { data: workout }, { data: nutrition }, { data: checkins }, { data: progress }, { data: foodLog }] = await Promise.all([
    svc.from('challenge_intake').select('*').eq('enrollment_id', id).maybeSingle(),
    svc.from('challenge_workout_plans').select('plan, week_number').eq('enrollment_id', id).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_nutrition_plans').select('calories, protein_g, carbs_g, fats_g').eq('enrollment_id', id).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_checkins').select('*').eq('enrollment_id', id).order('week_number', { ascending: false }),
    svc.from('challenge_progress').select('note, photo_urls, logged_on, measurements').eq('enrollment_id', id),
    svc.from('challenge_food_log').select('logged_on, name, calories, protein_g').eq('enrollment_id', id).order('logged_on', { ascending: false }).order('created_at', { ascending: true }).limit(500),
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

  // ── Daily activity: habits (showed up) + food log, day by day ──
  const isoOf = (d: Date) => d.toISOString().slice(0, 10)
  const dailyRows = (progress || []).filter((p) => p.note === '__daily__')
  const showedDates = new Set<string>(dailyRows.map((r) => r.logged_on as string))
  const habitByDate = new Map(dailyRows.map((r) => [r.logged_on as string, (r.measurements || {}) as { workout?: boolean; nutrition?: boolean }]))
  let dailyStreak = 0
  { const cur = new Date(); if (!showedDates.has(isoOf(cur))) cur.setDate(cur.getDate() - 1); while (showedDates.has(isoOf(cur))) { dailyStreak++; cur.setDate(cur.getDate() - 1) } }
  const last14 = Array.from({ length: 14 }, (_, k) => { const d = new Date(); d.setDate(d.getDate() - (13 - k)); const ds = isoOf(d); return { ds, showed: showedDates.has(ds) } })

  const feedbackRows = (progress || [])
    .filter((p) => p.note === '__feedback__')
    .sort((a, b) => (b.logged_on as string).localeCompare(a.logged_on as string))
    .map((p) => ({ ds: p.logged_on as string, ...(p.measurements as { rating?: 'up' | 'down'; text?: string }) }))

  const foodByDay = new Map<string, { items: string[]; cal: number; protein: number }>()
  for (const f of (foodLog || [])) {
    const d = f.logged_on as string
    const cur = foodByDay.get(d) || { items: [], cal: 0, protein: 0 }
    cur.items.push(f.name as string); cur.cal += Number(f.calories) || 0; cur.protein += Number(f.protein_g) || 0
    foodByDay.set(d, cur)
  }
  const calTarget = Number(nutrition?.calories) || 0
  const proteinTarget = Number(nutrition?.protein_g) || 0
  const activeDays = Array.from(new Set<string>(Array.from(showedDates).concat(Array.from(foodByDay.keys())))).sort().reverse().slice(0, 14)
  const weekdayOf = (ds: string) => new Date(ds + 'T00:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short' })

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

        <Section title="Daily activity" extra={<span className="text-gold text-xs font-semibold">🔥 {dailyStreak}-day streak</span>}>
          {/* Last 14 days — did she show up? */}
          <div className="flex items-center justify-between gap-1 mb-4">
            {last14.map((d) => (
              <div key={d.ds} className="flex flex-col items-center gap-1" title={d.ds}>
                <span className={`h-2.5 w-2.5 rounded-full ${d.showed ? 'bg-gold' : 'bg-white/10'}`} />
                <span className="text-ivory/30 text-[8px]">{weekdayOf(d.ds).slice(0, 1)}</span>
              </div>
            ))}
          </div>
          {activeDays.length ? (
            <div className="space-y-2">
              {activeDays.map((ds) => {
                const habit = habitByDate.get(ds)
                const food = foodByDay.get(ds)
                return (
                  <div key={ds} className="bg-obsidian border border-smoke rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-white text-sm font-semibold">{weekdayOf(ds)} {shortDate(ds)}</p>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className={habit?.workout ? '' : 'opacity-25 grayscale'} title="Workout">💪🏽</span>
                        <span className={habit?.nutrition ? '' : 'opacity-25 grayscale'} title="Nutrition">🍽️</span>
                      </div>
                    </div>
                    {food ? (
                      <>
                        <p className="text-ivory/50 text-xs mt-1">
                          {food.cal}{calTarget ? `/${calTarget}` : ''} cal · {food.protein}{proteinTarget ? `/${proteinTarget}` : ''}g protein · {food.items.length} item{food.items.length === 1 ? '' : 's'}
                        </p>
                        <p className="text-ivory/40 text-[11px] mt-1 leading-snug">{food.items.join(' · ')}</p>
                      </>
                    ) : (
                      <p className="text-ivory/30 text-xs mt-1">Showed up — no food logged this day.</p>
                    )}
                  </div>
                )
              })}
            </div>
          ) : <p className="text-ivory/40 text-sm">No daily activity logged yet.</p>}
        </Section>

        {feedbackRows.length > 0 && (
          <Section title={`Feedback (${feedbackRows.length})`}>
            <div className="space-y-2">
              {feedbackRows.map((f, idx) => (
                <div key={idx} className={`rounded-xl p-3 border ${f.rating === 'down' ? 'bg-red-500/[0.06] border-red-500/30' : 'bg-obsidian border-smoke'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{f.rating === 'down' ? '👎' : '👍'}</span>
                    <span className="text-ivory/40 text-xs">{shortDate(f.ds)}</span>
                  </div>
                  {f.text ? <p className="text-ivory/70 text-sm mt-1">{f.text}</p> : null}
                </div>
              ))}
            </div>
          </Section>
        )}

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
