'use client'

import { useState } from 'react'

const PACKAGES = [
  {
    name: 'Starter',
    slug: 'content-starter',
    tagline: 'Get consistent, polished content',
    price: '$247',
    billing: '/mo',
    reels: '6 Reels/Month',
    turnaround: '72-hour turnaround',
    revisions: '1 revision per video',
    features: [
      '6 Professionally Edited Reels/Month',
      'Editing: color grading, captions, hooks, transitions',
      'Growth: hashtag strategy, posting times, trending audio',
      'Profile: bio optimization guide',
      '1 revision per video',
      '72-hour turnaround',
    ],
    guarantee: "If you're not satisfied with your first month, I'll edit 2 extra Reels free.",
  },
  {
    name: 'Growth',
    slug: 'content-growth',
    tagline: 'For creators ready to break through',
    price: '$497',
    billing: '/mo',
    reels: '12 Reels/Month',
    turnaround: '48-hour turnaround',
    revisions: '2 revisions per video',
    featured: true,
    features: [
      '12 Professionally Edited Reels/Month',
      'Editing: color grading, captions, hooks, cover images',
      'Strategy: content calendar, hashtag & posting strategy',
      'Growth: analytics review, trending audio, posting times',
      'Conversion: bio optimization, CTA strategy, link-in-bio setup',
      '2 revisions per video',
      '48-hour turnaround',
    ],
    guarantee: "4 free bonus Reels if not satisfied in month 1. Plus: 50% off next month if views don't increase within 60 days.",
  },
  {
    name: 'Full Engine',
    slug: 'content-full-engine',
    tagline: 'Your entire content operation, handled',
    price: '$897',
    billing: '/mo',
    reels: '24 Reels/Month',
    turnaround: '24-hour priority',
    revisions: 'Unlimited revisions',
    features: [
      '24 Professionally Edited Reels/Month',
      'Editing: color grading, captions, hooks, cover images',
      'Strategy: 1-hour monthly session, content calendar, shot list',
      'Writing: captions for all posts, CTA strategy',
      'Growth: analytics + growth report, competitor analysis',
      'Conversion: bio optimization, link-in-bio, monthly conversion review',
      'Support: priority DM support, same-day replies',
      'Unlimited revisions',
      '24-hour priority turnaround',
    ],
    guarantee: "100% money-back guarantee, no questions asked. Free next month if views don't grow in 60 days. 4 bonus Reels if no measurable growth in 30 days.",
  },
]

const VALUE_STACK = [
  { name: '12+ Professionally Edited Reels Per Month', value: '$2,400' },
  { name: 'Monthly Content Strategy Session (1 Hour)', value: '$300' },
  { name: 'Caption Writing for All 12+ Posts', value: '$360' },
  { name: 'Monthly Content Calendar', value: '$200' },
  { name: 'Custom Brand Color Grading', value: '$150' },
  { name: 'Hashtag & Posting Strategy', value: '$150' },
  { name: 'Unlimited Revisions', value: '$200' },
  { name: '24-Hour Priority Turnaround', value: '$250' },
  { name: 'Bio Optimization Guide', value: '$150' },
  { name: 'CTA Strategy for Every Post', value: '$200' },
]

