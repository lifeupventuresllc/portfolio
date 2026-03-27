import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError) {
      return NextResponse.json({ status: 'error', error: userError.message })
    }

    if (!user) {
      return NextResponse.json({ status: 'no_user' })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      status: 'ok',
      user: { id: user.id, email: user.email },
      profile: profile || null,
      profileError: profileError?.message || null,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ status: 'exception', error: msg })
  }
}
