'use client'

import { useState } from 'react'

const BUNDLES = [
  {
    name: 'The Creator Package',
    slug: 'bundle-creator',
    tagline: 'Everything you need to launch as a creator',
    price: '$597',
    billing: '/mo',
    separatePrice: 822,
    savings: 225,
    featured: false,
    highlights: [
      '4 Reels/Month (Content Editing)',
      '1 Track Mix & Master/Month (Audio)',
      'Full 12-Week Fitness Program (Free)',
    ],
    sections: [
      {
        label: 'Content Editing — Starter',
        items: [
          '4 Professionally Edited Reels/Month',
          'Color grading, captions, hooks, transitions',
          'Hashtag strategy, posting times, trending audio',
          'Bio optimization guide',
          '1 revision per video',
          '72-hour turnaround',
        ],
      },
      {
        label: 'Audio Engineering',
        items: [
          '1 Track Mix & Master per Month',
          'Professional-grade mixing & mastering',
          'Unlimited revisions per track',
          'Delivered in WAV + MP3',
        ],
      },
      {
        label: 'Fitness',
        items: [
          'Full 12-Week Training Program',
          'Structured progressive overload plan',
          'Included free with your bundle',
        ],
      },
    ],
    guarantee:
      'Not satisfied in 30 days? Your entire next month is free. No questions asked.',
  },
  {
    name: 'The Empire Package',
    slug: 'bundle-empire',
    tagline: 'For creators building a brand empire',
    price: '$997',
    billing: '/mo',
    separatePrice: 1322,
    savings: 325,
    featured: true,
    highlights: [
      '12+ Reels/Month (Full Engine)',
      '3 Tracks Mix & Master/Month (Audio)',
      'Full 12-Week Fitness Program (Free)',
      '1-Hour Monthly Strategy Session',
      'Priority Support Across All Services',
    ],
    sections: [
      {
        label: 'Content Editing — Full Engine',
        items: [
          '12+ Professionally Edited Reels/Month',
          'Color grading, captions, hooks, cover images',
          '1-hour monthly content strategy session',
          'Content calendar + shot list',
          'Captions for all posts, CTA strategy',
          'Analytics + growth report, competitor analysis',
          'Bio optimization, link-in-bio, monthly conversion review',
          'Unlimited revisions',
          '24-hour priority turnaround',
        ],
      },
      {
        label: 'Audio Engineering',
        items: [
          '3 Tracks Mix & Master per Month',
          'Professional-grade mixing & mastering',
          'Unlimited revisions per track',
          'Delivered in WAV + MP3',
          'Priority scheduling',
        ],
      },
      {
        label: 'Fitness',
        items: [
          'Full 12-Week Training Program',
          'Structured progressive overload plan',
          'Included free with your bundle',
        ],
      },
      {
        label: 'Bundle Exclusives',
        items: [
          '1-Hour Monthly Strategy Session (content + music)',
          'Priority support across all services',
          'Same-day replies on all channels',
        ],
      },
    ],
    guarantee:
      '100% money-back guarantee if no measurable growth in 60 days. Zero risk.',
  },
]

const PRICE_COMPARISON = [
  { service: 'Content Editing — Starter (6 Reels/mo)', individual: '$247', bundle: 'Creator' },
  { service: 'Content Editing — Scale (24 Reels/mo)', individual: '$897', bundle: 'Empire' },
  { service: 'Audio Engineering — 2 Tracks/mo', individual: '$175', bundle: 'Creator' },
  { service: 'Audio Engineering — 4 Tracks/mo', individual: '$425', bundle: 'Empire' },
  { service: '12-Week Fitness Program', individual: '$30', bundle: 'Both' },
]

