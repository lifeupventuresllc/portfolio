import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getMemberEnrollment } from '@/lib/member'
import { COMMUNITY_URL } from '@/lib/bonuses'

export const dynamic = 'force-dynamic'

export default async function Community() {
  const { user, enrollment } = await getMemberEnrollment()
  if (!user) redirect('/login?redirect=/plan/community')
  if (!enrollment) redirect('/plan')
  const firstName = ((enrollment.name as string) || 'there').split(' ')[0]
  const linked = COMMUNITY_URL && COMMUNITY_URL !== '#'

  return (
    <div className="min-h-screen bg-obsidian px-4 py-12">
      <div className="max-w-xl mx-auto">
        <Link href="/plan" className="text-ivory/40 text-xs hover:text-gold mb-2 inline-block">← Back to my plan</Link>
        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-1">Your People</p>
        <h1 className="text-3xl font-bold text-white mb-3">The Curve Collective</h1>
        <p className="text-ivory/60 text-sm mb-8">You&apos;re not doing this alone, {firstName}. The Curve Collective is our private circle of women walking this out together — sharing wins, asking questions, and keeping each other going on the hard days. Come introduce yourself.</p>

        <div className="bg-charcoal border border-gold/30 rounded-3xl p-8 text-center">
          {linked ? (
            <>
              <p className="text-white font-semibold mb-4">Your seat is waiting.</p>
              <a href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer"
                className="inline-block bg-gold text-obsidian px-8 py-3.5 font-bold text-sm uppercase tracking-wider rounded-2xl">
                Join the Curve Collective
              </a>
            </>
          ) : (
            <p className="text-ivory/50 text-sm">Your invite drops here the moment your cohort opens. Keep an eye out — I&apos;ll let you know.</p>
          )}
        </div>
      </div>
    </div>
  )
}
