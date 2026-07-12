import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // .trim() guards against a stray newline/space in the env var, which would
  // otherwise make the fetch Authorization/apikey header value invalid.
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()
  )
}
