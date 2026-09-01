import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getMemberEnrollment } from '@/lib/member'
import { JUMPSTART } from '@/lib/bonuses'

export const dynamic = 'force-dynamic'

export default async function JumpStart() {
  const { user, enrollment } = await getMemberEnrollment()
  if (!user) redirect('/login?redirect=/plan/jumpstart')
  if (!enrollment) redirect('/plan')
  const firstName = ((enrollment.name as string) || 'there').split(' ')[0]

  return (
    <div className="min-h-[100dvh] bg-obsidian px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Link href="/plan" className="inline-flex items-center gap-1.5 bg-charcoal border border-gold/40 text-gold text-sm font-semibold px-4 py-2.5 rounded-full hover:border-gold hover:bg-gold/10 active:scale-95 transition-all mb-4">← Home</Link>
        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-1">Bonus · Your First Week</p>
        <h1 className="text-3xl font-bold text-white mb-2">The 7-Day Jump Start</h1>
        <p className="text-ivory/60 text-sm mb-8">Before we go all-in, {firstName}, let&apos;s stack a few quick wins so you feel momentum fast. One focus a day — that&apos;s it. Do these and you&apos;ll feel different by the weekend.</p>

        <div className="space-y-3">
          {JUMPSTART.map((d) => (
            <div key={d.day} className="flex gap-4 bg-charcoal border border-smoke rounded-2xl p-5">
              <div className="flex-none w-10 h-10 rounded-full bg-gold/15 text-gold font-bold flex items-center justify-center">{d.day}</div>
              <div>
                <h3 className="text-white font-semibold text-base mb-1">{d.title}</h3>
                <p className="text-ivory/60 text-sm">{d.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-charcoal border border-gold/30 rounded-2xl p-6 text-center mt-6">
          <p className="text-white font-semibold mb-1">That&apos;s your week, {firstName}.</p>
          <p className="text-ivory/50 text-sm mb-4">Nail these seven and you&apos;ve already built the base everything else stacks on. Proud of you.</p>
          <p className="text-gold text-sm font-semibold">— Coach</p>
        </div>
      </div>
    </div>
  )
}
