import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getMemberEnrollment } from '@/lib/member'
import LibraryBrowser from '@/components/LibraryBrowser'

export const dynamic = 'force-dynamic'

export default async function Library() {
  const { user, enrollment } = await getMemberEnrollment()
  if (!user) redirect('/login?redirect=/plan/library')
  if (!enrollment) redirect('/plan')

  return (
    <div className="min-h-screen bg-paper px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <Link href="/plan" className="inline-flex items-center gap-1.5 bg-charcoal border border-gold/40 text-gold text-sm font-semibold px-4 py-2.5 rounded-full hover:border-gold hover:bg-gold/10 active:scale-95 transition-all mb-4">← Back to my plan</Link>
        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-1">Cookbook</p>
        <h1 className="text-3xl font-bold text-ink mb-2">Explore everything</h1>
        <p className="text-ink/60 text-sm mb-8">Every recipe on The Menu — browse, search, and get inspired.</p>
        <LibraryBrowser />
      </div>
    </div>
  )
}
