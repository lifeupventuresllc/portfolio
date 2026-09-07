import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { ensureEnrollmentAndWelcome } from '@/lib/auth-onboarding'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/'

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\s/g, ''),
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.replace(/[^A-Za-z0-9._-]/g, ''),
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({ name, value: '', ...options })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('exchangeCodeForSession failed:', error.message, error.status)
      return NextResponse.redirect(`${origin}/login?error=auth&reason=${encodeURIComponent(error.message)}`)
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await ensureEnrollmentAndWelcome(user)

      // Real gap found live (Asa's report, 2026-09-07): a brand-new Google
      // sign-up always landed back on the dashboard, which then required a
      // SECOND "Get Started" tap just to reach the very intake form that
      // tap already meant to start — pure click friction at exactly the
      // moment a new user is most likely to bounce. Send her straight to
      // intake instead, but only when `next` is still the generic
      // dashboard default (an explicit deep-link `next` is left alone) and
      // she genuinely hasn't completed intake yet — a returning, already-
      // onboarded user lands on the dashboard as normal.
      if (next === '/plan' || next === '/') {
        const svc = createServiceClient()
        const { data: enrollment } = await svc.from('challenge_enrollments').select('intake_completed').eq('user_id', user.id).maybeSingle()
        if (enrollment && !enrollment.intake_completed) {
          response.headers.set('Location', `${origin}/plan/intake`)
        }
      }
    }

    return response
  }

  return NextResponse.redirect(`${origin}/login?error=auth&reason=missing_code`)
}
