// Slow network: skeleton cards right away, never a blank screen.
export default function NutritionLoading() {
  const block = { background: '#08281d', border: '1px solid #0d3a2a' }
  return (
    <div className="min-h-[100dvh] px-4 pt-6 pb-28" style={{ background: '#021F16' }}>
      <div className="max-w-md mx-auto animate-pulse motion-reduce:animate-none">
        <div className="h-4 mb-6 rounded" style={{ background: '#0d3a2a', width: '60%' }} />
        <div className="h-7 mb-3 rounded" style={{ background: '#0d3a2a', width: '50%' }} />
        <div className="h-4 mb-5 rounded" style={{ background: '#0d3a2a', width: '85%' }} />
        <div className="h-36 mb-3 rounded-[20px]" style={block} />
        <div className="h-36 rounded-[20px]" style={block} />
      </div>
    </div>
  )
}
