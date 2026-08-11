'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { mapAuthError } from '@/lib/auth-errors'
import AuthForm from '@/components/AuthForm'

function UpdatePasswordForm() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const supabase = createClient()

  // A reset link only works once and expires — if she lands here without a live
  // recovery session (link already used, or too old), the update call below would
  // just throw a raw Supabase error with no way back. Check up front instead.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session)
      setSessionChecked(true)
    })
  }, [supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters')
      }
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setMessage('Password updated successfully.')
    } catch (err: unknown) {
      setError(mapAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  if (sessionChecked && !hasSession) {
    return (
      <div className="min-h-screen flex justify-center pt-20 px-6">
        <div className="w-full max-w-md p-8 bg-charcoal rounded-2xl border border-smoke text-center">
          <h1 className="text-2xl font-bold text-white mb-2">This link has expired</h1>
          <p className="text-ivory/50 text-sm mb-6">Password reset links only work once and expire after a while. Request a new one and we&apos;ll send it right over.</p>
          <Link href="/reset-password" className="inline-block bg-gold text-obsidian px-6 py-3 font-bold text-xs uppercase tracking-wider rounded-xl">
            Request a new link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex justify-center pt-20 px-6">
      <div className="w-full max-w-md p-8 bg-charcoal rounded-2xl border border-smoke">
        <h1 className="text-2xl font-bold text-center text-white mb-6">Set New Password</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm">
            {message}{' '}
            <Link href="/login" className="underline font-semibold">Log in →</Link>
          </div>
        )}

        {!message && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ivory/60 mb-1">
                New Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-obsidian border border-smoke rounded-xl text-white text-base placeholder-ivory/30 focus:outline-none focus:border-gold transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold text-obsidian py-3 rounded-xl font-bold uppercase tracking-wider hover:bg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const step = searchParams.get('step')

  return step === 'update' ? <UpdatePasswordForm /> : <div className="py-12 px-4"><AuthForm mode="reset" /></div>
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="py-12 px-4 text-center">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}
