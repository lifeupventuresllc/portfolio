'use client'

type Prospect = {
  id: string
  status: string
  platform: string
  created_at: string
}

const STATUSES = ['new', 'contacted', 'replied', 'free-sample', 'pitched', 'closed'] as const

const PLATFORM_COLORS: Record<string, string> = {
  email: 'bg-blue-500/20 text-blue-400',
  instagram: 'bg-pink-500/20 text-pink-400',
  facebook: 'bg-blue-600/20 text-blue-300',
  twitter: 'bg-sky-500/20 text-sky-400',
  linkedin: 'bg-blue-700/20 text-blue-300',
  reddit: 'bg-orange-500/20 text-orange-400',
  text: 'bg-green-500/20 text-green-400',
  'in-person': 'bg-gold/20 text-gold',
}

export default function OutreachAnalytics({ prospects }: { prospects: Prospect[] }) {
  if (prospects.length === 0) return null

  // Conversion funnel
  const statusCounts = STATUSES.map(s => ({
    status: s,
    count: prospects.filter(p => p.status === s).length,
  }))
  const totalProspects = prospects.length
  const closedCount = prospects.filter(p => p.status === 'closed').length
  const repliedOrBetter = prospects.filter(p =>
    ['replied', 'free-sample', 'pitched', 'closed'].includes(p.status)
  ).length

  // Platform breakdown
  const platformCounts: Record<string, { total: number; responded: number }> = {}
  for (const p of prospects) {
    const plat = p.platform || 'unknown'
    if (!platformCounts[plat]) platformCounts[plat] = { total: 0, responded: 0 }
    platformCounts[plat].total++
    if (['replied', 'free-sample', 'pitched', 'closed'].includes(p.status)) {
      platformCounts[plat].responded++
    }
  }

  return (
    <div className="space-y-4">
      {/* Conversion Funnel */}
      <div className="bg-charcoal rounded-xl border border-smoke p-6">
        <h2 className="text-sm font-semibold text-white mb-4">Outreach Funnel</h2>
        <div className="flex items-end gap-2">
          {statusCounts.map((s, i) => {
            const pct = totalProspects > 0 ? (s.count / totalProspects) * 100 : 0
            const height = Math.max(pct * 1.5, 8)
            return (
              <div key={s.status} className="flex-1 text-center">
                <div className="text-sm font-bold text-white">{s.count}</div>
                <div
                  className="mx-auto rounded-t bg-gold/70 transition-all"
                  style={{ height: `${height}px`, opacity: 1 - i * 0.12 }}
                />
                <div className="text-[10px] text-ivory/40 mt-1 capitalize">{s.status.replace('-', ' ')}</div>
              </div>
            )
          })}
        </div>
        <div className="flex justify-between mt-4 text-xs text-ivory/40">
          <span>Response rate: {totalProspects > 0 ? ((repliedOrBetter / totalProspects) * 100).toFixed(1) : 0}%</span>
          <span>Close rate: {totalProspects > 0 ? ((closedCount / totalProspects) * 100).toFixed(1) : 0}%</span>
        </div>
      </div>

      {/* Platform Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(platformCounts)
          .sort(([, a], [, b]) => b.total - a.total)
          .map(([platform, counts]) => (
            <div key={platform} className="bg-charcoal rounded-xl border border-smoke p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${PLATFORM_COLORS[platform] || 'bg-smoke text-ivory/70'}`}>
                  {platform}
                </span>
              </div>
              <div className="text-xl font-bold text-white">{counts.total}</div>
              <div className="text-[10px] text-ivory/40">
                {counts.responded} responded ({counts.total > 0 ? ((counts.responded / counts.total) * 100).toFixed(0) : 0}%)
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
