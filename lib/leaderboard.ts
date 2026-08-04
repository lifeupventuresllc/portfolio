import { createServiceClient } from '@/lib/supabase/server'
import { localDateISO } from '@/lib/localdate'
import { streakFrom } from '@/lib/streak'

export interface LeaderboardEntry {
  name: string
  streak: number
  isYou: boolean
}

// Shared by the community page (server-rendered) and the leaderboard API
// route (client fetch) so both always show the exact same ranking, computed
// off the same streak-insurance logic already driving the dashboard chip
// and the Monday memo — never a second, drifting definition of "streak."
export async function getLeaderboard(currentEnrollmentId: string): Promise<{ leaderboard: LeaderboardEntry[]; spotlight: LeaderboardEntry | null }> {
  const svc = createServiceClient()
  const { data: enrollments } = await svc.from('challenge_enrollments').select('id, name').eq('status', 'active')
  if (!enrollments?.length) return { leaderboard: [], spotlight: null }

  const { data: progress } = await svc
    .from('challenge_progress')
    .select('enrollment_id, logged_on')
    .eq('note', '__daily__')
    .in('enrollment_id', enrollments.map((e) => e.id))

  const today = localDateISO()
  const byEnrollment = new Map<string, Set<string>>()
  for (const row of progress || []) {
    const id = row.enrollment_id as string
    if (!byEnrollment.has(id)) byEnrollment.set(id, new Set())
    byEnrollment.get(id)!.add(row.logged_on as string)
  }

  const ranked = enrollments
    .map((e) => ({
      name: (e.name as string) || 'A member',
      streak: streakFrom(byEnrollment.get(e.id) || new Set(), today),
      isYou: e.id === currentEnrollmentId,
    }))
    .filter((r) => r.streak > 0)
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 20)

  return { leaderboard: ranked, spotlight: ranked[0] || null }
}
