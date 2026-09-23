'use client'

import { Suspense } from 'react'
import AuthForm from '@/components/AuthForm'

// The other half of "TikTok never leaves the address bar" (2026-09-23,
// Asa's direct ask): a real account already existing shouldn't require
// leaving wherever she is just to reach the sign-in form. This is the
// SAME real AuthForm every other real auth surface (/login, /signup) uses
// — no second copy of the actual sign-in logic, just a different shell
// around it. A successful sign-in still ends in a real page load
// (AuthForm's own window.location.href) — that part is normal and
// expected, same as TikTok's own login still lands you back on the feed;
// what this avoids is navigating AWAY just to see the option at all.
export default function SignInModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto" style={{ background: 'rgba(0,0,0,0.72)' }}>
      <button aria-label="Close" onClick={onClose} className="fixed inset-0 cursor-default" tabIndex={-1} />
      <div className="relative w-full max-w-md mt-10 mb-10 mx-4">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-lg"
          style={{ background: '#0A0A0F', border: '1px solid rgba(229,169,60,0.5)', color: '#E5A93C' }}
        >
          &times;
        </button>
        <Suspense fallback={<div className="p-8 bg-charcoal rounded-2xl border border-smoke text-center text-ivory/50">Loading…</div>}>
          <AuthForm mode="login" embedded />
        </Suspense>
      </div>
    </div>
  )
}
