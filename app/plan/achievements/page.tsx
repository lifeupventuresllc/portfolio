import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { computeBadges, earnedCount, nextUp, CHALLENGE_DAYS, type BadgeState } from '@/lib/achievements'
import type { WeekPlan } from '@/lib/meal-plan'

export const dynamic = 'force-dynamic'

const iso = (d: Date) => d.toISOString().slice(0, 10)

// Streak-insurance: one missed day anywhere in the streak doesn't zero it out — the
// count skips over that single gap. A second gap ends the streak. Mirrors the same
// rule in app/api/plan/daily/route.ts so the number matches everywhere it's shown.
function streakFrom(dates: Set<string>): number {
  let streak = 0
  const cur = new Date()
  if (!dates.has(iso(cur))) cur.setDate(cur.getDate() - 1) // grace: holds through yesterday
  let graceUsed = false
  for (;;) {
    if (dates.has(iso(cur))) { streak++; cur.setDate(cur.getDate() - 1); continue }
    if (!graceUsed) { graceUsed = true; cur.setDate(cur.getDate() - 1); continue }
    break
  }
  return streak
}

export default async function Achievements() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/plan/achievements')
  const svc = createServiceClient()

  let { data: enrollment } = await svc.from('challenge_enrollments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc.from('challenge_enrollments').select('*').eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
    enrollment = byEmail || null
  }
  if (!enrollment) redirect('/plan')
  const firstName = ((enrollment.name as string) || 'there').split(' ')[0]

  // Pull her real activity — everything a badge needs, in parallel.
  const [dailyRes, checkinRes, nutritionRes] = await Promise.all([
    svc.from('challenge_progress').select('logged_on, measurements, note').eq('enrollment_id', enrollment.id),
    svc.from('challenge_checkins').select('id', { count: 'exact', head: true }).eq('enrollment_id', enrollment.id),
    svc.from('challenge_nutrition_plans').select('meals').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle(),
  ])

  const rows = dailyRes.data || []
  const dailyRows = rows.filter((r) => r.note === '__daily__')
  const dates = new Set<string>(dailyRows.map((r) => r.logged_on as string).filter(Boolean))
  const workoutsDone = dailyRows.filter((r) => (r.measurements as { workout?: boolean } | null)?.workout).length
  const photos = rows.filter((r) => r.note === 'photo').length

  const meals = nutritionRes.data?.meals as WeekPlan | null | undefined
  const mealPlanBuilt = !!(meals && typeof meals === 'object' && 'days' in meals && meals.days?.length)

  const created = new Date(enrollment.created_at as string)
  const daysEnrolled = Math.max(1, Math.floor((Date.now() - created.getTime()) / 86400000) + 1)

  const state: BadgeState = {
    streak: streakFrom(dates),
    daysShowedUp: dates.size,
    workoutsDone,
    checkins: checkinRes.count || 0,
    photos,
    mealPlanBuilt,
    daysEnrolled,
  }

  const badges = computeBadges(state)
  const earned = earnedCount(badges)
  const upcoming = nextUp(badges, 3)
  const challengeDay = Math.min(daysEnrolled, CHALLENGE_DAYS)
  const challengePct = Math.round((challengeDay / CHALLENGE_DAYS) * 100)

  return (
    <div className="min-h-screen bg-obsidian px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <Link href="/plan" className="inline-flex items-center gap-1.5 bg-charcoal border border-gold/40 text-gold text-sm font-semibold px-4 py-2.5 rounded-full hover:border-gold hover:bg-gold/10 active:scale-95 transition-all mb-4">← Back to my plan</Link>
        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-1">Your Challenge</p>
        <h1 className="text-3xl font-bold text-white mb-2">Look how far you&apos;ve come, {firstName} 🏅</h1>
        <p className="text-ivory/50 text-sm mb-7">Every badge here is something you actually did — I&apos;m keeping track of your work, {firstName}. Keep stacking them.</p>

        {/* Challenge progress + earned count */}
        <div className="bg-charcoal border border-gold/30 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white font-semibold text-sm">Day {challengeDay} of {CHALLENGE_DAYS}</p>
            <p className="text-gold font-bold text-sm">{earned}<span className="text-ivory/40 font-normal">/{badges.length} badges</span></p>
          </div>
          <div className="h-2.5 rounded-full bg-obsidian overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-gold/70 to-gold transition-all" style={{ width: `${challengePct}%` }} />
          </div>
          <p className="text-ivory/40 text-xs mt-2">
            {challengeDay >= CHALLENGE_DAYS ? 'You reached the finish line — six full weeks. Incredible.' : `${CHALLENGE_DAYS - challengeDay} days left in your 6-week challenge. I’m with you the whole way.`}
          </p>
        </div>

        {/* Next up */}
        {upcoming.length > 0 && (
          <section className="mb-7">
            <h2 className="text-white font-bold text-lg mb-3">Next up 🎯</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {upcoming.map((b) => {
                const pct = Math.round((b.current / b.goal) * 100)
                return (
                  <div key={b.id} className="bg-charcoal border border-smoke rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xl opacity-60 grayscale">{b.icon}</span>
                      <span className="text-white font-semibold text-sm">{b.title}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-obsidian overflow-hidden mb-1.5">
                      <div className="h-full rounded-full bg-gold/80" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-ivory/40 text-[11px]">{b.current} / {b.goal} · {b.blurb}</p>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* All badges */}
        <h2 className="text-white font-bold text-lg mb-3">Your badges</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {badges.map((b) => (
            <div key={b.id}
              className={`rounded-2xl p-4 border transition-transform ${b.earned ? 'luf-glow bg-charcoal border-gold/40 hover:-translate-y-0.5' : 'bg-charcoal/60 border-smoke'}`}>
              <div className="flex items-start justify-between mb-2">
                <span className={`text-3xl ${b.earned ? '' : 'opacity-30 grayscale'}`}>{b.icon}</span>
                {b.earned
                  ? <span className="text-[9px] bg-gold/15 text-gold px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">Earned</span>
                  : <span className="text-[9px] bg-white/5 text-ivory/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">Locked</span>}
              </div>
              <p className={`font-semibold text-sm mb-1 ${b.earned ? 'text-white' : 'text-ivory/50'}`}>{b.title}</p>
              <p className={`text-[11px] leading-snug ${b.earned ? 'text-gold/80' : 'text-ivory/35'}`}>{b.blurb}</p>
              {!b.earned && b.goal > 1 && (
                <p className="text-ivory/25 text-[10px] mt-1.5 font-mono">{b.current}/{b.goal}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
