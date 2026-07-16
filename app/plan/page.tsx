import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import WorkoutView from '@/components/WorkoutView'
import WeekPlanView from '@/components/WeekPlanView'
import DailyCheckin from '@/components/DailyCheckin'
import RebuildPlanButton from '@/components/RebuildPlanButton'
import CoachMedia from '@/components/CoachMedia'
import CountUp from '@/components/CountUp'
import ClientMenu from '@/components/ClientMenu'
import { LIVE_CALL } from '@/lib/live-call'
import { affirmationForToday } from '@/lib/affirmations'
import type { WorkoutProgram } from '@/lib/workout'
import type { Level, Injury } from '@/lib/workout-exercises'
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

  const shell = (children: React.ReactNode, menu: React.ReactNode = null) => (
    <div className="min-h-screen bg-obsidian px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-1">Life-Up Fitness</p>
            <h1 className="text-3xl font-bold text-white">Hey {firstName} 👋</h1>
          </div>
          {menu}
        </div>
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

  const [{ data: workoutPlan }, { data: nutritionPlan }, { data: latestCheckin }, { data: intake }, { data: doneRows }] = await Promise.all([
    svc.from('challenge_workout_plans').select('*').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_nutrition_plans').select('*').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle(),
    svc.from('challenge_checkins').select('*').eq('enrollment_id', enrollment.id).order('week_number', { ascending: false }).limit(1).maybeSingle(),
    svc.from('challenge_intake').select('experience_level, form_data').eq('enrollment_id', enrollment.id).maybeSingle(),
    svc.from('challenge_progress').select('measurements').eq('enrollment_id', enrollment.id).eq('note', '__daily__'),
  ])

  // Her real level + injuries — so exercise swaps stay in-system and injury-aware
  const level = (intake?.experience_level === 'advanced' ? 3 : intake?.experience_level === 'intermediate' ? 2 : 1) as Level
  const injuries = (Array.isArray((intake?.form_data as { injuries?: Injury[] })?.injuries)
    ? (intake!.form_data as { injuries?: Injury[] }).injuries! : []) as Injury[]

  const weekPlan = (nutritionPlan?.meals && typeof nutritionPlan.meals === 'object' && 'days' in nutritionPlan.meals)
    ? (nutritionPlan.meals as WeekPlan) : null
  const hasMeals = !!(weekPlan?.days?.length)
  const goalLabel = enrollment.goal === 'gain' ? 'Build & tone' : enrollment.goal === 'maintain' ? 'Maintain' : 'Lose fat'

  // ── TODAY at a glance — powers the simple home dashboard (workout · calories · meals) ──
  const now = new Date()
  const mealIdx = (now.getDay() + 6) % 7 // Mon=0 … Sat=5, Sun=6
  const todayMeals = weekPlan && mealIdx <= 5 ? weekPlan.days[mealIdx] : null
  const calBudget = (todayMeals?.target && todayMeals.target > 0) ? todayMeals.target : (Number(nutritionPlan?.calories) || 0)
  const todayDayType = todayMeals?.dayType ?? null

  const program = (workoutPlan?.plan as WorkoutProgram) || null
  let todayWorkout: { title: string; muscles?: string[] } | null = null
  if (program) {
    const numDays = program.track === 'home' ? (program.home?.days.length || 1) : (program.gymDays?.length || 1)
    const completed = (doneRows || []).filter((r) => (r.measurements as { workout?: boolean } | null)?.workout).length
    const startDay = numDays > 0 ? completed % numDays : 0
    if (program.track === 'home') {
      const d = program.home?.days[startDay]
      if (d) todayWorkout = { title: d.title }
    } else {
      const d = program.gymDays?.[startDay]
      if (d) todayWorkout = { title: d.title, muscles: d.muscles }
    }
  }
  const affirmation = affirmationForToday()

  return shell(
    <div className="space-y-8">
      {/* ── SIMPLE HOME DASHBOARD ── daily self-talk + 3 bubbly boxes: workout · calories · meals */}
      {/* Daily affirmation / self-talk */}
      <div className="bg-emerald-500/10 border border-emerald-400/25 rounded-3xl px-5 py-4 flex items-start gap-3">
        <span className="text-xl mt-0.5">💚</span>
        <div>
          <p className="text-emerald-300/80 text-[10px] uppercase tracking-wider font-semibold mb-0.5">Today’s reminder</p>
          <p className="text-white text-sm leading-snug font-medium">{affirmation}</p>
        </div>
      </div>

      {/* 1 — Today's workout (bubbly hero box) */}
      <Link href="/plan/workout" className="group block bg-gradient-to-br from-gold/20 to-charcoal border border-gold/40 rounded-[2rem] p-6 hover:border-gold/70 hover:-translate-y-0.5 transition-all">
        <p className="text-gold text-[10px] uppercase tracking-wider font-semibold mb-1">Today’s workout 💪🏽</p>
        {todayWorkout ? (
          <>
            <p className="text-white font-bold text-xl leading-tight">{todayWorkout.title}</p>
            {todayWorkout.muscles?.length ? <p className="text-ivory/50 text-xs mt-1">{todayWorkout.muscles.join(' · ')}</p> : null}
            <span className="luf-pulse mt-4 inline-flex items-center gap-1.5 bg-gold text-obsidian px-5 py-2.5 font-bold text-xs uppercase tracking-wider rounded-2xl group-hover:scale-[1.03] transition-transform">▶ Start session</span>
          </>
        ) : (
          <p className="text-ivory/60 text-sm mt-1">Your workout is being prepared — refresh in a moment.</p>
        )}
      </Link>

      {/* 2 & 3 — Calories (money budget) + Today's meals */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/plan/today" className="group bg-charcoal border border-smoke rounded-[2rem] p-5 flex flex-col hover:border-gold/50 hover:-translate-y-0.5 transition-all">
          <p className="text-gold text-[10px] uppercase tracking-wider font-semibold mb-1">Today’s calories 💵</p>
          <p className="text-gold font-bold text-3xl leading-none">${calBudget}</p>
          <p className="text-ivory/40 text-[11px] mt-1">your budget to spend</p>
          {todayDayType && <span className={`mt-3 self-start text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${todayDayType === 'workout' ? 'bg-gold/15 text-gold' : 'bg-white/8 text-ivory/60'}`}>{todayDayType === 'workout' ? '💪🏽 Workout day' : '🌿 Rest day'}</span>}
          <span className="text-ivory/40 text-[11px] mt-auto pt-3 group-hover:text-gold transition-colors">Track / log →</span>
        </Link>

        <Link href="/plan/today" className="group bg-charcoal border border-smoke rounded-[2rem] p-5 flex flex-col hover:border-gold/50 hover:-translate-y-0.5 transition-all">
          <p className="text-gold text-[10px] uppercase tracking-wider font-semibold mb-1">Today’s meals 🍽️</p>
          {todayMeals ? (
            <>
              <p className="text-white font-bold text-lg leading-tight">{todayMeals.meals.length} meals</p>
              <p className="text-ivory/40 text-[11px] mt-1">{todayMeals.totalProtein}g protein planned</p>
              <div className="mt-2 space-y-0.5">
                {todayMeals.meals.slice(0, 3).map((m, i) => (
                  <p key={i} className="text-ivory/60 text-[11px] truncate">• {m.name}</p>
                ))}
              </div>
            </>
          ) : hasMeals ? (
            <p className="text-ivory/60 text-sm mt-1">Recovery day 🌿 — eat mindful.</p>
          ) : (
            <p className="text-ivory/60 text-sm mt-1">Tap to build this week’s meals.</p>
          )}
          <span className="text-ivory/40 text-[11px] mt-auto pt-3 group-hover:text-gold transition-colors">See today →</span>
        </Link>
      </div>

      {/* Daily accountability + live call — the "I'm with you" touchpoints */}
      <section className="grid sm:grid-cols-2 gap-3">
        <DailyCheckin />
        {LIVE_CALL.zoomUrl ? (
          <a href={LIVE_CALL.zoomUrl} target="_blank" rel="noopener noreferrer" className="group bg-charcoal border border-gold/30 rounded-2xl p-5 flex flex-col cursor-pointer transition-all hover:border-gold/60 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(201,168,76,.18)]">
            <p className="text-gold text-[10px] uppercase tracking-wider font-semibold mb-1">Live with me</p>
            <p className="text-white font-semibold text-sm">{LIVE_CALL.title}</p>
            <p className="text-ivory/50 text-xs mt-0.5 mb-2">{LIVE_CALL.whenLabel}</p>
            <p className="text-ivory/50 text-xs flex-1">{LIVE_CALL.blurb}</p>
            <span className="mt-3 inline-block bg-gold text-obsidian px-5 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl text-center group-hover:scale-[1.02] transition-transform">Join the call →</span>
          </a>
        ) : (
          <div className="bg-charcoal border border-gold/30 rounded-2xl p-5 flex flex-col">
            <p className="text-gold text-[10px] uppercase tracking-wider font-semibold mb-1">Live with me</p>
            <p className="text-white font-semibold text-sm">{LIVE_CALL.title}</p>
            <p className="text-ivory/50 text-xs mt-0.5 mb-2">{LIVE_CALL.whenLabel}</p>
            <p className="text-ivory/50 text-xs flex-1">{LIVE_CALL.blurb}</p>
            <p className="text-ivory/30 text-xs mt-3">Your call link drops here before we go live.</p>
          </div>
        )}
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
          {workoutPlan?.plan && <Link href="/plan/workout" className="luf-pulse inline-flex items-center gap-1.5 bg-gold text-obsidian px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-xl hover:scale-[1.03] transition-transform">▶ Start session</Link>}
        </div>
        {workoutPlan?.plan && <div className="mb-3"><RebuildPlanButton /></div>}
        {workoutPlan?.plan ? (
          <WorkoutView program={workoutPlan.plan as WorkoutProgram} editable level={level} injuries={injuries} />
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
            <Link href="/plan/checkin" className="luf-pulse inline-block bg-gold text-obsidian px-6 py-3 font-bold text-xs uppercase tracking-wider rounded-xl">Do my check-in</Link>
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
          <Link href="/plan/library" className="block bg-charcoal border border-smoke rounded-2xl p-4 hover:border-gold/50 transition-colors">
            <p className="text-white font-semibold text-sm">The Cookbook 📖</p>
            <p className="text-ivory/50 text-xs mt-1">Every recipe + every move, searchable</p>
          </Link>
          <Link href="/plan/achievements" className="block bg-charcoal border border-smoke rounded-2xl p-4 hover:border-gold/50 transition-colors sm:col-span-2">
            <p className="text-white font-semibold text-sm">Your badges 🏅</p>
            <p className="text-ivory/50 text-xs mt-1">Every milestone you hit — I&apos;m keeping track of your work</p>
          </Link>
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
    </div>,
    <ClientMenu key="menu" firstName={firstName} liveUrl={LIVE_CALL.zoomUrl || undefined} innerCircle={enrollment.tier === 'inner_circle'} />
  )
}
