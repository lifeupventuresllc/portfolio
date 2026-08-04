'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// The 3 things she reaches for most, one tap away, always in the same place —
// zero decisions about where to find anything. Everything else (cookbook,
// exercise library, extras) still lives one layer deeper via the ☰ menu on
// the main dashboard; this bar is just the daily-use fast path.
const TABS = [
  { href: '/plan/today', label: 'Today', icon: '☀️', match: (p: string) => p === '/plan' || p.startsWith('/plan/today') },
  { href: '/plan/checkin', label: 'Progress', icon: '📈', match: (p: string) => p.startsWith('/plan/checkin') || p.startsWith('/plan/achievements') },
  { href: '/plan/community', label: 'Community', icon: '💛', match: (p: string) => p.startsWith('/plan/community') },
]

export default function BottomTabBar() {
  const pathname = usePathname() || ''
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-charcoal border-t border-smoke pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-2xl mx-auto grid grid-cols-3">
        {TABS.map((t) => {
          const active = t.match(pathname)
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold transition-colors ${active ? 'text-gold' : 'text-ivory/40 hover:text-ivory/70'}`}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              {t.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
