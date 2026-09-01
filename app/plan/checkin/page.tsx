import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import CheckinForm from '@/components/CheckinForm'
import ProgressChart, { type ProgressPoint } from '@/components/ProgressChart'
import CoachMedia from '@/components/CoachMedia'
import PhotoUpload from '@/components/PhotoUpload'
import { localDateISO, addDaysISO } from '@/lib/localdate'

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

  // This week's eating, at a glance — so logging (done on /plan/today) visibly adds up
  // here too, not just on the single day it happened. Peace of mind: "it's all being tracked."
  const todayIso = localDateISO()
  const weekAgoIso = addDaysISO(todayIso, -6)
  const { data: foodRows } = await svc.from('challenge_food_log')
    .select('logged_on, calories, protein_g').eq('enrollment_id', enrollment.id).gte('logged_on', weekAgoIso)
  const foodByDay = new Map<string, { cal: number; protein: number }>()
  for (const r of (foodRows || [])) {
    const day = r.logged_on as string
    const cur = foodByDay.get(day) || { cal: 0, protein: 0 }
    cur.cal += Number(r.calories) || 0
    cur.protein += Number(r.protein_g) || 0
    foodByDay.set(day, cur)
  }
  const weekDays = Array.from({ length: 7 }, (_, i) => addDaysISO(weekAgoIso, i))
  const anyLogged = weekDays.some((d) => foodByDay.has(d))

  // progress photos → private signed URLs
  const { data: photoRows } = await svc.from('challenge_progress')
    .select('created_at, photo_urls').eq('enrollment_id', enrollment.id).eq('note', 'photo')
    .order('created_at', { ascending: false }).limit(24)
  const photos = ((await Promise.all((photoRows || []).flatMap((r) =>
    (r.photo_urls || []).map(async (p: string) => {
      const { data } = await svc.storage.from('progress-photos').createSignedUrl(p, 3600)
      return data?.signedUrl ? { url: data.signedUrl, date: shortDate(r.created_at) } : null
    })
  ))).filter(Boolean)) as { url: string; date: string }[]

  return (
    <div className="min-h-[100dvh] bg-obsidian px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Link href="/plan" className="inline-flex items-center gap-1.5 bg-charcoal border border-gold/40 text-gold text-sm font-semibold px-4 py-2.5 rounded-full hover:border-gold hover:bg-gold/10 active:scale-95 transition-all mb-4">← Home</Link>
        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-1">Weekly Check-In</p>
        <h1 className="text-3xl font-bold text-white mb-2">Let&apos;s see where you&apos;re at, {firstName}</h1>
        <p className="text-ivory/60 text-sm mb-8">This is the part that changes everything. Check in with me every week — I read every one myself and adjust your plan around it. Not a PDF, not a bot. Me.</p>

        {points.length >= 2 && (
          <div className="mb-8">
            <h2 className="text-white font-bold text-lg mb-3">Your progress</h2>
            <ProgressChart points={points} />
          </div>
        )}

        {anyLogged && (
          <div className="mb-8">
            <h2 className="text-white font-bold text-lg mb-3">This week&apos;s eating</h2>
            <div className="bg-charcoal border border-smoke rounded-2xl p-5 grid grid-cols-7 gap-2">
              {weekDays.map((d) => {
                const w = foodByDay.get(d)
                const label = new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })
                return (
                  <div key={d} className="text-center">
                    <p className="text-ivory/40 text-[9px] uppercase tracking-wider mb-1">{label}</p>
                    {w ? (
                      <>
                        <p className="text-gold text-xs font-bold">{w.cal}</p>
                        <p className="text-green-400 text-[10px]">{w.protein}g P</p>
                      </>
                    ) : (
                      <p className="text-ivory/25 text-xs">—</p>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="text-ivory/50 text-xs mt-2">Every meal you log shows up here — it&apos;s all being tracked, week over week.</p>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-white font-bold text-lg mb-3">Your progress photos</h2>
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {photos.map((p, idx) => (
                <div key={idx} className="relative aspect-[3/4] rounded-xl overflow-hidden border border-smoke">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={`Progress ${p.date}`} className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 left-1 text-[9px] bg-obsidian/80 text-ivory/80 px-1.5 py-0.5 rounded">{p.date}</span>
                </div>
              ))}
            </div>
          )}
          <PhotoUpload />
          <p className="text-ivory/50 text-xs mt-2">Private to you and me. Same pose, same light, once a week — the scale lies, these don&apos;t.</p>
        </div>

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
                  {c.coach_response || c.coach_media_url ? (
                    <div className="bg-obsidian border-l-2 border-gold rounded-r-xl p-4">
                      <p className="text-gold text-[10px] uppercase tracking-wider font-semibold mb-1">From Coach</p>
                      {c.coach_response && <p className="text-ivory/80 text-sm">{c.coach_response}</p>}
                      <CoachMedia url={c.coach_media_url} />
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
