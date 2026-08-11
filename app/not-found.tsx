import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-3">404</p>
        <h1 className="text-2xl font-bold text-white mb-3">Can&apos;t find that page</h1>
        <p className="text-ivory/50 text-sm mb-6">Let&apos;s get you back on track.</p>
        <Link href="/plan" className="inline-block bg-gold text-obsidian px-6 py-3 font-bold text-xs uppercase tracking-wider rounded-xl">
          Back to my plan
        </Link>
      </div>
    </div>
  )
}
