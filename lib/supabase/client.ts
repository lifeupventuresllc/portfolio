import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Strip ALL whitespace (incl. a line-break wrapped into the middle of the key),
  // which would otherwise make the fetch Authorization/apikey header value invalid.
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\s/g, ''),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.replace(/\s/g, '')
  )
}
