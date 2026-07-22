export default function HeroVideoBG({ src, opacity = 0.55 }: { src: string; opacity?: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="w-full h-full object-cover"
      >
        <source src={src} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-paper" style={{ opacity }} />
    </div>
  )
}
