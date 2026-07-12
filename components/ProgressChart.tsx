// Weight-over-time chart for the progress tracker. Presentational SVG.
export interface ProgressPoint { label: string; weight: number }

export default function ProgressChart({ points }: { points: ProgressPoint[] }) {
  const data = points.filter((p) => typeof p.weight === 'number' && !isNaN(p.weight))
  if (data.length < 2) return null

  const W = 640, H = 200, padX = 16, padY = 24
  const weights = data.map((p) => p.weight)
  const min = Math.min(...weights), max = Math.max(...weights)
  const span = max - min || 1
  const x = (i: number) => padX + (i * (W - padX * 2)) / (data.length - 1)
  const y = (w: number) => padY + (1 - (w - min) / span) * (H - padY * 2)

  const line = data.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.weight).toFixed(1)}`).join(' ')
  const area = `${line} L ${x(data.length - 1).toFixed(1)} ${H - padY} L ${x(0).toFixed(1)} ${H - padY} Z`
  const first = data[0].weight, last = data[data.length - 1].weight
  const delta = Math.round((last - first) * 10) / 10

  return (
    <div className="bg-charcoal border border-smoke rounded-2xl p-5">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <p className="text-ivory/40 text-[10px] uppercase tracking-wider">Your weight</p>
          <p className="text-2xl font-bold text-white">{last} <span className="text-sm text-ivory/40 font-normal">lbs</span></p>
        </div>
        <div className="text-right">
          <p className="text-ivory/40 text-[10px] uppercase tracking-wider">Since you started</p>
          <p className={`text-lg font-bold ${delta < 0 ? 'text-green-400' : delta > 0 ? 'text-gold' : 'text-ivory/60'}`}>
            {delta < 0 ? '' : '+'}{delta} lbs
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none" style={{ minWidth: 280 }}>
          <defs>
            <linearGradient id="pcFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f5a623" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#f5a623" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#pcFill)" />
          <path d={line} fill="none" stroke="#f5a623" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {data.map((p, i) => (
            <circle key={i} cx={x(i)} cy={y(p.weight)} r={i === data.length - 1 ? 5 : 3}
              fill={i === data.length - 1 ? '#f5a623' : '#15151c'} stroke="#f5a623" strokeWidth="2" />
          ))}
        </svg>
      </div>
      <div className="flex justify-between mt-2 text-[11px] text-ivory/40">
        <span>{data[0].label}</span>
        <span>{data[data.length - 1].label}</span>
      </div>
    </div>
  )
}
