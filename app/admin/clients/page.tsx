import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import ClientRoster, { type RosterRow } from '@/components/ClientRoster'

export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
  const { svc } = await requireAdmin('/admin/clients')

  const [{ data: enrollments }, { data: checkins }, { data: feedback }] = await Promise.all([
    svc.from('challenge_enrollments')
      .select('id, name, email, tier, status, intake_completed, created_at, amount, last_active_at')
      .order('created_at', { ascending: false }),
    svc.from('challenge_checkins').select('enrollment_id, status, submitted_at'),
    svc.from('challenge_progress').select('enrollment_id, measurements').eq('note', '__feedback__'),
  ])

  const negativeFeedback = new Set<string>(
    (feedback || []).filter((f) => (f.measurements as { rating?: string } | null)?.rating === 'down').map((f) => f.enrollment_id as string)
  )

  const byEnroll = new Map<string, { pending: number; last: string | null }>()
  for (const c of checkins || []) {
    const key = c.enrollment_id as string
    const cur = byEnroll.get(key) || { pending: 0, last: null }
    if (c.status === 'submitted') cur.pending += 1
    const s = c.submitted_at as string | null
    if (s && (!cur.last || s > cur.last)) cur.last = s
    byEnroll.set(key, cur)
  }

  const rows: RosterRow[] = (enrollments || []).map((e) => {
    const stats = byEnroll.get(e.id as string) || { pending: 0, last: null }
    return {
      id: e.id as string,
      name: (e.name as string) || null,
      email: (e.email as string) || null,
      tier: (e.tier as string) || 'challenge',
      status: (e.status as string) || 'pending',
      intakeDone: !!e.intake_completed,
      pending: stats.pending,
      lastCheckin: stats.last,
      createdAt: e.created_at as string,
      isBeta: e.amount === 0,
      hasNegativeFeedback: negativeFeedback.has(e.id as string),
      // Real app-usage signal, not just subscription status — updated on
      // every /plan/* page load (see components/TrackAppOpen.tsx). This is
      // the "how do we even measure active users" answer: the one thing
      // before beta launch (2026-08-24) was making this actually visible.
      lastActiveAt: (e.last_active_at as string) || null,
    }
  })

  return (
    <div className="min-h-[100dvh] bg-obsidian px-4 pt-24 pb-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <Link href="/admin" className="text-ivory/40 text-xs hover:text-gold">← Admin</Link>
          <Link href="/admin/checkins" className="text-ivory/40 text-xs hover:text-gold">Check-in queue →</Link>
        </div>
        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-1">Users</p>
        <h1 className="text-3xl font-bold text-white mb-2">Active users</h1>
        <p className="text-ivory/50 text-sm mb-8">Everyone on the platform, in one place. Tap anyone to see their whole picture.</p>
        <ClientRoster rows={rows} />
      </div>
    </div>
  )
}
