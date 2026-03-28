'use client'

import { useState } from 'react'

type NicheLandingProps = {
  headline: string
  subheadline: string
  painPoints: string[]
  solution: string[]
  ctaText: string
  service: 'content' | 'audio'
  source: string
  steps: { title: string; desc: string }[]
}

export default function NicheLanding({ headline, subheadline, painPoints, solution, ctaText, service, source, steps }: NicheLandingProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [instagram, setInstagram] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !email) return
    setLoading(true)

    try {
      await fetch('/api/funnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, service, source, instagram }),
      })
      setSubmitted(true)
    } catch {
      // Silently fail — lead is captured in localStorage below
    } finally {
      setLoading(false)
    }

    // Backup to localStorage
    const leads = JSON.parse(localStorage.getItem('niche_leads') || '[]')
    leads.push({ name, email, instagram, service, source, date: new Date().toISOString() })
    localStorage.setItem('niche_leads', JSON.stringify(leads))
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-obsidian pt-20 px-6">
        <div className="max-w-2xl mx-auto text-center py-20">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">You&apos;re In!</h1>
          <p className="text-ivory/60 text-lg mb-8">
            Check your email — we&apos;ll be in touch within 24 hours with your free sample.
          </p>
          <a
            href="/funnel"
            className="inline-block bg-gold text-obsidian px-8 py-3 rounded-xl font-bold uppercase tracking-wider hover:bg-gold/90 transition-colors"
          >
            Download Free Guides While You Wait
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-obsidian pt-20">
      {/* Hero */}
      <section className="px-6 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-6">
            {headline}
          </h1>
          <p className="text-lg md:text-xl text-ivory/60 mb-10">
            {subheadline}
          </p>
          <a href="#get-started" className="inline-block bg-gold text-obsidian px-8 py-4 rounded-xl font-bold uppercase tracking-wider hover:bg-gold/90 transition-colors text-lg">
            {ctaText}
          </a>
        </div>
      </section>

      {/* Pain Points */}
      <section className="px-6 py-16 bg-charcoal/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-10">Sound Familiar?</h2>
          <div className="space-y-4">
            {painPoints.map((point, i) => (
              <div key={i} className="flex items-start gap-4 p-4 bg-charcoal rounded-xl border border-smoke">
                <span className="text-red-400 text-xl mt-0.5">✗</span>
                <p className="text-ivory/70">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-10">Here&apos;s What We Do For You</h2>
          <div className="space-y-4">
            {solution.map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-4 bg-charcoal rounded-xl border border-smoke">
                <span className="text-emerald-400 text-xl mt-0.5">✓</span>
                <p className="text-ivory/70">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-16 bg-charcoal/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-10">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <div key={i} className="text-center p-6 bg-charcoal rounded-xl border border-smoke">
                <div className="w-10 h-10 bg-gold/20 text-gold rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
                  {i + 1}
                </div>
                <h3 className="text-white font-semibold mb-2">{step.title}</h3>
                <p className="text-ivory/50 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="px-6 py-12">
        <p className="text-center text-ivory/30 text-sm uppercase tracking-wider">
          Trusted by creators, restaurants, and artists across Los Angeles
        </p>
      </section>

      {/* Form */}
      <section id="get-started" className="px-6 py-16">
        <div className="max-w-md mx-auto">
          <div className="bg-charcoal rounded-2xl border border-smoke p-8">
            <h2 className="text-xl font-bold text-white text-center mb-2">Get Your Free Sample</h2>
            <p className="text-ivory/40 text-sm text-center mb-6">No commitment. No credit card. Just results.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-obsidian border border-smoke rounded-xl text-white placeholder-ivory/30 focus:outline-none focus:border-gold transition-colors"
              />
              <input
                type="email"
                placeholder="Your Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-obsidian border border-smoke rounded-xl text-white placeholder-ivory/30 focus:outline-none focus:border-gold transition-colors"
              />
              <input
                type="text"
                placeholder="Instagram Handle (optional)"
                value={instagram}
                onChange={e => setInstagram(e.target.value)}
                className="w-full px-4 py-3 bg-obsidian border border-smoke rounded-xl text-white placeholder-ivory/30 focus:outline-none focus:border-gold transition-colors"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gold text-obsidian py-3 rounded-xl font-bold uppercase tracking-wider hover:bg-gold/90 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Submitting...' : ctaText}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-6 py-12 border-t border-smoke">
        <p className="text-center text-ivory/30 text-sm">
          Asa Luke — Life Up Ventures LLC
        </p>
      </section>
    </div>
  )
}
