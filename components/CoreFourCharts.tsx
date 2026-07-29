'use client'

import { useState } from 'react'

/* ────────────────────────────────────────────────────────────────
   Small, dependency-free SVG charts for the Core Four Metrics tab.
   Status colors reuse the app's existing tokens (gold/amber/ivory) —
   already the established on-track/needs-attention/not-active palette
   used throughout Core Four, not a new one.
   ──────────────────────────────────────────────────────────────── */

const CHART_H = 160
const BAR_GAP_RATIO = 0.35

function useHover() {
  const [hover, setHover] = useState<number | null>(null)
  return { hover, setHover }
}

// Sparse x-axis labels so buckets don't collide when there are many (e.g. 30 days).
function labelStride(n: number): number {
  if (n <= 10) return 1
  if (n <= 20) return 2
  if (n <= 40) return 4
  return Math.ceil(n / 10)
}

export function StatusStackedBarChart({
  title,
  buckets,
}: {
  title: string
  buckets: { label: string; onTrack: number; needsAttention: number; notActive: number }[]
}) {
  const { hover, setHover } = useHover()
  const [showTable, setShowTable] = useState(false)
  const max = Math.max(1, ...buckets.map((b) => b.onTrack + b.needsAttention + b.notActive))
  const n = buckets.length
  const stride = labelStride(n)
  const barW = 100 / n
  const gap = barW * BAR_GAP_RATIO

  return (
    <div className="bg-charcoal rounded-xl border border-smoke p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <button onClick={() => setShowTable((v) => !v)} className="text-[10px] text-ivory/40 hover:text-gold uppercase tracking-wider">
          {showTable ? 'View chart' : 'View table'}
        </button>
      </div>
      <p className="text-ivory/40 text-[11px] mb-4">Pillar status observations, stacked by outcome, per period.</p>

      {!showTable && (
        <>
          <div className="relative">
            <svg viewBox={`0 0 100 ${CHART_H}`} preserveAspectRatio="none" className="w-full" style={{ height: CHART_H }}>
              {[0.25, 0.5, 0.75].map((f) => (
                <line key={f} x1={0} x2={100} y1={CHART_H * (1 - f)} y2={CHART_H * (1 - f)} className="stroke-smoke" strokeWidth={0.3} />
              ))}
              {buckets.map((b, i) => {
                const total = b.onTrack + b.needsAttention + b.notActive
                const x = i * barW + gap / 2
                const w = barW - gap
                let yCursor = CHART_H
                const segs: { h: number; cls: string }[] = [
                  { h: (b.onTrack / max) * CHART_H, cls: 'fill-gold' },
                  { h: (b.needsAttention / max) * CHART_H, cls: 'fill-amber-500' },
                  { h: (b.notActive / max) * CHART_H, cls: 'fill-ivory/25' },
                ]
                return (
                  <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                    <rect x={x} y={0} width={w} height={CHART_H} fill="transparent" />
                    {total === 0 ? (
                      <rect x={x} y={CHART_H - 1.5} width={w} height={1.5} rx={0.75} className="fill-ivory/10" />
                    ) : (
                      segs.map((s, si) => {
                        if (s.h <= 0) return null
                        yCursor -= s.h
                        return <rect key={si} x={x} y={yCursor} width={w} height={Math.max(s.h - 0.6, 0.8)} rx={0.8} className={s.cls} />
                      })
                    )}
                    {hover === i && <rect x={x} y={0} width={w} height={CHART_H} className="fill-white/5" />}
                  </g>
                )
              })}
            </svg>
            {hover !== null && (
              <div
                className="absolute -top-2 -translate-y-full bg-obsidian border border-smoke rounded-lg px-3 py-2 text-xs pointer-events-none z-10 whitespace-nowrap"
                style={{ left: `${(hover + 0.5) * barW}%`, transform: 'translate(-50%, -100%)' }}
              >
                <p className="text-white font-semibold mb-1">{buckets[hover].label}</p>
                <p className="text-gold">On Track: {buckets[hover].onTrack}</p>
                <p className="text-amber-400">Needs Attention: {buckets[hover].needsAttention}</p>
                <p className="text-ivory/50">Not Active: {buckets[hover].notActive}</p>
              </div>
            )}
          </div>
          <div className="flex gap-1 mt-2 text-[9px] text-ivory/40">
            {buckets.map((b, i) => (
              <div key={i} style={{ width: `${barW}%` }} className="text-center truncate">
                {i % stride === 0 ? b.label : ''}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 text-[10px]">
            <span className="flex items-center gap-1.5 text-ivory/60"><span className="w-2 h-2 rounded-sm bg-gold" /> On Track</span>
            <span className="flex items-center gap-1.5 text-ivory/60"><span className="w-2 h-2 rounded-sm bg-amber-500" /> Needs Attention</span>
            <span className="flex items-center gap-1.5 text-ivory/60"><span className="w-2 h-2 rounded-sm bg-ivory/25" /> Not Active</span>
          </div>
        </>
      )}

      {showTable && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-ivory/40 text-left border-b border-smoke">
                <th className="py-1.5 pr-3 font-medium">Period</th>
                <th className="py-1.5 pr-3 font-medium text-gold">On Track</th>
                <th className="py-1.5 pr-3 font-medium text-amber-400">Needs Attention</th>
                <th className="py-1.5 font-medium text-ivory/50">Not Active</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b, i) => (
                <tr key={i} className="border-b border-smoke/50 last:border-0">
                  <td className="py-1.5 pr-3 text-ivory/70">{b.label}</td>
                  <td className="py-1.5 pr-3 text-white">{b.onTrack}</td>
                  <td className="py-1.5 pr-3 text-white">{b.needsAttention}</td>
                  <td className="py-1.5 text-white">{b.notActive}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function SimpleBarChart({
  title,
  sub,
  buckets,
  format,
}: {
  title: string
  sub?: string
  buckets: { label: string; value: number }[]
  format?: (v: number) => string
}) {
  const { hover, setHover } = useHover()
  const [showTable, setShowTable] = useState(false)
  const max = Math.max(1, ...buckets.map((b) => b.value))
  const n = buckets.length
  const stride = labelStride(n)
  const barW = 100 / n
  const gap = barW * BAR_GAP_RATIO
  const fmt = format || ((v: number) => String(v))

  return (
    <div className="bg-charcoal rounded-xl border border-smoke p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <button onClick={() => setShowTable((v) => !v)} className="text-[10px] text-ivory/40 hover:text-gold uppercase tracking-wider">
          {showTable ? 'View chart' : 'View table'}
        </button>
      </div>
      {sub && <p className="text-ivory/40 text-[11px] mb-4">{sub}</p>}

      {!showTable && (
        <>
          <div className="relative">
            <svg viewBox={`0 0 100 ${CHART_H}`} preserveAspectRatio="none" className="w-full" style={{ height: CHART_H }}>
              {[0.25, 0.5, 0.75].map((f) => (
                <line key={f} x1={0} x2={100} y1={CHART_H * (1 - f)} y2={CHART_H * (1 - f)} className="stroke-smoke" strokeWidth={0.3} />
              ))}
              {buckets.map((b, i) => {
                const h = (b.value / max) * (CHART_H - 4)
                const x = i * barW + gap / 2
                const w = barW - gap
                return (
                  <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                    <rect x={x} y={0} width={w} height={CHART_H} fill="transparent" />
                    <rect x={x} y={CHART_H - Math.max(h, b.value > 0 ? 1.5 : 0.8)} width={w} height={Math.max(h, b.value > 0 ? 1.5 : 0.8)} rx={0.8} className={hover === i ? 'fill-gold' : 'fill-gold/70'} />
                  </g>
                )
              })}
            </svg>
            {hover !== null && (
              <div
                className="absolute -top-2 -translate-y-full bg-obsidian border border-smoke rounded-lg px-3 py-2 text-xs pointer-events-none z-10 whitespace-nowrap"
                style={{ left: `${(hover + 0.5) * barW}%`, transform: 'translate(-50%, -100%)' }}
              >
                <p className="text-white font-semibold">{buckets[hover].label}</p>
                <p className="text-gold">{fmt(buckets[hover].value)}</p>
              </div>
            )}
          </div>
          <div className="flex gap-1 mt-2 text-[9px] text-ivory/40">
            {buckets.map((b, i) => (
              <div key={i} style={{ width: `${barW}%` }} className="text-center truncate">
                {i % stride === 0 ? b.label : ''}
              </div>
            ))}
          </div>
        </>
      )}

      {showTable && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-ivory/40 text-left border-b border-smoke">
                <th className="py-1.5 pr-3 font-medium">Period</th>
                <th className="py-1.5 font-medium text-gold">Value</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b, i) => (
                <tr key={i} className="border-b border-smoke/50 last:border-0">
                  <td className="py-1.5 pr-3 text-ivory/70">{b.label}</td>
                  <td className="py-1.5 text-white">{fmt(b.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
