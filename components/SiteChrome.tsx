'use client'

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'
import SiteFooter from './SiteFooter'
import FeedbackNudge from './FeedbackNudge'

// Renders the marketing chrome (nav + footer) on marketing pages only. The member
// app (/plan/*) and the Founder OS cockpit (/admin/founder) are standalone, focused
// app shells with NO marketing nav/footer — so they feel like their own app, and the
// marketing logo can't hijack in-app navigation.
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // '/' included alongside '/plan' — 2026-09-23's root-stays-the-address
  // change (middleware.ts) serves the real app there via a rewrite, so a
  // visitor's visible browser pathname can legitimately just be '/'; it
  // must get the same bare, chrome-free app shell '/plan' already does,
  // never the marketing nav/footer.
  const isPlan = pathname === '/' || pathname?.startsWith('/plan')
  const bare = pathname?.startsWith('/admin/founder') || isPlan

  if (bare) {
    return (
      <main className="flex-1">
        {children}
        {isPlan && <FeedbackNudge />}
      </main>
    )
  }

  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  )
}
