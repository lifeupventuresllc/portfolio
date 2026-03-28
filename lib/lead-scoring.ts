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
  lastActivityAt: string | null
): number {
  let score = STATUS_SCORES[status as LeadStatus] || 0

  // +5 for each follow-up sent
  score += followUpsSent * 5

  // Decay: -5 if no activity in 14 days
  if (lastActivityAt) {
    const daysSinceActivity = (Date.now() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceActivity > 14) {
      score -= 5
    }
  }

  return Math.max(0, score)
}
