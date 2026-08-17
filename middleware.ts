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

  // Real login-loop bug, found here: getUser() throwing on ANY error —
  // including a transient network blip or Supabase edge hiccup, not just a
  // genuinely invalid token — used to wipe every auth cookie immediately.
  // Right after a fresh Google sign-in, the callback route has JUST set
  // those cookies; if this middleware's very next request hit a one-off
  // transient failure calling Supabase (not uncommon on Vercel's edge
  // runtime), it would delete the legitimate, freshly-set session, bounce
  // her back to /login, and repeating the same OAuth flow would hit the
  // same odds of the same transient failure again — a real "Google ->
  // login -> Google -> loop" pattern, not a guess. A transient failure and
  // a genuinely stale/invalid token are different problems; only the
  // second one should ever justify destroying cookies. Now just treats a
  // failed check as "unauthenticated for this one request" (the existing
  // protected-route redirect below already handles that safely) without
  // touching cookies at all — a real bad token simply fails the same way
  // on the next request too, which is a redirect-to-login, not a lockout.
  let user = null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error
    user = data.user
  } catch { /* treated as unauthenticated for this request only, see above */ }
  const pathname = request.nextUrl.pathname

  // Redirect unauthenticated users away from protected routes
  const protectedRoutes = ['/content', '/admin', '/plan']
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

  // (No "redirect authenticated users away from /login" block here — the
  // matcher below excludes login/signup from middleware entirely, so that
  // logic could never actually run. Removed rather than left as dead code.)

  return response
}

export const config = {
  matcher: [
    '/((?!monitoring|_next/static|_next/image|favicon.ico|clear-session|login|signup|reset-password|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
