'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

type AuthFormProps = {
  mode: 'login' | 'signup' | 'reset'
}

export default function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)

  // Fresh non-singleton client to avoid any cached state.
  // Sanitize the env values: the anon key is a JWT (only [A-Za-z0-9._-]) — strip ANY
  // other char (a stray newline/invisible char baked into the env var was making the
  // fetch Authorization header value invalid and blocking every login).
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\s/g, ''),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.replace(/[^A-Za-z0-9._-]/g, ''),
    { isSingleton: false }
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error

        // Default members straight to their dashboard (honor an explicit ?redirect= first)
        const params = new URLSearchParams(window.location.search)
        const redirect = params.get('redirect') || '/plan'
        window.location.href = redirect
      } else if (mode === 'signup') {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters')
        }
        if (!accepted) {
          throw new Error('Please accept the Terms of Service and EULA to create your account.')
        }
        // Carry ?redirect= through to the confirmation link so paying customers
        // land back on /plan/intake (or wherever they came from) instead of the
        // homepage once they confirm their email — was previously dropped here.
        const params = new URLSearchParams(window.location.search)
        const redirect = params.get('redirect') || '/plan'
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(redirect)}`,
          },
        })
        if (error) throw error
        setMessage('Check your email to confirm your account.')
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password?step=update`,
        })
        if (error) throw error
        setMessage('Check your email for a password reset link.')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError(null)
    if (mode === 'signup' && !accepted) {
      setError('Please accept the Terms of Service and EULA to continue.')
      return
    }
    setLoading(true)
    const params = new URLSearchParams(window.location.search)
    const redirect = params.get('redirect') || '/plan'
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(redirect)}` },
    })
    if (error) { setError(error.message); setLoading(false) }
    // On success the browser redirects to Google, so no further handling here.
  }

  const titles = {
    login: 'Log In',
    signup: 'Create Account',
    reset: 'Reset Password',
  }

  // Anchored to a fixed top offset, not vertically centered — centering inside
  // min-h-screen means the card re-centers (visibly shifts) every time the
  // mobile keyboard changes the visible viewport height, which reads as the
  // screen "shaking" while typing. A fixed top position never moves.
  return (
    <div className="min-h-screen flex justify-center pt-20 px-6">
      <div className="w-full max-w-md p-8 bg-charcoal rounded-2xl border border-smoke">
        <h1 className="text-2xl font-bold text-center text-white mb-6">{titles[mode]}</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ivory/60 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-obsidian border border-smoke rounded-xl text-white placeholder-ivory/30 focus:outline-none focus:border-gold transition-colors"
              placeholder="you@example.com"
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ivory/60 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-obsidian border border-smoke rounded-xl text-white placeholder-ivory/30 focus:outline-none focus:border-gold transition-colors"
                placeholder="••••••••"
              />
            </div>
          )}

          {mode === 'signup' && (
            <label className="flex items-start gap-3 text-sm text-ivory/60 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 flex-none accent-gold cursor-pointer"
              />
              <span>
                I agree to the{' '}
                <Link href="/terms" target="_blank" className="text-gold hover:underline">Terms of Service</Link>,{' '}
                <Link href="/eula" target="_blank" className="text-gold hover:underline">EULA</Link>, and{' '}
                <Link href="/privacy" target="_blank" className="text-gold hover:underline">Privacy Policy</Link>.
              </span>
            </label>
          )}

          <button
            type="submit"
            disabled={loading || (mode === 'signup' && !accepted)}
            className="w-full bg-gold text-obsidian py-3 rounded-xl font-bold uppercase tracking-wider hover:bg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Loading...' : titles[mode]}
          </button>
        </form>

        {mode !== 'reset' && (
          <>
            <div className="flex items-center gap-3 my-5">
              <div className="h-px bg-smoke flex-1" />
              <span className="text-ivory/30 text-xs uppercase tracking-wider">or</span>
              <div className="h-px bg-smoke flex-1" />
            </div>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading || (mode === 'signup' && !accepted)}
              className="w-full flex items-center justify-center gap-3 bg-white text-obsidian py-3 rounded-xl font-semibold hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
              </svg>
              Continue with Google
            </button>
          </>
        )}

        <div className="mt-6 text-center text-sm text-ivory/40 space-y-2">
          {mode === 'login' && (
            <>
              <p>
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="text-gold hover:text-gold/70 transition-colors">Sign up</Link>
              </p>
              <p>
                <Link href="/reset-password" className="text-gold hover:text-gold/70 transition-colors">
                  Forgot password?
                </Link>
              </p>
            </>
          )}
          {mode === 'signup' && (
            <p>
              Already have an account?{' '}
              <Link href="/login" className="text-gold hover:text-gold/70 transition-colors">Log in</Link>
            </p>
          )}
          {mode === 'reset' && (
            <p>
              <Link href="/login" className="text-gold hover:text-gold/70 transition-colors">Back to login</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
