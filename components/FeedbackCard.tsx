'use client'

import QuickFeedback from '@/components/QuickFeedback'

// The permanent, always-visible feedback surface on the main dashboard — not a
// popup she has to trigger or wait for, just a normal card like the calorie/
// workout cards. Part of the 3-surface feedback design (dashboard card + the
// post-workout/meal/check-in moments + the floating nudge) so she always has an
// obvious place to give her voice, not just when something happens to prompt it.
export default function FeedbackCard() {
  return (
    <div className="rounded-2xl border border-gold/25 bg-charcoal/80 backdrop-blur-md px-5 py-4 text-center">
      <p className="text-gold text-[9px] uppercase tracking-[0.25em] font-semibold mb-1">Your Voice</p>
      <p className="text-white text-sm font-medium">How&apos;s the app working for you?</p>
      <QuickFeedback category="general" context="Dashboard card" dark />
    </div>
  )
}
