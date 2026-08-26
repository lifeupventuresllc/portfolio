export interface TrendPoint { label: string; value: number }

// The dashboard's "For You" page (/plan/today) never had a visual read on
// overall progress — only the Check-In page's weight chart did. This reads
// a different, weighted signal instead (see lib/progress-score.ts): a
// lifetime running total across every real completed action, not just
// weigh-ins — Asa's call, 2026-08-26, after "everything counts towards
// their goal" (workouts, meals logged, small fallback wins, all of it).
// Small flat card matching this page's own style, pink accent (Asa's pick,
// carried over from the Home dashboard's progress bar). Hidden below 2
// points, same threshold as ProgressChart, so it never renders a single,
// meaningless dot.
export default function TrendCard({ points }: { points: TrendPoint[] }) {
  const data = points.filter((p) => typeof p.value === 'number' && !isNaN(p.value))
  if (data.length < 2) return null

  const W = 300, H = 68, padX = 6, padY = 8
  const values = data.map((p) => p.value)
  const min = Math.min(...values), max = Math.max(...values)
  const span = max - min || 1
  const x = (i: number) => padX + (i * (W - padX * 2)) / (data.length - 1)
  const y = (v: number) => padY + (1 - (v - min) / span) * (H - padY * 2)
  const line = data.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ')
  const last = data[data.length - 1]

  return (
    <div className="rounded-2xl px-4 py-4 mb-2.5" style={{ background: '#12241a', border: '1.5px solid #E9A0A0' }}>
      <div className="flex items-baseline justify-between mb-2.5">
        <span className="text-sm font-semibold text-white">Your trend</span>
        <span className="text-[9.5px]" style={{ color: 'rgba(232,223,200,0.45)' }}>{last.value} pts earned</span>
      </div>
      <div className="relative rounded-[10px] mb-2 overflow-hidden" style={{ height: H, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <path d={line} fill="none" stroke="#E9A0A0" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span
          className="absolute rounded-full"
          style={{ right: '2%', top: `${(y(last.value) / H) * 100}%`, width: 7, height: 7, background: '#E9A0A0', boxShadow: '0 0 0 4px rgba(233,160,160,0.25)', transform: 'translate(50%, -50%)' }}
        />
      </div>
      <div className="flex justify-between text-[8.5px]" style={{ color: 'rgba(232,223,200,0.3)' }}>
        <span>{data[0].label}</span>
        <span>{last.label}</span>
      </div>
    </div>
  )
}
