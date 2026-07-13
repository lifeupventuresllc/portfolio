// Renders Coach Asa's voice/video reply. Audio → inline player; anything else → a watch link.
export default function CoachMedia({ url }: { url?: string | null }) {
  if (!url) return null
  const isAudio = /\.(mp3|m4a|ogg|wav|aac)(\?|$)/i.test(url)
  if (isAudio) {
    return <audio controls src={url} className="w-full mt-2" />
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="mt-2 inline-flex items-center gap-2 bg-obsidian border border-gold/40 text-gold px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gold/10 transition-colors">
      ▶ Watch Asa&apos;s reply
    </a>
  )
}
