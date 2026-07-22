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
  const bare = pathname?.startsWith('/admin/founder') || pathname?.startsWith('/plan')

  if (bare) {
    return (
      <main className="flex-1">
        {children}
        {pathname?.startsWith('/plan') && <FeedbackNudge />}
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
