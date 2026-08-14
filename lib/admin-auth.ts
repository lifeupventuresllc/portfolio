import { createClient } from '@/lib/supabase/server'

// Shared admin-gate for API routes — same check app/api/admin/outreach-tracker
// and app/api/admin/prospects already do inline; pulled out so new content/outreach
// AI routes (which touch storage + billed Anthropic calls) don't skip it.
export async function verifyAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'support'].includes(profile.role)) return null
  return user
}
