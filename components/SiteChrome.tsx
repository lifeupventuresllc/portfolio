'use client'

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'
import SiteFooter from './SiteFooter'

// Renders the marketing chrome (nav + footer) on every page EXCEPT the
// Founder OS cockpit at /admin/founder, which is a standalone, focused
// workspace with no site nav.
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const bare = pathname?.startsWith('/admin/founder')

  if (bare) {
    return <main className="flex-1">{children}</main>
  }

  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  )
}
