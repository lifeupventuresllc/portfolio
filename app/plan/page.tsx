import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import ClientMenu from '@/components/ClientMenu'
import StreakChip from '@/components/StreakChip'
import GoalProgressBar from '@/components/GoalProgressBar'
import VerifyEmailBanner from '@/components/VerifyEmailBanner'
import AnonymousSessionBanner from '@/components/AnonymousSessionBanner'
import TimezoneSync from '@/components/TimezoneSync'
import NextActionCard from '@/components/NextActionCard'
import { LIVE_CALL } from '@/lib/live-call'
import { affirmationForDay } from '@/lib/affirmations'
import { localDateISO, localDayNumber, addDaysISO } from '@/lib/localdate'

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

  const shell = (children: React.ReactNode, menu: React.ReactNode = null, selfTalk?: string) => (
    <div className="min-h-[100dvh] px-4 py-6" style={{ background: '#021F16' }}>
      <TimezoneSync />
      <div className="max-w-3xl mx-auto">
        {user.is_anonymous ? <AnonymousSessionBanner /> : (!user.email_confirmed_at && user.email && <VerifyEmailBanner email={user.email} />)}
        <div className="flex items-center justify-between mb-4 px-1 pt-2">
          <p className="text-[#E5A93C] text-xs font-semibold tracking-[0.25em] uppercase">Life-Up Fitness</p>
          <div className="flex items-center gap-2">
            {/* Real fix, live feedback (beta feedback Priority 1, 2026-08-25):
                seeing an icon isn't the same as understanding what it does —
                and the first version reopened the FULL intake wizard
                starting at "what's your name," re-asking things that rarely
                change before ever reaching goal/style, the two things she
                actually asked to update. Links straight to /plan/preferences
                now: goal + focus + workout style ONLY, nothing else re-asked,
                with an unmistakable headline the moment it opens ("What do
                you want to work on?") so what just happened is obvious
                without needing the icon alone to explain it. */}
            <Link href="/plan/preferences" aria-label="Update your goals and workout style" title="Update your goals and workout style" className="h-10 w-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center hover:border-gold/60 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EDE7DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
              </svg>
            </Link>
            {menu}
          </div>
        </div>

        <div
          className="rounded-3xl p-5 mb-5"
          style={{
            background: 'linear-gradient(135deg, #0d3a2a, #044A34 60%, #08281d)',
            border: '1.5px solid #E5A93C',
            boxShadow: '0 0 20px -6px rgba(229,169,60,0.35)',
          }}
        >
          <h1 className="font-bold text-white leading-[1.02] tracking-tight mb-1" style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif', fontSize: 'clamp(2rem, 7vw, 2.5rem)' }}>Hey {firstName}</h1>
          <div className="mb-2"><StreakChip /></div>
          {selfTalk && (
            <>
              <p className="text-[#E5A93C] text-[9px] uppercase tracking-[0.22em] font-bold mb-1">Today&apos;s self-talk</p>
              <p className="text-white text-[15px] leading-snug italic text-balance">&ldquo;{selfTalk}&rdquo;</p>
            </>
          )}
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

  // Enrolled but hasn't done intake — the real dashboard renders anyway, fully
  // unlocked (Coach Asa, feedback, the menu — everything works, nothing is
  // gated behind a wall or a question). Only the cards that genuinely need real
  // plan numbers show a build-prompt in their place instead of fabricated
  // zeros; see hasPlan below. She can start from any feature — clicking Coach
  // Asa or a feature card builds the real plan via the cold-start flow, and
  // this same page then renders normally on her next visit.
  const hasPlan = !!enrollment.intake_completed

  const todayIso = localDateISO()
  const consistencyWindowStart = addDaysISO(todayIso, -13) // 14 days incl. today, ~2 weeks
  const [{ data: doneRows }, { data: intakeRow }, { data: latestCheckin }, { data: foodLogRows }] = hasPlan
    ? await Promise.all([
        svc.from('challenge_progress').select('logged_on, measurements').eq('enrollment_id', enrollment.id).eq('note', '__daily__'),
        svc.from('challenge_intake').select('weight_lbs, target_lbs, goal, days_per_week, form_data').eq('enrollment_id', enrollment.id).maybeSingle(),
        svc.from('challenge_checkins').select('weight_lbs, submitted_at').eq('enrollment_id', enrollment.id).not('weight_lbs', 'is', null).order('submitted_at', { ascending: false }).limit(1).maybeSingle(),
        svc.from('challenge_food_log').select('logged_on').eq('enrollment_id', enrollment.id).gte('logged_on', consistencyWindowStart),
      ])
    : [{ data: null }, { data: null }, { data: null }, { data: null }] as const

  const affirmation = affirmationForDay(localDayNumber())

  // Real gap found+fixed same session as the calorie-target one: Quickstart
  // (app/api/plan/quickstart-workout) writes a real challenge_intake row with
  // entirely hardcoded stats (165lb, goal 'lose', 10lb target — nothing she's
  // ever told us), same as it used to for nutrition. This progress bar read
  // those numbers directly and showed "165 lbs → 155 lbs goal" as if it were
  // her real starting point. Gated the same way as the calorie fix — only
  // trust these numbers once required_tier_completed is genuinely true (the
  // structured form's real weight/goal questions, or Coach Asa's chat build).
  const statsProvided = !!(intakeRow?.form_data as Record<string, unknown> | null)?.required_tier_completed
  // challenge_intake has no goal_weight_lbs column — it's always derived from
  // weight_lbs +/- target_lbs (a delta, defaults to 10), same as
  // app/api/challenge/intake/route.ts computes it at intake time.
  const startWeight = statsProvided ? Number(intakeRow?.weight_lbs) || 0 : 0
  const targetDelta = Number(intakeRow?.target_lbs) || 10
  const goalWeight = statsProvided ? (intakeRow?.goal === 'gain' ? startWeight + targetDelta : startWeight - targetDelta) : 0
  const currentWeight = statsProvided ? (Number(latestCheckin?.weight_lbs) || startWeight) : 0
  const goalDirection = (intakeRow?.goal === 'gain' || intakeRow?.goal === 'maintain' ? intakeRow.goal : 'lose') as 'lose' | 'gain' | 'maintain'

  // Consistency stat — deliberately separate from the weight math above, never
  // blended into it (a good-effort stretch with a stubborn scale shouldn't make the
  // goal bar lie in the "good" direction). Shown alongside it, smaller, clearly
  // labeled as consistency, not progress. 14-day window: workouts = completed vs.
  // her own planned days/week (capped 100%, no plan yet = 0 rather than divide-by-
  // zero); nutrition = days she logged anything, a real-but-honest proxy for
  // engagement — not strict calorie-budget adherence, which would need reconstructing
  // each historical day's day-type-specific target and isn't worth that complexity
  // for a small dashboard stat.
  const workoutDaysInWindow = new Set(
    (doneRows || [])
      .filter((r) => (r as { logged_on?: string }).logged_on! >= consistencyWindowStart && (r.measurements as { workout?: boolean } | null)?.workout)
      .map((r) => (r as { logged_on?: string }).logged_on)
  ).size
  const plannedPerWeek = Number(intakeRow?.days_per_week) || 0
  const workoutConsistencyPct = plannedPerWeek > 0 ? Math.min(100, Math.round((workoutDaysInWindow / (plannedPerWeek * 2)) * 100)) : 0
  const nutritionDaysLogged = new Set((foodLogRows || []).map((r) => r.logged_on as string)).size
  const nutritionConsistencyPct = Math.min(100, Math.round((nutritionDaysLogged / 14) * 100))

  // Asa's explicit call, 2026-08-25, after reviewing the real mockup: this
  // page IS the Next Action circle now — not the circle plus the old
  // dashboard content underneath it. Chat (CoachHero), the workout photo
  // hero, the workout/calorie status cards, the weekly check-in prompt, and
  // the feedback card are NOT deleted — every one of them is still one tap
  // away from the hamburger menu (ClientMenu already links to /plan/coach,
  // /plan/workout, /plan/checkin, /plan/feedback, etc.) — they're just no
  // longer part of the landing view, exactly matching the approved mockup:
  // greeting + self-talk (in shell(), above) + circle + progress, nothing else.
  return shell(
    <div className="space-y-4">
      {hasPlan && (
        <>
          <NextActionCard />
          {statsProvided ? (
            <GoalProgressBar startWeight={startWeight} currentWeight={currentWeight} goalWeight={goalWeight} goal={goalDirection} workoutConsistencyPct={workoutConsistencyPct} nutritionConsistencyPct={nutritionConsistencyPct} />
          ) : (
            <Link href="/plan/intake" className="block rounded-[2rem] p-5" style={{ background: '#083023', border: '1px solid rgba(229,169,60,0.3)' }}>
              <p className="text-[#E5A93C] text-[10px] uppercase tracking-wider font-semibold mb-1">Your progress</p>
              <p className="text-white font-bold text-lg">Add your starting weight & goal</p>
              <p className="text-white/50 text-sm mt-0.5">90 seconds — then this fills in with your real numbers, not a placeholder.</p>
            </Link>
          )}
        </>
      )}
    </div>,
    <ClientMenu key="menu" firstName={firstName} liveUrl={LIVE_CALL.zoomUrl || undefined} callAccess={enrollment.tier === 'inner_circle' ? 'weekly' : enrollment.tier === 'challenge' ? 'monthly' : 'none'} />,
    affirmation
  )
}
