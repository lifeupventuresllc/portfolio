import { redirect } from 'next/navigation'

// Asa's explicit call, 2026-09-02: "no website page, no landing page — just
// the actual working app, just like TikTok." Hands off to the same
// anonymous-entry mechanism every marketing CTA already used
// (app/try/page.tsx: creates a real anonymous Supabase session if she
// doesn't have one, provisions her enrollment, lands her in /plan) —
// reused here, not duplicated, so there's exactly one place that logic
// lives. The old marketing landing page's content is gone from this route
// entirely, not just hidden behind it.
export default function RootPage() {
  redirect('/try?to=/plan')
}