export default function BundlesPage() {
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
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-4">
            Content + Audio + Fitness
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            BUNDLE &amp; SAVE{' '}
            <span className="text-gold">UP TO $325/MO</span>
          </h1>
          <p className="text-ivory/60 mb-3 max-w-2xl mx-auto leading-relaxed">
            Why hire 3 separate people when you can get content editing, audio engineering, and a
            full fitness program from one creative partner — at a fraction of the cost?
          </p>
          <p className="text-ivory/40 text-sm">
            2 all-in-one packages. No contract. Cancel anytime.
          </p>
        </div>
      </section>

      {/* Savings Callout */}
      <section className="px-4 pb-8">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-4 justify-center">
          {BUNDLES.map((b, i) => (
            <div
              key={i}
              className="flex-1 bg-charcoal border border-smoke rounded-2xl p-5 text-center"
            >
              <p className="text-ivory/50 text-xs uppercase tracking-wider mb-1">
                {b.name}
              </p>
              <p className="text-ivory/40 text-sm line-through mb-1">
                ${b.separatePrice}/mo separately
              </p>
              <p className="text-gold font-bold text-lg">{b.price}/mo</p>
              <p className="text-emerald-400 text-xs font-semibold mt-1">
                You save ${b.savings}/mo
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Package Cards */}
      <section className="px-4 pb-16">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {BUNDLES.map((pkg, i) => (
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
                  <span className="inline-block bg-gold text-obsidian text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
                    Most Popular
                  </span>
                )}
                <h3 className="text-2xl font-bold text-white mb-1">{pkg.name}</h3>
                <p className="text-ivory/50 text-sm mb-5">{pkg.tagline}</p>
                <div className="mb-5">
                  <span className="text-4xl font-bold text-gold">{pkg.price}</span>
                  <span className="text-ivory/50 ml-1">{pkg.billing}</span>
                  <span className="text-ivory/40 text-sm ml-3 line-through">
                    ${pkg.separatePrice}/mo
                  </span>
                </div>
                <div className="space-y-2 mb-6">
                  {pkg.highlights.map((h, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-gold flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <polyline
                          points="20 6 9 17 4 12"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="text-white text-sm">{h}</span>
                    </div>
                  ))}
                </div>
                <p className="text-gold text-xs font-semibold uppercase tracking-wider">
                  {selected === i ? 'Tap to close \u25B2' : 'Tap for full details \u25BC'}
                </p>
              </button>
            ))}
          </div>

          {/* Expanded Details */}
          {selected !== null && (
            <div className="bg-charcoal border-2 border-gold/30 rounded-3xl p-8 sm:p-10 mb-8 transition-all duration-500">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                  <h3 className="text-3xl font-bold text-white">
                    {BUNDLES[selected].name}
                  </h3>
                  <p className="text-ivory/50">{BUNDLES[selected].tagline}</p>
                </div>
                <div className="text-right">
                  <span className="text-4xl font-bold text-gold">
                    {BUNDLES[selected].price}
                  </span>
                  <span className="text-ivory/50 ml-1">
                    {BUNDLES[selected].billing}
                  </span>
                  <p className="text-emerald-400 text-xs font-semibold mt-1">
                    Save ${BUNDLES[selected].savings}/mo vs buying separately
                  </p>
                </div>
              </div>

              {/* Feature Sections */}
              {BUNDLES[selected].sections.map((section, si) => (
                <div key={si} className="mb-8">
                  <p className="text-gold text-xs font-semibold uppercase tracking-wider mb-4">
                    {section.label}
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {section.items.map((item, ii) => (
                      <div key={ii} className="flex items-start gap-3">
                        <svg
                          className="w-4 h-4 text-gold mt-0.5 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <polyline
                            points="20 6 9 17 4 12"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span className="text-ivory text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Guarantee */}
              <div className="bg-obsidian border border-gold/20 rounded-2xl p-6 mb-8">
                <p className="text-gold text-xs font-semibold uppercase tracking-wider mb-2">
                  Guarantee
                </p>
                <p className="text-ivory/70 text-sm leading-relaxed">
                  {BUNDLES[selected].guarantee}
                </p>
              </div>

              {/* Checkout */}
              <div className="max-w-md mx-auto">
                <div className="flex gap-3">
                  <input
                    type="email"
                    placeholder="Your email"
                    value={checkoutEmail}
                    onChange={(e) => setCheckoutEmail(e.target.value)}
                    className="flex-1 px-5 py-4 bg-obsidian border border-smoke rounded-2xl text-white text-sm placeholder-ivory/30 focus:outline-none focus:border-gold transition-colors"
                  />
                  <button
                    onClick={() => handleCheckout(BUNDLES[selected].slug)}
                    disabled={checkoutLoading || !checkoutEmail}
                    className="bg-gold text-obsidian px-8 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {checkoutLoading ? 'Loading...' : 'Get Started'}
                  </button>
                </div>
                <p className="text-ivory/30 text-xs mt-3 text-center">
                  No contract. Cancel anytime. Secure payment via Stripe.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Value Comparison */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-3xl mx-auto">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase text-center mb-3">
            Price Comparison
          </p>
          <h2 className="text-3xl font-bold text-center text-white mb-4">
            Individual Prices vs Bundle Prices
          </h2>
          <div className="w-16 h-0.5 bg-gold/50 mx-auto mb-10" />

          <div className="space-y-3">
            {PRICE_COMPARISON.map((row, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-charcoal border border-smoke rounded-xl p-4 hover:border-gold/40 transition-colors"
              >
                <div className="flex-1">
                  <span className="text-white text-sm font-medium">{row.service}</span>
                  <span className="text-ivory/40 text-xs ml-2">({row.bundle})</span>
                </div>
                <span className="text-ivory/50 text-sm line-through mr-4">
                  {row.individual}
                </span>
                <span className="text-gold font-semibold text-sm">Included</span>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            {BUNDLES.map((b, i) => (
              <div
                key={i}
                className={`flex justify-between items-center rounded-xl p-5 ${
                  b.featured
                    ? 'bg-gold/10 border-2 border-gold'
                    : 'bg-charcoal border border-gold/30'
                }`}
              >
                <div>
                  <h3 className="text-white font-bold text-sm">{b.name}</h3>
                  <p className="text-ivory/40 text-xs line-through">
                    ${b.separatePrice}/mo separately
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-gold font-bold text-2xl">{b.price}</span>
                  <span className="text-ivory/50 text-sm">/mo</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Bundle */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-12">
            Why Bundle With One Creative Partner?
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                title: 'Unified Vision',
                desc: 'Your content, music, and brand all speak the same language when one person understands the full picture.',
              },
              {
                title: 'Save Thousands',
                desc: 'Hiring separate editors, engineers, and trainers adds up fast. Bundles save you up to $325/mo.',
              },
              {
                title: 'One Point of Contact',
                desc: 'No juggling freelancers. One DM, one strategy call, one person who has your back across every service.',
              },
            ].map((card, i) => (
              <div
                key={i}
                className="bg-charcoal border border-smoke rounded-2xl p-6 text-center hover:border-gold/40 transition-colors"
              >
                <h4 className="text-gold text-sm font-semibold uppercase tracking-wider mb-3">
                  {card.title}
                </h4>
                <p className="text-ivory/60 text-sm leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Guarantee */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-2xl mx-auto text-center bg-gradient-to-br from-charcoal to-[#1a1020] border border-smoke rounded-2xl p-10">
          <h3 className="text-2xl font-bold text-white mb-4">Zero Risk Guarantee</h3>
          <p className="text-ivory/70 leading-relaxed mb-6">
            Both bundles come with iron-clad guarantees. The Creator Package offers a full free
            month if you&apos;re not satisfied in 30 days. The Empire Package includes a 100%
            money-back guarantee if there&apos;s no measurable growth in 60 days.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            {['No contract', 'Cancel anytime', 'Money-back guarantee'].map((g) => (
              <div key={g} className="flex items-center gap-2 text-gold text-sm font-semibold">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <polyline
                    points="20 6 9 17 4 12"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {g}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Build Your Empire?
          </h2>
          <p className="text-ivory/60 mb-8">
            Limited bundle spots each month. Lock yours in now.
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-block bg-gold text-obsidian px-10 py-4 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all duration-500 hover:scale-110 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)] cursor-pointer"
          >
            Get Started — Pick Your Package
          </button>
        </div>
      </section>

      <footer className="py-8 px-4 border-t border-smoke">
        <div className="max-w-6xl mx-auto text-center text-sm text-ivory/40">
          &copy; {new Date().getFullYear()} Asa Luke. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
