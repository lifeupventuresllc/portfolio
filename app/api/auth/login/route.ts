import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  // Start with a response we can attach cookies to
  const response = NextResponse.json({ success: true })

  // First, clear ALL existing auth cookies to nuke any stale tokens
  const allCookies = request.cookies.getAll()
  for (const cookie of allCookies) {
    if (cookie.name.startsWith('sb-') || cookie.name.includes('supabase') || cookie.name.includes('auth')) {
      response.cookies.set(cookie.name, '', { maxAge: 0, path: '/' })
    }
  }

  // Create a server-side Supabase client that writes cookies to this response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Return empty — we just nuked everything, start fresh
          return []
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  // Return success — the response already has fresh auth cookies set by Supabase
  return NextResponse.json({ success: true, redirect: '/' }, {
    status: 200,
    headers: response.headers,
  })
}
