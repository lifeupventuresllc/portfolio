import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Daily10Dashboard from '@/components/Daily10Dashboard'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'The Daily 10 - Asa Luke' }

// Live pipeline view: Content -> Blueprint Leads -> Nurture Emails -> App Conversions.
export default async function Daily10Page() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/admin/daily-10')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!(profile?.role === 'admin' || profile?.role === 'support')) redirect('/')
  return <Daily10Dashboard />
}
