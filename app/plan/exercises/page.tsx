import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getMemberEnrollment } from '@/lib/member'
import MoveBrowser from '@/components/MoveBrowser'

export const dynamic = 'force-dynamic'

export default async function WorkoutLibrary() {
  const { user, enrollment } = await getMemberEnrollment()
  if (!user) redirect('/login?redirect=/plan/exercises')
  if (!enrollment) redirect('/plan')

  return (
    <div className="min-h-screen bg-obsidian px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <Link href="/plan" className="inline-flex items-center gap-1.5 bg-charcoal border border-gold/40 text-gold text-sm font-semibold px-4 py-2.5 rounded-full hover:border-gold hover:bg-gold/10 active:scale-95 transition-all mb-4">← Back to my plan</Link>
        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-1">Workout Plans</p>
        <h1 className="text-3xl font-bold text-white mb-2">Every move in your training</h1>
        <p className="text-ivory/50 text-sm mb-8">Browse and search every exercise across gym, abs, and home — how to do it, what it targets.</p>
        <MoveBrowser />
      </div>
    </div>
  )
}
