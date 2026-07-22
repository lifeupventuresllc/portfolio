const TILES = ['/videos/tile-1.mp4', '/videos/tile-2.mp4', '/videos/tile-3.mp4', '/videos/tile-4.mp4', '/videos/tile-5.mp4']

export default function VideoTileRow() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory sm:overflow-visible sm:pb-0">
      {TILES.map((src) => (
        <div key={src} className="shrink-0 w-32 sm:w-auto sm:flex-1 aspect-[9/16] rounded-2xl overflow-hidden border border-smoke/50 snap-start">
          <video autoPlay muted loop playsInline preload="auto" className="w-full h-full object-cover">
            <source src={src} type="video/mp4" />
          </video>
        </div>
      ))}
    </div>
  )
}
