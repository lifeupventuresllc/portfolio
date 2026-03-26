'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
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

  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (mode === 'login') {
        // Clear any stale session before attempting login
        await supabase.auth.signOut()
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error

        const params = new URLSearchParams(window.location.search)
        const redirect = params.get('redirect') || '/'
        router.push(redirect)
        router.refresh()
      } else if (mode === 'signup') {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters')
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/api/auth/callback`,
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

  const titles = {
    login: 'Log In',
    signup: 'Create Account',
    reset: 'Reset Password',
  }

  return (
    <div className="min-h-screen flex items-center justify-center pt-20 px-6">
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-obsidian border border-smoke rounded-xl text-white placeholder-ivory/30 focus:outline-none focus:border-gold transition-colors"
                placeholder="••••••••"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold text-obsidian py-3 rounded-xl font-bold uppercase tracking-wider hover:bg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Loading...' : titles[mode]}
          </button>
        </form>

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
