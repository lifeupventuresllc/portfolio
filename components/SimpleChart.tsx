'use client'

type DataPoint = {
  label: string
  value: number
}

type SimpleChartProps = {
  data: DataPoint[]
  title: string
  formatValue?: (value: number) => string
}

export default function SimpleChart({ data, title, formatValue }: SimpleChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400">No data yet</p>
      ) : (
        <div className="space-y-2">
          {data.map((point, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-16 shrink-0 text-right">{point.label}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all"
                  style={{ width: `${(point.value / maxValue) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-700 w-16 shrink-0">
                {formatValue ? formatValue(point.value) : point.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
