import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Strip ALL whitespace (incl. a line-break wrapped into the middle of the key),
  // which would otherwise make the fetch Authorization/apikey header value invalid.
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\s/g, ''),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.replace(/[^A-Za-z0-9._-]/g, '')
  )
}

// Real gap found live, 2026-09-09 (caught by an independent regression
// review of the sign-out fix, then verified directly against the installed
// @supabase/auth-js source): signOut()'s own _signOut() only clears the
// LOCAL session after its server-side /logout call succeeds -- if that
// call fails with a genuine network error (offline, timeout -- exactly the
// kind of connectivity a fitness app hits at a gym), signOut() resolves
// without throwing but returns BEFORE ever clearing local storage/cookies,
// so a hard navigation right after it still loads with the old session
// still valid -- the exact "stale signed-in identity after Sign Out" bug
// resurfacing via a different path than the one already fixed. Mirrors
// app/clear-session/page.tsx's own belt-and-suspenders clearing (that page
// already did this; the three handleSignOut functions modeled themselves
// on its hard-navigation pattern but not this part of it) -- always wipe
// every sb-/supabase local key and cookie directly, regardless of whether
// the network call to Supabase actually succeeded.
export function clearLocalSession() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.includes('supabase') || key.includes('sb-')) localStorage.removeItem(key)
    }
  } catch { /* ignore */ }
  try {
    document.cookie.split(';').forEach((c) => {
      const name = c.trim().split('=')[0]
      if (name.includes('sb-') || name.includes('supabase')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
      }
    })
  } catch { /* ignore */ }
}
