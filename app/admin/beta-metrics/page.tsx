import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'

export const dynamic = 'force-dynamic'

type Flag = {
  intervention_sent: boolean
  backtested_at: string | null
  prediction_outcome: string | null
  response_outcome: string | null
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-charcoal border border-smoke rounded-2xl p-5">
      <p className="text-gold text-[10px] uppercase tracking-wider font-semibold mb-1.5">{label}</p>
      <p className="text-white text-3xl font-bold">{value}</p>
      {sub && <p className="text-ivory/40 text-xs mt-1">{sub}</p>}
    </div>
  )
}

const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : '—')

export default async function BetaMetricsPage() {
  const { svc } = await requireAdmin('/admin/beta-metrics')

  const { data } = await svc.from('fos_risk_flags').select('intervention_sent, backtested_at, prediction_outcome, response_outcome')
  const flags = (data || []) as Flag[]

  const totalFlags = flags.length
  const interventionsSent = flags.filter((f) => f.intervention_sent).length
  const backtested = flags.filter((f) => f.backtested_at)
  const pendingBacktest = totalFlags - backtested.length

  const wentQuiet = backtested.filter((f) => f.prediction_outcome === 'went_quiet').length
  const falseAlarm = backtested.filter((f) => f.prediction_outcome === 'false_alarm').length

  const respondedFlags = backtested.filter((f) => f.intervention_sent)
  const reengaged = respondedFlags.filter((f) => f.response_outcome === 'reengaged').length
  const noResponse = respondedFlags.filter((f) => f.response_outcome === 'no_response').length
  const acceleratedDropoff = respondedFlags.filter((f) => f.response_outcome === 'accelerated_dropoff').length

  return (
    <div className="min-h-[100dvh] bg-obsidian px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <Link href="/admin/clients" className="text-ivory/40 text-xs hover:text-gold mb-2 inline-block">← Your clients</Link>
        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-2">Coach Tool — Beta</p>
        <h1 className="text-3xl font-bold text-white mb-2">Adherence Engine — Beta Metrics</h1>
        <p className="text-ivory/50 text-sm mb-8">
          {totalFlags} flag{totalFlags === 1 ? '' : 's'} so far · {pendingBacktest} still waiting on a 7-day backtest.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-8">
          <Tile label="Prediction accuracy" value={pct(wentQuiet, wentQuiet + falseAlarm)} sub={`${wentQuiet} went quiet · ${falseAlarm} false alarms`} />
          <Tile label="Push delivery rate" value={pct(interventionsSent, totalFlags)} sub={`${interventionsSent} of ${totalFlags} flags`} />
        </div>

        <h2 className="text-white font-bold text-lg mb-3">When we reached out, what happened</h2>
        <div className="grid grid-cols-3 gap-3">
          <Tile label="Re-engaged" value={pct(reengaged, respondedFlags.length)} sub={`${reengaged} of ${respondedFlags.length}`} />
          <Tile label="No response" value={pct(noResponse, respondedFlags.length)} sub={`${noResponse} of ${respondedFlags.length}`} />
          <Tile label="Dropped off faster" value={pct(acceleratedDropoff, respondedFlags.length)} sub={`${acceleratedDropoff} of ${respondedFlags.length}`} />
        </div>

        {totalFlags === 0 && (
          <p className="text-ivory/40 text-sm mt-8">No flags yet — this fills in as daily-nudge/meal-nudge run and the 7-day backtest catches up.</p>
        )}
      </div>
    </div>
  )
}
