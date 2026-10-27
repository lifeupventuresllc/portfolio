import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPartnerStatus, getOrCreateInviteCode, getPartnerMessages, enrollmentIdFor, takeEndedNotice } from '@/lib/partners'
import FriendsView from '@/components/FriendsView'

export const dynamic = 'force-dynamic'

export default async function FriendsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/plan/friends')

  const enrollmentId = await enrollmentIdFor(user)
  if (!enrollmentId) redirect('/plan')

  // Everything her partner switched off is already gone from `status` —
  // dropped on the server in getPartnerStatus, never sent to this phone.
  const status = await getPartnerStatus(enrollmentId)
  const messages = status ? await getPartnerMessages(status.partnershipId) : []
  const inviteCode = status ? null : await getOrCreateInviteCode(enrollmentId)
  const ended = status ? false : await takeEndedNotice(enrollmentId)

  return <FriendsView status={status} messages={messages} inviteCode={inviteCode} ended={ended} />
}
