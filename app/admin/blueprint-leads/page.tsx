import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BlueprintLeads from '@/components/BlueprintLeads'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Fitness Leads - Asa Luke' }

// Calorie Blueprint lead-gen dashboard — every lead's contact info + full stats.
export default async function BlueprintLeadsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/admin/blueprint-leads')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!(profile?.role === 'admin' || profile?.role === 'support')) redirect('/')
  return <BlueprintLeads />
}
