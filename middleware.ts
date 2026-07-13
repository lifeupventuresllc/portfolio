import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\s/g, ''),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.replace(/[^A-Za-z0-9._-]/g, ''),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Capture affiliate referral code
  const ref = request.nextUrl.searchParams.get('ref')
  if (ref) {
    response.cookies.set('affiliate_ref', ref, {
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
  }

  let user = null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error
    user = data.user
  } catch {
    // Invalid/stale token — clear ALL auth cookies so this doesn't repeat
    const cookieNames = request.cookies.getAll().map(c => c.name)
    for (const name of cookieNames) {
      if (name.startsWith('sb-') || name.includes('supabase') || name.includes('auth')) {
        response.cookies.set(name, '', { maxAge: 0, path: '/' })
      }
    }
  }
  const pathname = request.nextUrl.pathname

  // Redirect unauthenticated users away from protected routes
  const protectedRoutes = ['/content', '/admin']
  if (protectedRoutes.some(route => pathname.startsWith(route)) && !user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Admin route protection (admin + support roles allowed)
  if (pathname.startsWith('/admin') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile?.role || !['admin', 'support'].includes(profile.role)) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Redirect authenticated users away from auth pages
  const authRoutes = ['/login', '/signup']
  if (authRoutes.includes(pathname) && user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|clear-session|login|signup|reset-password|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
