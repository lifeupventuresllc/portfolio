import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import ClientMenu from '@/components/ClientMenu'
import { LIVE_CALL } from '@/lib/live-call'
import MyDayBody from './MyDayBody'

export const dynamic = 'force-dynamic'

export default async function TodayView({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // Real gap found live: a totally fresh visitor (no session at all, not
  // even anonymous — e.g. a direct/shared link to this exact page) hit a
  // login wall here, contradicting the app's own "no signup wall" anonymous-
  // access design (see /try, the real bootstrap for every other entry
  // point). Route through the same anonymous-session flow instead of
  // demanding a real account just to see this page.
  if (!user) redirect('/try?to=/plan/today')

  const svc = createServiceClient()
  let { data: enrollment } = await svc.from('challenge_enrollments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc.from('challenge_enrollments').select('*').eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
    enrollment = byEmail || null
  }
  if (!enrollment) redirect('/plan')

  const firstName = (enrollment.name || user.email?.split('@')[0] || 'there').split(' ')[0]

  // Real bug found live, 2026-09-03 (Asa's report): this used to silently
  // redirect('/plan') for anyone without a completed intake — a brand-new
  // anonymous visitor has no intake by definition, so tapping "For You" as
  // one of her first taps in the app just bounced her straight back to
  // Home with zero explanation, reading as "this tab does nothing" or "this
  // is broken." This page's real content (progress trends, today's workout
  // rotation, the weekly meal plan) genuinely needs real intake data to
  // mean anything — unlike the main dashboard fix, there's no safe way to
  // render the full page with nothing to show. So instead of a silent
  // bounce, she gets an honest, on-brand prompt right here explaining why
  // and a clear way forward, matching this page's own header chrome so it
  // still feels like a real screen, not a dead end.
  if (!enrollment.intake_completed) {
    return (
      <div className="px-4 pt-6 min-h-[100dvh]" style={{ background: '#0b1712' }}>
        <div className="max-w-2xl mx-auto w-full">
          <div className="flex items-center justify-between gap-3 mb-6">
            <Link href="/plan" className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-full active:scale-95 transition-all" style={{ background: '#12241a', border: '1px solid #24402f', color: '#c9a84c' }}>← Home</Link>
            <ClientMenu firstName={firstName} liveUrl={LIVE_CALL.zoomUrl || undefined} callAccess={enrollment.tier === 'inner_circle' ? 'weekly' : enrollment.tier === 'challenge' ? 'monthly' : 'none'} isAnonymous={!!user.is_anonymous} />
          </div>
          <div className="rounded-3xl p-6 text-center" style={{ background: 'radial-gradient(80% 55% at 50% 28%, rgba(76,175,125,0.30), transparent 62%), radial-gradient(140% 100% at 50% 115%, rgba(0,0,0,0.82), transparent 55%), linear-gradient(180deg, #073322 0%, #021F16 45%, #010b07 100%)', border: '1px solid rgba(76,175,125,0.22)', boxShadow: '0 20px 40px -20px rgba(76,175,125,0.35)' }}>
            <p className="text-white font-semibold text-lg mb-2">Your progress will show up here</p>
            <p className="text-ivory/60 text-sm mb-6">Once your plan&apos;s built — goal, weight, workout style — this becomes your real progress and today&apos;s plan. Takes about 90 seconds.</p>
            <Link href="/plan/intake" className="inline-block px-8 py-3.5 font-bold text-sm uppercase tracking-wider rounded-2xl" style={{ background: 'linear-gradient(135deg, #7fe6b3, #4CAF7D 60%, #2f8a5c)', color: '#021F16' }}>Build my plan</Link>
          </div>
        </div>
      </div>
    )
  }

  // Everything below the intake check lives in ./MyDayBody (2026-10-26) so
  // Home's first screen shows the exact same Today/Progress, not a copy.
  return <MyDayBody enrollment={enrollment} user={user} where="today" searchParams={searchParams} />
}
