import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  // Create the response we'll return — cookies get set directly on this
  const response = NextResponse.json({ success: true, redirect: '/' })

  // Clear ALL existing auth cookies to nuke any stale tokens
  const allCookies = request.cookies.getAll()
  for (const cookie of allCookies) {
    if (cookie.name.startsWith('sb-') || cookie.name.includes('supabase') || cookie.name.includes('auth')) {
      response.cookies.set(cookie.name, '', { maxAge: 0, path: '/' })
    }
  }

  // Create a server-side Supabase client that writes cookies to this response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\s/g, ''),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.replace(/[^A-Za-z0-9._-]/g, ''),
    {
      cookies: {
        getAll() {
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

  // Return the same response object that has the cookies attached
  return response
}
