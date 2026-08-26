export interface TrendPoint { label: string; weight: number }

// The dashboard's "For You" page (/plan/today) never had a visual read on
// weight trend — only the Check-In page's full ProgressChart did. Same real
// weight-history data, a small flat card matching this page's own style
// instead of ProgressChart's charcoal/gold treatment, since this page uses
// its own accent (Asa's pick, 2026-08-26: pink, carried over from the Home
// dashboard's progress bar). Hidden below 2 points — same threshold as
// ProgressChart — so it never renders a single, meaningless dot.
export default function TrendCard({ points }: { points: TrendPoint[] }) {
  const data = points.filter((p) => typeof p.weight === 'number' && !isNaN(p.weight))
  if (data.length < 2) return null

  const W = 300, H = 68, padX = 6, padY = 8
  const weights = data.map((p) => p.weight)
  const min = Math.min(...weights), max = Math.max(...weights)
  const span = max - min || 1
  const x = (i: number) => padX + (i * (W - padX * 2)) / (data.length - 1)
  const y = (w: number) => padY + (1 - (w - min) / span) * (H - padY * 2)
  const line = data.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.weight).toFixed(1)}`).join(' ')
  const last = data[data.length - 1]

  return (
    <div className="rounded-2xl px-4 py-4 mb-2.5" style={{ background: '#12241a', border: '1.5px solid #E9A0A0' }}>
      <div className="flex items-baseline justify-between mb-2.5">
        <span className="text-sm font-semibold text-white">Your trend</span>
        <span className="text-[9.5px]" style={{ color: 'rgba(232,223,200,0.45)' }}>{data.length} check-ins</span>
      </div>
      <div className="relative rounded-[10px] mb-2 overflow-hidden" style={{ height: H, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <path d={line} fill="none" stroke="#E9A0A0" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span
          className="absolute rounded-full"
          style={{ right: '2%', top: `${(y(last.weight) / H) * 100}%`, width: 7, height: 7, background: '#E9A0A0', boxShadow: '0 0 0 4px rgba(233,160,160,0.25)', transform: 'translate(50%, -50%)' }}
        />
      </div>
      <div className="flex justify-between text-[8.5px]" style={{ color: 'rgba(232,223,200,0.3)' }}>
        <span>{data[0].label}</span>
        <span>{last.label}</span>
      </div>
    </div>
  )
}
