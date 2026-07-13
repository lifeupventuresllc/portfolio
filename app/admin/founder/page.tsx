import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FounderOS from '@/components/FounderOS'

export const dynamic = 'force-dynamic'

// Founder OS — Asa's private daily operating cockpit. Isolated admin section.
export default async function FounderOSPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/admin/founder')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!(profile?.role === 'admin' || profile?.role === 'support')) redirect('/')
  return <FounderOS />
}
