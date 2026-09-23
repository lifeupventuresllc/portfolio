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

  // Real gap found live, 2026-09-23 (Asa's direct ask, TikTok as the
  // reference): the root address used to be a bare redirect straight to
  // /try, which itself bounces once more to whatever real page she wanted
  // — two real, visible address-bar changes before she ever saw the app.
  // TikTok never changes its address for this: you land on tiktok.com,
  // full app, right there, logged in or not. A REWRITE (not a redirect)
  // does the same thing here — Next.js serves different real content
  // underneath, but the browser's own address bar never moves off "/".
  //  - Already has any session (anonymous or real): serve /plan's real
  //    content right there at "/" — same page, same logic, just a
  //    different address showing it.
  //  - No session at all yet: serve /try's real bootstrap (unchanged,
  //    still the one real place a session gets created) — still under
  //    "/", never a visible /try in the bar. /try's own client code ends
  //    by reloading whichever `to` it was given; pointing it back at "/"
  //    means that one real reload also never leaves "/".
  if (pathname === '/') {
    const target = user ? '/plan' : '/try?to=%2F'
    return NextResponse.rewrite(new URL(target, request.url))
  }

  // Redirect unauthenticated users away from protected routes
  const protectedRoutes = ['/content', '/admin', '/plan']
  if (protectedRoutes.some(route => pathname.startsWith(route)) && !user) {
    // Real gap found live: this fired for a genuinely fresh visitor hitting
    // /plan/today directly (no session at all, not even anonymous — e.g. a
    // shared/direct link) BEFORE the page's own code ever ran, sending her
    // to a forced /login screen — contradicting the app's own "no signup
    // wall" anonymous-access design that every other entry point already
    // honors via /try. Scoped to just this one page (not the rest of
    // /plan, and never /admin or /content, which must keep requiring a
    // real account) since that's what was actually asked for.
    //
    // Real gap found live (Asa's report, 2026-09-07): bare /plan — the
    // literal link she shares with real testers — had the exact same bug.
    // /plan/page.tsx already renders a full anonymous-friendly dashboard
    // (root "/" itself gets there via /try today), so this was purely a
    // middleware gap, not a page-level requirement for a real account.
    // Added alongside /plan/today rather than switching the `some()` check
    // to a blanket /plan prefix, since deeper routes (/plan/coach,
    // /plan/checkin, etc.) haven't been individually confirmed safe for an
    // anonymous session the same way these two have.
    if (pathname === '/plan/today' || pathname === '/plan') {
      const tryUrl = new URL('/try', request.url)
      tryUrl.searchParams.set('to', pathname)
      return NextResponse.redirect(tryUrl)
    }
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
