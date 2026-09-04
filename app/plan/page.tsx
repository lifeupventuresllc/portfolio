import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import ClientMenu from '@/components/ClientMenu'
import StreakChip from '@/components/StreakChip'
import CollapsibleHeaderCard from '@/components/CollapsibleHeaderCard'
import VerifyEmailBanner from '@/components/VerifyEmailBanner'
import AnonymousSessionBanner from '@/components/AnonymousSessionBanner'
import TimezoneSync from '@/components/TimezoneSync'
import NextActionCard from '@/components/NextActionCard'
import DashboardVideoFeed from '@/components/DashboardVideoFeed'
import FeedEngagementRail from '@/components/FeedEngagementRail'
import { getFeedVideos } from '@/lib/feed-videos'
import { LIVE_CALL } from '@/lib/live-call'
import { affirmationForDay } from '@/lib/affirmations'
import { localDateISO, localDayNumber, localMondayIndex } from '@/lib/localdate'
import { getApprovedTodayAdjustment } from '@/lib/fos/context'
import { getEffectiveCalorieBudget } from '@/lib/fos/effective-plan'
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

  const shell = (children: React.ReactNode, menu: React.ReactNode = null, selfTalk?: string) => (
    <div className="min-h-[100dvh] px-4 py-6" style={{ background: '#021F16' }}>
      <TimezoneSync />
      <div className="max-w-3xl mx-auto">
        {user.is_anonymous ? <AnonymousSessionBanner /> : (!user.email_confirmed_at && user.email && <VerifyEmailBanner email={user.email} />)}
        <div className="flex items-center justify-between mb-4 px-1 pt-2">
          <p className="text-[#E5A93C] text-xs font-semibold tracking-[0.25em] uppercase" style={{ fontFamily: 'var(--font-poppins)' }}>Life-Up Fitness</p>
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
          <h1 className="font-bold text-white leading-[1.02] tracking-tight mb-1" style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontStyle: 'italic', fontSize: 'clamp(2rem, 7vw, 2.5rem)' }}>Hey {firstName}</h1>
          <div className="mb-2"><StreakChip /></div>
          {selfTalk && (
            <>
              <p className="text-[#E5A93C] text-[9px] uppercase tracking-[0.22em] font-bold mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>Today&apos;s self-talk</p>
              <p className="text-white text-[15px] leading-snug italic text-balance" style={{ fontFamily: 'var(--font-poppins)' }}>&ldquo;{selfTalk}&rdquo;</p>
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
  //
  // Real bug found live, 2026-09-03 (Asa's report — her own dashboard showed
  // blank): this comment always described the intent, but the render below
  // never actually matched it — the no-intake path fell through to an empty
  // `shell(<div className="space-y-4" />, ...)`, a literal blank screen,
  // instead of the real feed. Every brand-new anonymous visitor (no intake
  // yet by definition) hit this. Fixed by always rendering the real feed
  // dashboard below once she's enrolled at all — hasPlan now only decides
  // which numbers show real data vs. a build-prompt, never whether the page
  // has content.
  const hasPlan = !!enrollment.intake_completed

  const todayIso = localDateISO()
  const [{ data: intakeRow }, { data: latestCheckin }, { data: foodLogRows }, { data: nutritionPlan }, todayAdjustment] = hasPlan
    ? await Promise.all([
        svc.from('challenge_intake').select('weight_lbs, target_lbs, goal, days_per_week, form_data').eq('enrollment_id', enrollment.id).maybeSingle(),
        svc.from('challenge_checkins').select('weight_lbs, submitted_at').eq('enrollment_id', enrollment.id).not('weight_lbs', 'is', null).order('submitted_at', { ascending: false }).limit(1).maybeSingle(),
        // The old 14-day nutrition-consistency stat this used to also cover
        // was dropped from this page's compact merged line (2026-08-29 feed
        // redesign) — just today's rows needed now.
        svc.from('challenge_food_log').select('calories').eq('enrollment_id', enrollment.id).eq('logged_on', todayIso),
        svc.from('challenge_nutrition_plans').select('meals, calories').eq('enrollment_id', enrollment.id).eq('week_number', 1).maybeSingle(),
        getApprovedTodayAdjustment(enrollment.id as string, todayIso),
      ])
    : [{ data: null }, { data: null }, { data: null }, { data: null }, null] as const

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
  // 'recomp' (both "Lose fat" and "Build & tone" selected — lib/goals.ts)
  // deliberately reads as 'maintain' for THIS weight-progress display only —
  // real recomposition often shows little scale movement (muscle gain
  // offsets fat loss), so a flat goal-weight target is more honest here
  // than implying a clean loss-style delta the scale may never show. The
  // workout/nutrition engines still get her real 'recomp' goal everywhere
  // else — this is cosmetic to this one progress bar, not a downgrade.
  const goalWeight = statsProvided ? (intakeRow?.goal === 'gain' ? startWeight + targetDelta : intakeRow?.goal === 'recomp' ? startWeight : startWeight - targetDelta) : 0
  const currentWeight = statsProvided ? (Number(latestCheckin?.weight_lbs) || startWeight) : 0
  const goalDirection = (intakeRow?.goal === 'gain' ? 'gain' : intakeRow?.goal === 'maintain' || intakeRow?.goal === 'recomp' ? 'maintain' : 'lose') as 'lose' | 'gain' | 'maintain'

  // Today's calories for the progress card — mirrors app/plan/today/page.tsx's
  // calBudget/loggedCalories exactly (same todayMeals-aware target, same
  // getEffectiveCalorieBudget adjustment layer) so the two pages never
  // disagree on a day Coach Asa approved a calorie change.
  const mealIdx = localMondayIndex()
  const weekPlan = (nutritionPlan?.meals && typeof nutritionPlan.meals === 'object' && 'days' in nutritionPlan.meals)
    ? (nutritionPlan.meals as WeekPlan) : null
  const todayMeals = weekPlan && mealIdx <= 5 ? weekPlan.days[mealIdx] : null
  const flatCalTarget = Number(nutritionPlan?.calories) || null
  const baseCalTarget = todayMeals?.target ?? flatCalTarget ?? undefined
  const calBudget = baseCalTarget != null ? getEffectiveCalorieBudget(baseCalTarget, todayAdjustment) : null
  const loggedCaloriesToday = (foodLogRows || []).reduce((sum, r) => sum + (Number((r as { calories?: number }).calories) || 0), 0)

  const menu = <ClientMenu key="menu" firstName={firstName} liveUrl={LIVE_CALL.zoomUrl || undefined} callAccess={enrollment.tier === 'inner_circle' ? 'weekly' : enrollment.tier === 'challenge' ? 'monthly' : 'none'} />

  // Real dashboard, feed-first (Asa's approved mockup, 2026-08-28/29): the
  // TikTok-style vertical reel is now the dominant middle section, full-bleed,
  // with the greeting/streak/self-talk, the like/community rail, and the
  // Next Action + progress content all layered on top of it as one caption
  // dock — not a separate stack of cards below a static hero, per
  // "keep the main thing the main thing." No hero card here (that's shell(),
  // still used below for the not-enrolled / no-plan states, which have no
  // feed to layer onto).
  // h-[100dvh] overflow-hidden, with -mb-16 to cancel the outer wrapper's
  // pb-16 — the real root cause of the swipe-reveals-a-gap bug Asa caught
  // on his own phone, 2026-08-29: app/plan/layout.tsx wraps every /plan
  // page in its own "pb-16" clearance div for simpler pages that don't
  // need pixel-perfect tab-bar accounting. Stacked with this page's own
  // precise paddingBottom below, the combined content came out taller
  // than the real viewport, which is exactly what makes a page scrollable
  // — so a swipe on the video scrolled the whole document, not just the
  // reel, revealing the reserved tab-bar space as a gap that opened and
  // closed as she swiped.
  // Tried position:fixed inset-0 first (taking this out of flow entirely,
  // same as BottomTabBar) but that broke completely: an ancestor
  // (".luf-page", page-transition infrastructure elsewhere in the app —
  // not this file) has an active CSS transform, which per spec makes IT
  // the containing block for any position:fixed descendant instead of the
  // real viewport — and since that ancestor's own height collapses to
  // near-0 (its only content became a no-longer-in-flow fixed child), the
  // "fixed" box collapsed right along with it. -mb-16 (Tailwind's pb-16 in
  // reverse, -4rem) cancels the outer wrapper's padding while staying in
  // normal flow, which isn't affected by that ancestor's transform at all.
  // 63px — Asa's catch, 2026-09-02: the bottom nav's + button went back to
  // a plain inline tab (was briefly a floating FAB, which needed 104px here
  // to clear; that's reverted). 63px is the nav's real rendered height,
  // read directly from a live DOM measurement (getBoundingClientRect) after
  // two rounds of hand-computed guesses here both came up wrong — not
  // derived from the padding/row/border arithmetic, the actual number.
  return (
    <div className="h-[100dvh] -mb-16 flex flex-col overflow-hidden" style={{ background: '#021F16', paddingBottom: 'calc(63px + env(safe-area-inset-bottom))' }}>
        <TimezoneSync />
        {user.is_anonymous ? <AnonymousSessionBanner /> : (!user.email_confirmed_at && user.email && <VerifyEmailBanner email={user.email} />)}

        {/* No separate header bar above the video (Asa's catch on his real
            phone, 2026-08-29: the wordmark/gear/menu were sitting in their
            own solid quadrant above the feed, eating into it — never the
            approved design). The video now starts at the screen's real top
            edge; wordmark/icons/greeting/self-talk are all overlays
            floating directly on it via topSlot below, matching TikTok's
            own transparent top nav — approved on Asa's phone in Safari,
            2026-08-29. */}
        {/* No inline height here — flex-1 (flex-grow, flex-basis:0%) fills
            whatever's left of the root's h-[100dvh] above, which already
            has paddingBottom reserving the fixed BottomTabBar's real
            height. BottomTabBar isn't a normal-flow sibling (it's
            position:fixed, rendered from app/plan/layout.tsx), so nothing
            here would otherwise know to leave room for it — an inline
            calc(100dvh - ...) here computed wrong in testing (100dvh
            resolved larger than the real viewport in this environment,
            so the subtraction landed back at the full height, burying the
            caption content — next action, chat, progress — behind the
            tab bar). Reserving the space one level up in real padding
            sidesteps that entirely. */}
        {/* No side/bottom padding, no rounded corners, no border — Asa's
            catch on his own phone, 2026-08-29: those made the video read
            as a floating card with a visible gap above the tab bar
            instead of one continuous surface running right up to it,
            unlike TikTok's own feed (which touches every edge except the
            true top, which topSlot's transparent overlay already
            handles). */}
        <div className="flex-1 min-h-0 relative">
          {/* absolute inset-0 (not w-full h-full) — DashboardVideoFeed's own
              root and every layer inside it are position:absolute (the reel,
              scrims, slots), so nothing in that subtree contributes normal-
              flow content height. A percentage (h-full) chain feeding an
              all-absolute subtree has nothing definite to resolve against
              and collapses/overflows unpredictably across reloads (caught
              live, 2026-08-29: rendered 0px on one load, 1788px on the
              next). Anchoring by inset against this relative parent's real
              flex-grown height is deterministic instead. */}
          <div className="absolute inset-0 overflow-hidden">
            <DashboardVideoFeed
              videos={getFeedVideos()}
              topSlot={
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[#E5A93C] text-[10px] font-bold uppercase" style={{ fontFamily: 'var(--font-poppins)', letterSpacing: '0.22em', textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>Life-Up Fitness</p>
                    <div className="flex items-center gap-2.5">
                      <Link href="/plan/preferences" aria-label="Update your goals and workout style" title="Update your goals and workout style" className="h-[30px] w-[30px] rounded-[10px] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(2px)' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#EDE7DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                        </svg>
                      </Link>
                      {menu}
                    </div>
                  </div>
                  {/* Merged greeting + self-talk + progress into ONE card (Asa's ask,
                      2026-08-31 — "what's one thing that can be folded to make the feed
                      longer/more seamless"): one card's border/glow instead of two stacked
                      ones. Emerald glass, more translucent than the first pass per Asa's
                      side-by-side pick ("Option B"). Progress bar moved up here from the
                      caption zone below — see GoalProgressCompact's `embedded` prop, which
                      skips its own card chrome now that this card already provides it.
                      Collapsible (2026-08-31, Asa's ask): a real client component (page.tsx
                      itself is a server component, can't hold the toggle state) — collapses
                      to a thin name+streak strip on tap, expands back on tap, for whoever
                      wants maximum feed. */}
                  <CollapsibleHeaderCard
                    firstName={firstName}
                    affirmation={affirmation}
                    statsProvided={statsProvided}
                    startWeight={startWeight}
                    currentWeight={currentWeight}
                    goalWeight={goalWeight}
                    goalDirection={goalDirection}
                    loggedCaloriesToday={loggedCaloriesToday}
                    calBudget={calBudget}
                  />
                </div>
              }
              railSlot={<FeedEngagementRail />}
              captionSlot={
                // Plain pb-3.5 (14px), same as before — clearing the nav
                // itself is already handled once, correctly, by the root
                // container's own paddingBottom above (which shrinks the
                // video area's real rendered height to stop right at the
                // nav's top edge). This is just breathing room between the
                // chat box and that edge, not a second nav-height reservation
                // — stacking both was the actual bug (Asa's catch, 2026-08-31:
                // a real gap of empty video between the chat box and the nav).
                <div className="px-4 pb-3.5" style={{ paddingRight: 58 }}>
                  <NextActionCard variant="dock" hasPlan={hasPlan} />
                </div>
              }
            />
          </div>
        </div>
      </div>
  )
}
