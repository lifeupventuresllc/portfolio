'use client'

import Link from 'next/link'

export default function SessionExpiredNotice() {
  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-center">
      <p className="text-amber-300 text-sm font-semibold mb-1">You&apos;ve been signed out</p>
      <Link href="/login?redirect=/plan/today" className="text-gold text-xs underline">Sign back in →</Link>
    </div>
  )
}
