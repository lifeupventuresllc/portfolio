import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import WorkoutView from '@/components/WorkoutView'
import WeekPlanView from '@/components/WeekPlanView'
import DailyCheckin from '@/components/DailyCheckin'
import CoachMedia from '@/components/CoachMedia'
import CountUp from '@/components/CountUp'
import { LIVE_CALL } from '@/lib/live-call'
import type { WorkoutProgram } from '@/lib/workout'
import type { WeekPlan } from '@/lib/meal-plan'

export const dynamic = 'force-dynamic'

export default async function PlanDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/plan')

  const svc = createServiceClient()

  // Find this member's enrollment (by account, then by email for guest purchases)
  let { data: enrollment } = await svc
    .from('challenge_enrollments')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .maybeSingle()

  if (!enrollment && user.email) {
    const { data: byEmail } = await svc
      .from('challenge_enrollments')
      .select('*')
      .eq('email', user.email)
      .order('created_at', { ascending: false })
      .maybeSingle()
    if (byEmail) {
      if (!byEmail.user_id) await svc.from('challenge_enrollments').update({ user_id: user.id }).eq('id', byEmail.id)
      enrollment = byEmail
    }
  }

  const firstName = (enrollment?.name || user.email?.split('@')[0] || 'there').split(' ')[0]

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-obsidian px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-1">Life-Up Fitness</p>
        <h1 className="text-3xl font-bold text-white mb-8">Hey {firstName} 👋</h1>
        {children}
      </div>
    </div>
  )

  // Not enrolled
  if (!enrollment) {
    return shell(
      <div className="bg-charcoal border border-smoke rounded-3xl p-8 text-center">
        <p className="text-white font-semibold mb-2">You&apos;re not enrolled yet</p>
        <p className="text-ivory/50 text-sm mb-6">Join the Snatched Without Starving challenge to unlock your custom plan.</p>
        <Link href="/challenge" className="inline-block bg-gold text-obsidian px-8 py-3.5 font-bold text-sm uppercase tracking-wider rounded-2xl">See the challenge</Link>
      </div>
    )
  }

  // Enrolled but hasn't done intake
  if (!enrollment.intake_completed) {
    return shell(
      <div className="bg-charcoal border border-gold/30 rounded-3xl p-8 text-center">
        <p className="text-white font-semibold mb-2">One step to unlock your plan</p>
        <p className="text-ivory/50 text-sm mb-6">Tell us your stats and goals — we&apos;ll generate your custom workout and calorie-matched meal plan in seconds.</p>
        <Link href="/plan/intake" className="inline-block bg-gold text-obsidian px-8 py-3.5 font-bold text-sm uppercase tracking-wider rounded-2xl">Build my plan</Link>
      </div>
    )
  }

  const [{ data: workoutPlan }, { data: nutritionPlan }, { data: latestCheckin }] = await Promise.all([
    svc.from('challenge_workout_plans').select('*').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_nutrition_plans').select('*').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_checkins').select('*').eq('enrollment_id', enrollment.id).order('week_number', { ascending: false }).limit(1).maybeSingle(),
  ])

  const weekPlan = (nutritionPlan?.meals && typeof nutritionPlan.meals === 'object' && 'days' in nutritionPlan.meals)
    ? (nutritionPlan.meals as WeekPlan) : null
  const hasMeals = !!(weekPlan?.days?.length)
  const goalLabel = enrollment.goal === 'gain' ? 'Build & tone' : enrollment.goal === 'maintain' ? 'Maintain' : 'Lose fat'

  return shell(
    <div className="space-y-8">
      {/* Daily accountability + live call — the "I'm with you" touchpoints */}
      <section className="grid sm:grid-cols-2 gap-3">
        <DailyCheckin />
        <div className="bg-charcoal border border-gold/30 rounded-2xl p-5 flex flex-col">
          <p className="text-gold text-[10px] uppercase tracking-wider font-semibold mb-1">Live with me</p>
          <p className="text-white font-semibold text-sm">{LIVE_CALL.title}</p>
          <p className="text-ivory/50 text-xs mt-0.5 mb-2">{LIVE_CALL.whenLabel}</p>
          <p className="text-ivory/50 text-xs flex-1">{LIVE_CALL.blurb}</p>
          {LIVE_CALL.zoomUrl ? (
            <a href={LIVE_CALL.zoomUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block bg-gold text-obsidian px-5 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl text-center">Join the call</a>
          ) : (
            <p className="text-ivory/30 text-xs mt-3">Your call link drops here before we go live.</p>
          )}
        </div>
      </section>

      {/* Targets */}
      {nutritionPlan && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold text-lg">Your daily targets</h2>
            <span className="text-[10px] bg-gold/15 text-gold px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold">{goalLabel}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { l: 'Calories', v: Number(nutritionPlan.calories) || 0, s: '', c: 'text-gold' },
              { l: 'Protein', v: Number(nutritionPlan.protein_g) || 0, s: 'g', c: 'text-green-400' },
              { l: 'Carbs', v: Number(nutritionPlan.carbs_g) || 0, s: 'g', c: 'text-white' },
              { l: 'Fats', v: Number(nutritionPlan.fats_g) || 0, s: 'g', c: 'text-white' },
            ].map((t) => (
              <div key={t.l} className="bg-charcoal border border-smoke rounded-2xl p-4 transition-transform hover:-translate-y-0.5">
                <p className="text-ivory/40 text-xs uppercase tracking-wider mb-1">{t.l}</p>
                <p className={`text-xl font-bold ${t.c}`}><CountUp value={t.v} suffix={t.s} /></p>
              </div>
            ))}
          </div>
          <Link href="/plan/intake" className="text-ivory/40 text-xs hover:text-gold mt-2 inline-block">Update my stats →</Link>
        </section>
      )}

      {/* Meals */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-bold text-lg">What to eat this week</h2>
          {hasMeals && <Link href="/plan/meals" className="text-ivory/40 text-xs hover:text-gold">Edit my meals →</Link>}
        </div>
        {hasMeals && weekPlan ? (
          <WeekPlanView plan={weekPlan} />
        ) : (
          <div className="bg-charcoal border border-gold/30 rounded-2xl p-6 text-center">
            <p className="text-white font-semibold mb-1">Build this week&apos;s meals</p>
            <p className="text-ivory/50 text-sm mb-4">Pick meals you love from the cookbook or grab fast-food options — we&apos;ll portion everything to your calories.</p>
            <Link href="/plan/meals" className="luf-glow inline-block bg-gold text-obsidian px-6 py-3 font-bold text-xs uppercase tracking-wider rounded-xl">Build my meals</Link>
          </div>
        )}
      </section>

      {/* Workout */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-bold text-lg">Your training this week</h2>
          {workoutPlan?.plan && <Link href="/plan/workout" className="inline-flex items-center gap-1.5 bg-gold text-obsidian px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-xl hover:scale-[1.03] transition-transform">▶ Start session</Link>}
        </div>
        {workoutPlan?.plan ? (
          <WorkoutView program={workoutPlan.plan as WorkoutProgram} />
        ) : (
          <p className="text-ivory/50 text-sm">Your workout is being prepared. Refresh in a moment.</p>
        )}
      </section>

      {/* Weekly check-in with Coach Asa */}
      <section>
        <h2 className="text-white font-bold text-lg mb-3">Your check-in with me</h2>
        {latestCheckin?.coach_response || latestCheckin?.coach_media_url ? (
          <div className="bg-charcoal border border-gold/30 rounded-2xl p-5">
            <p className="text-gold text-[10px] uppercase tracking-wider font-semibold mb-1">Latest from Coach Asa · Week {latestCheckin.week_number}</p>
            {latestCheckin.coach_response && <p className="text-ivory/80 text-sm mb-2">{latestCheckin.coach_response}</p>}
            <CoachMedia url={latestCheckin.coach_media_url} />
            <div className="mt-4"><Link href="/plan/checkin" className="inline-block bg-gold text-obsidian px-6 py-3 font-bold text-xs uppercase tracking-wider rounded-xl">Check in for this week</Link></div>
          </div>
        ) : latestCheckin ? (
          <div className="bg-charcoal border border-smoke rounded-2xl p-5">
            <p className="text-white text-sm font-semibold mb-1">Got your Week {latestCheckin.week_number} check-in ✅</p>
            <p className="text-ivory/50 text-sm mb-4">I&apos;m reviewing it personally — your response and adjustments land here soon.</p>
            <Link href="/plan/checkin" className="text-ivory/40 text-xs hover:text-gold">View my check-ins →</Link>
          </div>
        ) : (
          <div className="luf-float bg-charcoal border border-gold/30 rounded-2xl p-6 text-center">
            <p className="text-white font-semibold mb-1">Let&apos;s check in, {firstName}</p>
            <p className="text-ivory/50 text-sm mb-4">Every week you check in with me and I adjust your plan around your real progress. This is the part that gets you results — not a PDF, not a bot. Me.</p>
            <Link href="/plan/checkin" className="inline-block bg-gold text-obsidian px-6 py-3 font-bold text-xs uppercase tracking-wider rounded-xl">Do my check-in</Link>
          </div>
        )}
      </section>

      {/* Your extras — the offer bonuses */}
      <section>
        <h2 className="text-white font-bold text-lg mb-3">Your extras</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Link href="/plan/jumpstart" className="block bg-charcoal border border-smoke rounded-2xl p-4 hover:border-gold/50 transition-colors">
            <p className="text-white font-semibold text-sm">7-Day Jump Start ⚡</p>
            <p className="text-ivory/50 text-xs mt-1">Quick wins for your first week</p>
          </Link>
          <Link href="/plan/reset" className="block bg-charcoal border border-smoke rounded-2xl p-4 hover:border-gold/50 transition-colors">
            <p className="text-white font-semibold text-sm">21-Day Habit Reset 🔁</p>
            <p className="text-ivory/50 text-xs mt-1">Make it stick for good</p>
          </Link>
          <Link href="/plan/community" className="block bg-charcoal border border-smoke rounded-2xl p-4 hover:border-gold/50 transition-colors">
            <p className="text-white font-semibold text-sm">The Curve Collective 💛</p>
            <p className="text-ivory/50 text-xs mt-1">Your private community</p>
          </Link>
          <a href="/the-menu.html" target="_blank" rel="noopener noreferrer" className="block bg-charcoal border border-smoke rounded-2xl p-4 hover:border-gold/50 transition-colors">
            <p className="text-white font-semibold text-sm">The Menu Cookbook 📖</p>
            <p className="text-ivory/50 text-xs mt-1">Every recipe, browsable</p>
          </a>
        </div>
        {enrollment.tier === 'inner_circle' && (
          <div className="bg-charcoal border border-gold/40 rounded-2xl p-5 mt-3">
            <p className="text-gold text-[10px] uppercase tracking-wider font-semibold mb-1">Inner Circle</p>
            <p className="text-white font-semibold text-sm mb-1">Your 1:1 with me</p>
            <p className="text-ivory/50 text-sm mb-3">You&apos;ve got direct time with me, {firstName} — book a call whenever you want eyes on your plan.</p>
            <Link href="/book" className="inline-block bg-gold text-obsidian px-6 py-3 font-bold text-xs uppercase tracking-wider rounded-xl">Book my 1:1</Link>
          </div>
        )}
      </section>
    </div>
  )
}
