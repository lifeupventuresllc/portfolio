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
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user?.email) {
        // Check if welcome email was already sent
        const service = createServiceClient()
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
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
