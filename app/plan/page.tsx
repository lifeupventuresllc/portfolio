import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import StreakChip from '@/components/StreakChip'
import VerifyEmailBanner from '@/components/VerifyEmailBanner'
import TimezoneSync from '@/components/TimezoneSync'
import NextActionCard from '@/components/NextActionCard'
import DashboardVideoFeed from '@/components/DashboardVideoFeed'
import FeedEngagementRail from '@/components/FeedEngagementRail'
import HomeSwipe from '@/components/HomeSwipe'
import StartPlanBar from '@/components/StartPlanBar'
import WelcomeVideo from '@/components/WelcomeVideo'
import { getFeedVideos } from '@/lib/feed-videos'
import { affirmationForDay } from '@/lib/affirmations'
import { localDayNumber, localDateISO } from '@/lib/localdate'
import { streakFrom } from '@/lib/streak'

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
        {/* Real course-correction (Asa's call, 2026-09-07): the anonymous
            "save your progress" banner was a second, redundant place to
            trigger Google sign-in — Get Started below is now the one and
            only entry point into a real account, so there's no separate
            anonymous state left to prompt her to go back and save. */}
        {!user.is_anonymous && !user.email_confirmed_at && user.email && <VerifyEmailBanner email={user.email} />}
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

  // Home is TWO core screens (Asa's spec, 2026-09-28):
  //  - has a plan -> Screen 1 "your win for today" (name, one self-talk line,
  //    today's win, one Start), swipe up to Screen 2, the feed with a small
  //    "Your win for today" bar at the bottom (components/HomeSwipe.tsx).
  //  - no plan yet -> a one-time welcome video, then straight to the feed, whose
  //    bottom bar says "Start your plan" (components/StartPlanBar.tsx).
  // Calories, progress, lbs-to-go, the header card, chat, the menu and gear used
  // to be layered on here; none of them are on either screen now. They live
  // under the bottom tabs (My Day has the food log and the menu; the camera
  // button snaps a meal photo), so nothing was removed from the app.
  const affirmation = affirmationForDay(localDayNumber())
  const videos = getFeedVideos()

  // Real streak for the win-screen greeting card (Asa's ask, 2026-09-28: "4-day
  // streak" on the win screen, not a generic cheer). Same streakFrom(), same
  // '__daily__' rows /api/plan/daily's own chip reads — computed here directly
  // (not a second client fetch) since this page already has `svc`+`enrollment`
  // in scope and streakFrom is a cheap pure function.
  let streak = 0
  if (hasPlan) {
    const { data: dailyRows } = await svc.from('challenge_progress').select('logged_on').eq('enrollment_id', enrollment.id).eq('note', '__daily__')
    streak = streakFrom(new Set((dailyRows || []).map((r) => r.logged_on as string)), localDateISO())
  }

  // Layout notes kept from the earlier feed-first dashboard: h-[100dvh] with
  // -mb-16 cancels app/plan/layout.tsx's pb-16 (otherwise the page scrolls and
  // a swipe reveals a gap), and paddingBottom reserves the fixed BottomTabBar's
  // real 63px height. position:fixed can't be used here — an ancestor
  // (.luf-page) has a transform, which makes it the containing block.
  const feedLayer = (
    <div className="absolute inset-0 overflow-hidden">
      <DashboardVideoFeed
        videos={videos}
        railSlot={<FeedEngagementRail />}
        captionSlot={hasPlan ? undefined : <StartPlanBar />}
      />
    </div>
  )

  const heroNode = (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center px-6"
      style={{
        background: 'radial-gradient(90% 55% at 50% 40%, rgba(229,169,60,0.10), transparent 60%), linear-gradient(180deg, #06231a 0%, #021F16 45%, #010b07 100%)',
        paddingBottom: 90,
      }}
    >
      <div className="w-full max-w-md">
        {/* Greeting card (Asa's approved mockup round, 2026-09-28: "version B" —
            the streak as a small gold sticker tucked in the corner, not a
            separate line competing with the win below). Same card
            gradient/border this page's own shell() above already uses for its
            other screens — not a new color introduced just for this one. */}
        <div
          className="relative rounded-2xl px-4 py-3 mb-4 text-left"
          style={{ background: 'linear-gradient(135deg, #0d3a2a, #044A34 60%, #08281d)', border: '1.5px solid #E5A93C' }}
        >
          {streak >= 1 && (
            <span
              className="absolute -top-2.5 -right-2 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-bold"
              style={{ background: '#E5A93C', color: '#0A0A0F', fontFamily: 'var(--font-poppins)', boxShadow: '0 4px 10px rgba(0,0,0,0.35)' }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="#0A0A0F"><path d="M12 2c1 4-3 5-3 9a3 3 0 0 0 6 0c1 1 2 2 2 4a5 5 0 0 1-10 0c0-5 5-6 5-13Z" /></svg>
              {streak} day{streak === 1 ? '' : 's'}
            </span>
          )}
          <p className="text-white font-bold" style={{ fontFamily: 'var(--font-poppins)', fontSize: 18 }}>Hey {firstName}</p>
        </div>
        {affirmation && (
          <p className="text-center italic leading-snug mb-4 text-balance" style={{ fontFamily: 'var(--font-poppins)', fontSize: 11.5, color: 'rgba(229,169,60,0.85)' }}>&ldquo;{affirmation}&rdquo;</p>
        )}
        <NextActionCard variant="hero" hasPlan />
      </div>
    </div>
  )

  return (
    <div className="h-[100dvh] -mb-16 flex flex-col overflow-hidden" style={{ background: '#021F16', paddingBottom: 'calc(63px + env(safe-area-inset-bottom))' }}>
      <TimezoneSync />
      {!user.is_anonymous && !user.email_confirmed_at && user.email && <VerifyEmailBanner email={user.email} />}
      {hasPlan ? (
        <HomeSwipe hero={heroNode}>{feedLayer}</HomeSwipe>
      ) : (
        <div className="flex-1 min-h-0 relative">
          {feedLayer}
          {videos[0] && <WelcomeVideo src={videos[0].url} />}
        </div>
      )}
    </div>
  )
}
