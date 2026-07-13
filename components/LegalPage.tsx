import Link from 'next/link'

// Shared shell for the legal pages (Terms, EULA, Privacy) — consistent brand
// styling + readable measure. Content is passed as children.
export default function LegalPage({
  title, updated, children,
}: {
  title: string
  updated: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-obsidian px-4 pt-28 pb-24">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-ivory/40 text-xs hover:text-gold mb-4 inline-block">← Back to home</Link>
        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-2">Legal</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{title}</h1>
        <p className="text-ivory/40 text-sm mb-10">Last updated {updated}</p>
        <div className="legal-body space-y-6 text-ivory/70 text-[15px] leading-relaxed">
          {children}
        </div>
        <div className="mt-14 pt-6 border-t border-smoke text-ivory/40 text-xs flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/terms" className="hover:text-gold">Terms of Service</Link>
          <Link href="/eula" className="hover:text-gold">EULA</Link>
          <Link href="/privacy" className="hover:text-gold">Privacy Policy</Link>
          <span className="ml-auto">Questions? info.lifeupventures@gmail.com</span>
        </div>
      </div>
    </div>
  )
}

// Small helpers so each page reads as clean prose.
export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-white font-bold text-lg pt-2">{children}</h2>
}
