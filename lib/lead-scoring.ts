type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'

const STATUS_SCORES: Record<LeadStatus, number> = {
  new: 10,
  contacted: 20,
  qualified: 30,
  converted: 50,
  lost: 0,
}

export function computeLeadScore(
  status: string,
  followUpsSent: number,
  lastActivityAt: string | null,
  extras?: {
    hasPhone?: boolean
    hasInstagram?: boolean
    serviceInterest?: string
    responseCount?: number
    emailOpens?: number
    funnelSource?: string
  }
): number {
  let score = STATUS_SCORES[status as LeadStatus] || 0

  // +5 for each follow-up sent (capped at 25)
  score += Math.min(followUpsSent * 5, 25)

  // Engagement bonuses
  if (extras) {
    // +10 if they have a phone number (higher intent)
    if (extras.hasPhone) score += 10

    // +5 if they have Instagram (reachable via DM)
    if (extras.hasInstagram) score += 5

    // +15 for each response received
    if (extras.responseCount) score += Math.min(extras.responseCount * 15, 45)

    // +5 per email open (capped at 20)
    if (extras.emailOpens) score += Math.min(extras.emailOpens * 5, 20)

    // +10 for high-value service interest
    if (extras.serviceInterest === 'content') score += 10
    if (extras.serviceInterest === 'audio') score += 5

    // +15 for niche landing page source (high intent)
    if (extras.funnelSource && extras.funnelSource.includes('landing')) score += 15
  }

  // Recency decay
  if (lastActivityAt) {
    const daysSinceActivity = (Date.now() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceActivity > 30) score -= 15
    else if (daysSinceActivity > 14) score -= 5
  } else {
    // No activity at all — penalize
    score -= 10
  }

  return Math.max(0, Math.min(score, 100))
}
