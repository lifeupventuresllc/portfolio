import Link from 'next/link'

// Site-wide footer with permanent legal links. Rendered from the root layout
// so Terms / EULA / Privacy are reachable from every page.
export default function SiteFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-smoke bg-obsidian px-4 py-8 mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
        <p className="text-ivory/40">&copy; {year} Life-Up Ventures LLC</p>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-ivory/50">
          <Link href="/terms" className="hover:text-gold transition-colors">Terms of Service</Link>
          <Link href="/eula" className="hover:text-gold transition-colors">EULA</Link>
          <Link href="/privacy" className="hover:text-gold transition-colors">Privacy</Link>
          <a href="mailto:info.lifeupventures@gmail.com" className="hover:text-gold transition-colors">Contact</a>
        </nav>
      </div>
    </footer>
  )
}
