'use client'

type Purchase = {
  amount: number
  status: string
  created_at: string
}

type Lead = {
  status: string
  created_at: string
}

type Prospect = {
  status: string
  created_at: string
}

type RevenueForecastProps = {
  purchases: Purchase[]
  leads: Lead[]
  prospects: Prospect[]
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs(Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)))
}

export default function RevenueForecast({ purchases, leads, prospects }: RevenueForecastProps) {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // --- Core Metrics ---
  const completedPurchases = purchases.filter(p => p.status === 'completed')
  const recentCompleted = completedPurchases.filter(p => new Date(p.created_at) >= thirtyDaysAgo)
  const currentMRR = recentCompleted.reduce((sum, p) => sum + p.amount, 0)
  const clientCount = recentCompleted.length
  const avgDealSize = completedPurchases.length > 0
    ? completedPurchases.reduce((sum, p) => sum + p.amount, 0) / completedPurchases.length
    : 997

  // --- Lead Funnel Metrics ---
  const totalLeads = leads.length
  const qualifiedLeads = leads.filter(l => ['qualified', 'converted', 'proposal'].includes(l.status)).length
  const convertedLeads = leads.filter(l => l.status === 'converted').length
  const leadQualifyRate = totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0
  const leadConvertRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0

  // --- Prospect Funnel Metrics ---
  const totalProspects = prospects.length
  const repliedProspects = prospects.filter(p =>
    ['replied', 'free-sample', 'pitched', 'closed'].includes(p.status)
  ).length
  const closedProspects = prospects.filter(p => p.status === 'closed').length
  const prospectReplyRate = totalProspects > 0 ? (repliedProspects / totalProspects) * 100 : 0
  const prospectCloseRate = totalProspects > 0 ? (closedProspects / totalProspects) * 100 : 0

  // --- Pipeline & Projections ---
  const pipelineValue = qualifiedLeads * avgDealSize

  // Active pipeline = leads not yet converted + prospects not yet closed
  const activeLeads = leads.filter(l => !['converted', 'lost', 'unqualified'].includes(l.status)).length
  const activeProspects = prospects.filter(p => !['closed', 'lost'].includes(p.status)).length

  // Combined conversion rate
  const totalClosed = convertedLeads + closedProspects
  const totalPipeline = totalLeads + totalProspects
  const overallConversionRate = totalPipeline > 0 ? totalClosed / totalPipeline : 0

  const projectedRevenue30d = currentMRR + Math.round((activeLeads + activeProspects) * overallConversionRate * avgDealSize)

  // --- Average Days to Conversion ---
  const convertedLeadRecords = leads.filter(l => l.status === 'converted')
  let avgDaysToConversion = 0
  if (convertedLeadRecords.length > 0) {
    const totalDays = convertedLeadRecords.reduce((sum, l) => {
      return sum + daysBetween(new Date(l.created_at), now)
    }, 0)
    avgDaysToConversion = Math.round(totalDays / convertedLeadRecords.length)
  }

  // --- Goal Progress ---
  const monthlyGoal = 99700
  const goalProgress = Math.min((currentMRR / monthlyGoal) * 100, 100)
  const clientsNeeded = Math.max(0, 100 - clientCount)

  return (
    <div className="space-y-4">
      {/* Revenue Metrics */}
      <div className="bg-charcoal rounded-xl border border-smoke p-6">
        <h2 className="text-sm font-semibold text-white mb-4">Revenue Forecast</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-obsidian rounded-xl p-4">
            <div className="text-xs text-ivory/40">Current MRR</div>
            <div className="text-2xl font-bold text-gold mt-1">{formatCurrency(currentMRR)}</div>
            <div className="text-xs text-ivory/30 mt-1">Last 30 days</div>
          </div>
          <div className="bg-obsidian rounded-xl p-4">
            <div className="text-xs text-ivory/40">Pipeline Value</div>
            <div className="text-2xl font-bold text-white mt-1">{formatCurrency(pipelineValue)}</div>
            <div className="text-xs text-ivory/30 mt-1">{qualifiedLeads} qualified x {formatCurrency(avgDealSize)} avg</div>
          </div>
          <div className="bg-obsidian rounded-xl p-4">
            <div className="text-xs text-ivory/40">Projected Revenue (30d)</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(projectedRevenue30d)}</div>
            <div className="text-xs text-ivory/30 mt-1">{(overallConversionRate * 100).toFixed(1)}% conv. rate</div>
          </div>
          <div className="bg-obsidian rounded-xl p-4">
            <div className="text-xs text-ivory/40">Client Count</div>
            <div className="text-2xl font-bold text-white mt-1">{clientCount}</div>
            <div className="text-xs text-ivory/30 mt-1">Paying this month</div>
          </div>
          <div className="bg-obsidian rounded-xl p-4">
            <div className="text-xs text-ivory/40">Clients Needed</div>
            <div className="text-2xl font-bold text-white mt-1">{clientsNeeded}</div>
            <div className="text-xs text-ivory/30 mt-1">To hit 100 client goal</div>
          </div>
          <div className="bg-obsidian rounded-xl p-4">
            <div className="text-xs text-ivory/40">Avg Deal Size</div>
            <div className="text-2xl font-bold text-white mt-1">{formatCurrency(avgDealSize)}</div>
            <div className="text-xs text-ivory/30 mt-1">From {completedPurchases.length} sales</div>
          </div>
        </div>

        {/* Goal Progress Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-ivory/50">Goal Progress</span>
            <span className="text-xs text-ivory/50">{formatCurrency(currentMRR)} / {formatCurrency(monthlyGoal)}</span>
          </div>
          <div className="w-full bg-obsidian rounded-full h-4 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                goalProgress >= 100 ? 'bg-emerald-500' : goalProgress >= 50 ? 'bg-gold' : 'bg-gold/60'
              }`}
              style={{ width: `${goalProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-ivory/30">{goalProgress.toFixed(1)}% of $99,700/mo goal</span>
            <span className="text-xs text-ivory/30">100 clients x $997 avg</span>
          </div>
        </div>
      </div>

      {/* Conversion Metrics */}
      <div className="bg-charcoal rounded-xl border border-smoke p-6">
        <h2 className="text-sm font-semibold text-white mb-4">Conversion Metrics</h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Lead Funnel */}
          <div>
            <h3 className="text-xs font-medium text-ivory/50 uppercase tracking-wider mb-3">Lead Funnel</h3>
            <div className="space-y-3">
              <FunnelRow label="Total Leads" count={totalLeads} pct={100} />
              <FunnelRow label="Qualified" count={qualifiedLeads} pct={leadQualifyRate} />
              <FunnelRow label="Converted" count={convertedLeads} pct={leadConvertRate} />
            </div>
          </div>

          {/* Prospect Funnel */}
          <div>
            <h3 className="text-xs font-medium text-ivory/50 uppercase tracking-wider mb-3">Prospect Funnel</h3>
            <div className="space-y-3">
              <FunnelRow label="Total Prospects" count={totalProspects} pct={100} />
              <FunnelRow label="Replied" count={repliedProspects} pct={prospectReplyRate} />
              <FunnelRow label="Closed" count={closedProspects} pct={prospectCloseRate} />
            </div>
          </div>
        </div>

        {/* Avg Days to Conversion */}
        <div className="mt-4 pt-4 border-t border-smoke">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ivory/50">Avg. Days from Lead to Conversion</span>
            <span className="text-sm font-bold text-white">
              {avgDaysToConversion > 0 ? `${avgDaysToConversion} days` : 'No data yet'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function FunnelRow({ label, count, pct }: { label: string; count: number; pct: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-ivory/60 w-28 shrink-0">{label}</span>
      <div className="flex-1 bg-obsidian rounded-full h-3 overflow-hidden">
        <div
          className="bg-gold/70 h-full rounded-full transition-all duration-300"
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <span className="text-xs font-medium text-white w-8 text-right">{count}</span>
      <span className="text-xs text-ivory/40 w-12 text-right">{pct.toFixed(1)}%</span>
    </div>
  )
}
