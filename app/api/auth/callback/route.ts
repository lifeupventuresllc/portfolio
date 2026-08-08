import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { sendWelcomeEmail } from '@/lib/email'
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

    if (user?.email) {
      const service = createServiceClient()

      // The app is free now — every new account gets a real, fully-active
      // enrollment immediately, no Stripe checkout required. Idempotent:
      // matches an existing row by user_id first, then links by email for
      // the rare guest-purchase-then-signup case, before creating a new one.
      let { data: enrollment } = await service.from('challenge_enrollments').select('id').eq('user_id', user.id).maybeSingle()
      if (!enrollment) {
        const { data: byEmail } = await service.from('challenge_enrollments').select('id').eq('email', user.email).is('user_id', null).maybeSingle()
        if (byEmail) {
          await service.from('challenge_enrollments').update({ user_id: user.id }).eq('id', byEmail.id)
          enrollment = byEmail
        }
      }
      if (!enrollment) {
        await service.from('challenge_enrollments').insert({
          user_id: user.id,
          email: user.email,
          name: (user.user_metadata?.full_name as string | undefined) || user.email.split('@')[0],
          tier: 'inner_circle', status: 'active', amount: 0,
          tier_started_at: new Date().toISOString(), started_at: new Date().toISOString(),
        })
      }

      // Check if welcome email was already sent
      const { data: existing } = await service
        .from('emails')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'welcome')
        .limit(1)

      if (!existing || existing.length === 0) {
        await sendWelcomeEmail(user.email)
        await service.from('emails').insert({
          user_id: user.id,
          email: user.email,
          type: 'welcome',
        })
      }
    }

    return response
  }

  return NextResponse.redirect(`${origin}/login?error=auth&reason=missing_code`)
}