export default function ContentEditingPage() {
  const [selected, setSelected] = useState<number | null>(null)
  const [checkoutEmail, setCheckoutEmail] = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  async function handleCheckout(slug: string) {
    if (!checkoutEmail) return
    setCheckoutLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageSlug: slug, email: checkoutEmail }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      alert('Something went wrong. Please try again.')
    }
    setCheckoutLoading(false)
  }

  return (
    <div className="min-h-screen bg-obsidian">
      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(201,168,76,0.08),transparent_70%)]" />
        <div className="max-w-4xl mx-auto text-center relative">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-4">Content Editing for Creators & Brands</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            YOUR CONTENT SHOULD{' '}
            <span className="text-gold">STOP THE SCROLL</span>
          </h1>
          <p className="text-ivory/60 mb-2">Packages from <span className="text-gold font-bold">$247 — $897/month</span></p>
          <p className="text-ivory/40 text-sm">No contract. Cancel anytime. Pick your package below.</p>
        </div>
      </section>

      {/* ── PACKAGES ── */}
      <section id="pricing" className="px-4 pb-16">
        <div className="max-w-6xl mx-auto">
          {/* Package Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {PACKAGES.map((pkg, i) => (
              <button
                key={i}
                onClick={() => setSelected(selected === i ? null : i)}
                className={`text-left rounded-3xl p-8 transition-all duration-500 hover:-translate-y-2 ${
                  selected === i
                    ? 'border-2 border-gold bg-gold/10 shadow-[0_0_60px_rgba(201,168,76,0.25)] scale-[1.02]'
                    : pkg.featured
                    ? 'border-2 border-gold/50 bg-gradient-to-b from-gold/5 to-charcoal hover:shadow-[0_0_50px_rgba(201,168,76,0.2)]'
                    : 'border-2 border-smoke bg-charcoal hover:border-gold/40 hover:shadow-[0_0_40px_rgba(201,168,76,0.1)]'
                }`}
              >
                {pkg.featured && (
                  <span className="inline-block bg-gold text-obsidian text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">Most Popular</span>
                )}
                <h3 className="text-2xl font-bold text-white mb-1">{pkg.name}</h3>
                <p className="text-ivory/50 text-sm mb-5">{pkg.tagline}</p>
                <div className="mb-5">
                  <span className="text-4xl font-bold text-gold">{pkg.price}</span>
                  <span className="text-ivory/50 ml-1">{pkg.billing}</span>
                </div>
                <div className="space-y-2 mb-4">
                  <p className="text-white text-sm font-semibold">{pkg.reels}</p>
                  <p className="text-ivory/50 text-xs">{pkg.turnaround}</p>
                  <p className="text-ivory/50 text-xs">{pkg.revisions}</p>
                </div>
                <p className="text-gold text-xs font-semibold uppercase tracking-wider">
                  {selected === i ? 'Tap to close ▲' : 'Tap for full details ▼'}
                </p>
              </button>
            ))}
          </div>

          {/* Expanded Details */}
          {selected !== null && (
            <div className="bg-charcoal border-2 border-gold/30 rounded-3xl p-8 sm:p-10 mb-8 transition-all duration-500">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                  <h3 className="text-3xl font-bold text-white">{PACKAGES[selected].name}</h3>
                  <p className="text-ivory/50">{PACKAGES[selected].tagline}</p>
                </div>
                <div className="text-right">
                  <span className="text-4xl font-bold text-gold">{PACKAGES[selected].price}</span>
                  <span className="text-ivory/50 ml-1">{PACKAGES[selected].billing}</span>
                </div>
              </div>

              {/* Features */}
              <div className="mb-8">
                <p className="text-gold text-xs font-semibold uppercase tracking-wider mb-4">Everything Included</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {PACKAGES[selected].features.map((f, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <svg className="w-4 h-4 text-gold mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <polyline points="20 6 9 17 4 12" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="text-ivory text-sm">{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Guarantee */}
              <div className="bg-obsidian border border-gold/20 rounded-2xl p-6 mb-8">
                <p className="text-gold text-xs font-semibold uppercase tracking-wider mb-2">Guarantee</p>
                <p className="text-ivory/70 text-sm leading-relaxed">{PACKAGES[selected].guarantee}</p>
              </div>

              {/* Checkout */}
              <div className="max-w-md mx-auto">
                <div className="flex gap-3">
                  <input
                    type="email"
                    placeholder="Your email"
                    value={checkoutEmail}
                    onChange={e => setCheckoutEmail(e.target.value)}
                    className="flex-1 px-5 py-4 bg-obsidian border border-smoke rounded-2xl text-white text-sm placeholder-ivory/30 focus:outline-none focus:border-gold transition-colors"
                  />
                  <button
                    onClick={() => handleCheckout(PACKAGES[selected].slug)}
                    disabled={checkoutLoading || !checkoutEmail}
                    className="bg-gold text-obsidian px-8 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {checkoutLoading ? 'Loading...' : 'Get Started'}
                  </button>
                </div>
                <p className="text-ivory/30 text-xs mt-3 text-center">No contract. Cancel anytime. Secure payment via Stripe.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── VALUE STACK ── */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-3xl mx-auto">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase text-center mb-3">Full Engine Breakdown</p>
          <h2 className="text-3xl font-bold text-center text-white mb-4">What&apos;s in the $897 Package</h2>
          <div className="w-16 h-0.5 bg-gold/50 mx-auto mb-10" />

          <div className="space-y-3">
            {VALUE_STACK.map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-charcoal border border-smoke rounded-xl p-4 hover:border-gold/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-gold text-obsidian rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold">{i + 1}</div>
                  <span className="text-white text-sm font-medium">{item.name}</span>
                </div>
                <span className="text-gold font-semibold text-sm">{item.value}</span>
              </div>
            ))}
            <div className="flex justify-between items-center bg-gold/10 border-2 border-gold rounded-xl p-5 mt-4">
              <h3 className="text-white font-bold text-lg">Total Value</h3>
              <span className="text-gold font-bold text-2xl">$4,810</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMPARISON ── */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-12">Agencies vs Freelancers vs Me</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-charcoal border border-smoke rounded-2xl p-6 text-center">
              <h4 className="text-ivory/60 text-xs tracking-widest uppercase mb-4">Agencies</h4>
              <ul className="text-left space-y-2 text-sm text-ivory/60 mb-4">
                <li>8-12 Reels/month</li><li>Strategy sometimes</li><li>1-2 week turnaround</li>
              </ul>
              <p className="text-ivory font-bold text-lg">$2,500-$5,000/mo</p>
            </div>
            <div className="bg-charcoal border border-smoke rounded-2xl p-6 text-center">
              <h4 className="text-ivory/60 text-xs tracking-widest uppercase mb-4">Freelancers</h4>
              <ul className="text-left space-y-2 text-sm text-ivory/60 mb-4">
                <li>4-8 Reels/month</li><li>No strategy</li><li>3-7 day turnaround</li>
              </ul>
              <p className="text-ivory font-bold text-lg">$800-$2,000/mo</p>
            </div>
            <div className="bg-gold/5 border-2 border-gold rounded-2xl p-6 text-center">
              <h4 className="text-gold text-xs tracking-widest uppercase mb-4">Content Engine</h4>
              <ul className="text-left space-y-2 text-sm text-white mb-4">
                <li>6-24 Reels/month</li><li>Strategy included</li><li>24-48 hour turnaround</li>
              </ul>
              <p className="text-gold font-bold text-lg">$247-$897/mo</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── GUARANTEE ── */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-2xl mx-auto text-center bg-gradient-to-br from-charcoal to-[#1a1020] border border-smoke rounded-2xl p-10">
          <h3 className="text-2xl font-bold text-white mb-4">Zero Risk Guarantee</h3>
          <p className="text-ivory/70 leading-relaxed mb-6">No long-term contract. Month to month. Cancel anytime. If you don&apos;t see growth in your first 30 days, I&apos;ll edit 4 extra Reels for free.</p>
          <div className="flex flex-wrap justify-center gap-6">
            {['No contract', 'Cancel anytime', '30-day growth guarantee'].map(g => (
              <div key={g} className="flex items-center gap-2 text-gold text-sm font-semibold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {g}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Level Up Your Content?</h2>
          <p className="text-ivory/60 mb-8">Limited spots each month. Reach out now to lock yours in.</p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-block bg-gold text-obsidian px-10 py-4 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all duration-500 hover:scale-110 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)] cursor-pointer"
          >
            Get Started — Pick Your Package
          </button>
        </div>
      </section>

    </div>
  )
}
