import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from './supabase/server'

// Gate a server component/route to coaches only (profiles.role admin|support),
// matching the existing /admin pages. Returns the user + a service client.
export async function requireAdmin(redirectTo = '/admin/clients') {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=${redirectTo}`)
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!(profile?.role === 'admin' || profile?.role === 'support')) redirect('/plan')
  return { user, svc: createServiceClient() }
}

// Same check for API routes — returns null user when not authorized (no redirect).
export async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, svc: null }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!(profile?.role === 'admin' || profile?.role === 'support')) return { ok: false as const, svc: null }
  return { ok: true as const, svc: createServiceClient() }
}
