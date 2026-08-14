'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AffiliatePage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [referralCode, setReferralCode] = useState('')

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Check if user exists
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Please log in first to become an affiliate.')
        setLoading(false)
        return
      }

      // Check if already an affiliate
      const { data: existing } = await supabase
        .from('affiliates')
        .select('code')
        .eq('user_id', user.id)
        .single()

      if (existing) {
        setReferralCode(existing.code)
        setSubmitted(true)
        setLoading(false)
        return
      }

      // Generate a referral code from email
      const code = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + Math.random().toString(36).slice(-4)

      const { error: insertError } = await supabase
        .from('affiliates')
        .insert({
          user_id: user.id,
          code,
          commission_rate: 10,
          active: true,
        })

      if (insertError) throw insertError

      setReferralCode(code)
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    const referralLink = `https://www.asaluke.io/funnel?ref=${referralCode}`
    return (
      <div className="min-h-[100dvh] bg-obsidian pt-20 pb-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <div style={{ fontSize: 48, marginBottom: 16 }}>&#127881;</div>
          <h1 className="text-3xl font-bold text-gold mb-4">You&apos;re In</h1>
          <p className="text-ivory/60 mb-6">Share your referral link and earn 10% commission on every client you send.</p>

          <div className="bg-charcoal border border-smoke rounded-lg p-4 mb-6">
            <p className="text-xs text-ivory/40 mb-2">Your Referral Link</p>
            <p className="text-gold text-sm font-mono break-all">{referralLink}</p>
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(referralLink)
              alert('Copied to clipboard!')
            }}
            className="w-full py-3 rounded-lg bg-gold text-obsidian font-bold hover:opacity-90 transition-opacity"
          >
            Copy Link
          </button>

          <div className="mt-8 text-left bg-charcoal border border-smoke rounded-lg p-6">
            <h3 className="text-white font-semibold mb-3">How It Works</h3>
            <div className="space-y-3 text-sm text-ivory/60">
              <p>1. Share your link with anyone who needs content editing, audio engineering, or fitness coaching.</p>
              <p>2. When they sign up and purchase through your link, you earn <span className="text-gold font-semibold">10% commission</span>.</p>
              <p>3. Commissions are tracked automatically and paid out monthly.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-obsidian pt-20 pb-16 px-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2 text-center">
          Become an <span className="text-gold">Affiliate</span>
        </h1>
        <p className="text-ivory/60 text-center mb-10">
          Earn 10% commission for every client you refer. No cap on earnings.
        </p>

        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { num: '10%', label: 'Commission' },
            { num: '$0', label: 'To Join' },
            { num: '30d', label: 'Cookie Window' },
          ].map(item => (
            <div key={item.label} className="bg-charcoal border border-smoke rounded-xl p-4 text-center">
              <p className="text-gold text-xl font-bold">{item.num}</p>
              <p className="text-ivory/40 text-xs mt-1">{item.label}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-ivory/80 text-sm font-medium mb-1">Your Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-charcoal border border-smoke text-white placeholder-ivory/40 focus:border-gold focus:outline-none"
              placeholder="you@email.com"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-lg bg-gold text-obsidian font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Setting up...' : 'Get My Referral Link'}
          </button>

          <p className="text-ivory/30 text-xs text-center">
            You must have an account to become an affiliate. <a href="/signup" className="text-gold hover:underline">Sign up here</a> if you don&apos;t have one.
          </p>
        </form>
      </div>
    </div>
  )
}
