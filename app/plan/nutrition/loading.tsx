// Slow network: the two photo cards' shapes right away, never a blank screen.
export default function NutritionLoading() {
  const block = { background: '#08281d', border: '1px solid #0d3a2a' }
  return (
    <div className="px-4 pt-6 flex flex-col" style={{ background: '#021F16', minHeight: 'calc(100dvh - 4.5rem - env(safe-area-inset-bottom))' }}>
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col gap-3.5 pb-4 animate-pulse motion-reduce:animate-none">
        <div className="h-8 mb-0.5 rounded" style={{ background: '#0d3a2a', width: '60%' }} />
        <div className="flex-1 rounded-3xl" style={block} />
        <div className="flex-1 rounded-3xl" style={block} />
      </div>
    </div>
  )
}
