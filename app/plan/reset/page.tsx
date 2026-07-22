import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getMemberEnrollment } from '@/lib/member'
import { HABIT_RESET } from '@/lib/bonuses'

export const dynamic = 'force-dynamic'

export default async function HabitReset() {
  const { user, enrollment } = await getMemberEnrollment()
  if (!user) redirect('/login?redirect=/plan/reset')
  if (!enrollment) redirect('/plan')
  const firstName = ((enrollment.name as string) || 'there').split(' ')[0]

  return (
    <div className="min-h-screen bg-paper px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Link href="/plan" className="inline-flex items-center gap-1.5 bg-charcoal border border-gold/40 text-gold text-sm font-semibold px-4 py-2.5 rounded-full hover:border-gold hover:bg-gold/10 active:scale-95 transition-all mb-4">← Back to my plan</Link>
        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-1">Bonus · Make It Stick</p>
        <h1 className="text-3xl font-bold text-ink mb-2">The 21-Day Habit Reset</h1>
        <p className="text-ink/60 text-sm mb-8">Results come from what you do on autopilot, {firstName}. One small habit a day for three weeks — do the day&apos;s habit, check it off in your head, keep the ones that fit. This is how the change actually lasts after the 6 weeks.</p>

        <div className="space-y-2">
          {HABIT_RESET.map((h, i) => (
            <div key={i} className="flex items-center gap-4 bg-charcoal border border-smoke rounded-xl px-4 py-3">
              <span className="flex-none w-8 text-gold font-bold text-sm tabular-nums">{String(i + 1).padStart(2, '0')}</span>
              <span className="text-ivory/80 text-sm">{h}</span>
            </div>
          ))}
        </div>

        <div className="bg-charcoal border border-gold/30 rounded-2xl p-6 text-center mt-6">
          <p className="text-white font-semibold mb-1">Keep the ones that fit your life.</p>
          <p className="text-ivory/50 text-sm mb-4">You don&apos;t need all 21 forever — you need the handful that make staying on track feel automatic. Those are yours to keep.</p>
          <p className="text-gold text-sm font-semibold">— Coach Asa</p>
        </div>
      </div>
    </div>
  )
}
