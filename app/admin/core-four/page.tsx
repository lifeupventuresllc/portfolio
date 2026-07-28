import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CoreFour from '@/components/CoreFour'

export const dynamic = 'force-dynamic'

// Core Four — Asa's daily ops/team-meeting review. Isolated admin section,
// separate from Founder OS (personal cockpit).
export default async function CoreFourPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/admin/core-four')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!(profile?.role === 'admin' || profile?.role === 'support')) redirect('/')
  return <CoreFour />
}
