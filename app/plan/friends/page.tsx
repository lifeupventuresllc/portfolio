import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPartnerStatus, getOrCreateInviteCode, getPartnerMessages } from '@/lib/partners'
import FriendsView from '@/components/FriendsView'

export const dynamic = 'force-dynamic'

export default async function FriendsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/plan/friends')

  const svc = createServiceClient()
  let { data: enrollment } = await svc.from('challenge_enrollments').select('id')
    .eq('user_id', user.id).order('created_at', { ascending: false }).maybeSingle()
  if (!enrollment && user.email) {
    const { data: byEmail } = await svc.from('challenge_enrollments').select('id')
      .eq('email', user.email).order('created_at', { ascending: false }).maybeSingle()
    enrollment = byEmail || null
  }
  if (!enrollment) redirect('/plan')

  const status = await getPartnerStatus(enrollment.id as string)
  const messages = status ? await getPartnerMessages(status.partnershipId) : []
  const inviteCode = status ? null : await getOrCreateInviteCode(enrollment.id as string)

  return <FriendsView status={status} messages={messages} inviteCode={inviteCode} />
}
