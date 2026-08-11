'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-3">Something went wrong</p>
        <h1 className="text-2xl font-bold text-white mb-3">That wasn&apos;t supposed to happen</h1>
        <p className="text-ivory/50 text-sm mb-6">No data was lost — try again, and if it keeps happening, reach out to Coach Asa.</p>
        <button onClick={reset} className="bg-gold text-obsidian px-6 py-3 font-bold text-xs uppercase tracking-wider rounded-xl">
          Try again
        </button>
      </div>
    </div>
  )
}
