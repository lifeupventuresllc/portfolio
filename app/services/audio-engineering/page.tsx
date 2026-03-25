'use client'

import { useState } from 'react'

const PACKAGES = [
  {
    name: 'Single',
    slug: 'audio-single',
    tagline: '1 track, professional quality',
    price: '$150',
    billing: '/track',
    tracks: '1 Track',
    turnaround: '48-hour turnaround',
    revisions: '2 revisions',
    features: [
      '1 track mix & master',
      'Mixing: EQ, compression, effects, reference matching',
      'Delivery: WAV 24-bit + MP3 320kbps, streaming-ready',
      'Support: file prep guide',
      '2 revisions included',
      '48-hour turnaround',
    ],
    guarantee: "Not happy? I'll revise until you are. Full refund if I can't get the sound you want.",
  },
  {
    name: 'EP Package',
    slug: 'audio-ep',
    tagline: 'Consistent sound across your project',
    price: '$500',
    billing: '/project',
    tracks: '3-5 Tracks',
    turnaround: '5-day turnaround',
    revisions: '2 revisions per track',
    featured: true,
    features: [
      '3-5 tracks mix & master',
      'Mixing: EQ, compression, effects, vocal tuning, reference matching',
      'Consistency: matched sound across all tracks',
      'Delivery: WAV 24-bit + MP3 320kbps, streaming-ready',
      'Release: distribution checklist + release day promo plan',
      'Support: file prep guide, 2 revisions per track',
      '5-day turnaround',
    ],
    guarantee: "Unlimited revisions until you love it. Full refund if I can't match your reference. Plus: 1 free bonus mix if not satisfied.",
  },
  {
    name: 'Album',
    slug: 'audio-album',
    tagline: 'Full project with creative direction',
    price: '$1,000',
    billing: '/project',
    tracks: '6-12 Tracks',
    turnaround: '10-day turnaround',
    revisions: 'Unlimited revisions',
    features: [
      '6-12 tracks mix & master',
      'Direction: 1-hour creative direction session',
      'Mixing: EQ, compression, effects, vocal tuning, sound design',
      'Consistency: full project cohesion across every track',
      'Delivery: WAV 24-bit + MP3 320kbps, streaming-ready',
      'Release: distribution checklist, promo plan, pre-save campaign',
      'Sequencing: album track order consultation',
      'Unlimited revisions',
      '10-day turnaround',
    ],
    guarantee: "100% money-back guarantee, no questions asked. Unlimited revisions. If it doesn't match industry quality, you don't pay. Plus: 2 free bonus mixes if not completely satisfied.",
  },
]

export default function AudioEngineeringPage() {
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
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(201,168,76,0.08),transparent_70%)]" />
        <div className="max-w-4xl mx-auto text-center relative">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-4">Professional Audio Engineering</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            YOUR MUSIC DESERVES A{' '}
            <span className="text-gold">PROFESSIONAL MIX</span>
          </h1>
          <p className="text-ivory/60 mb-2">Packages from <span className="text-gold font-bold">$150 — $1,000</span></p>
          <p className="text-ivory/40 text-sm">10+ years experience. Singles to full albums. Pick your package below.</p>
        </div>
      </section>

      {/* ── PACKAGES ── */}
      <section className="px-4 pb-16">
        <div className="max-w-6xl mx-auto">
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
                  <p className="text-white text-sm font-semibold">{pkg.tracks}</p>
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

              <div className="bg-obsidian border border-gold/20 rounded-2xl p-6 mb-8">
                <p className="text-gold text-xs font-semibold uppercase tracking-wider mb-2">Guarantee</p>
                <p className="text-ivory/70 text-sm leading-relaxed">{PACKAGES[selected].guarantee}</p>
              </div>

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
                <p className="text-ivory/30 text-xs mt-3 text-center">Secure payment via Stripe.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── PROCESS ── */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-12">What Every Mix Includes</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: 'Mixing', desc: 'EQ, compression, reverb, delay, panning, automation — every element balanced and polished.', icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z' },
              { title: 'Mastering', desc: 'Loudness optimization, stereo widening, format delivery ready for all streaming platforms.', icon: 'M15.536 8.464a5 5 0 010 7.072M12 9.5l0 5M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728' },
              { title: 'Delivery', desc: 'WAV 24-bit master + MP3 320kbps. Ready to upload and release on every platform.', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' },
            ].map((item) => (
              <div key={item.title} className="bg-charcoal border border-smoke rounded-2xl p-8 hover:border-gold/40 transition-colors">
                <div className="w-12 h-12 bg-gold/10 rounded-lg flex items-center justify-center mb-5">
                  <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-ivory/60 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GENRES ── */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-8">Genres I Work With</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {['Hip-Hop / Rap', 'R&B / Soul', 'Pop', 'Gospel / Christian', 'Electronic / EDM', 'Rock', 'Podcast / Voice-Over', 'Country'].map(g => (
              <span key={g} className="bg-charcoal border border-smoke px-4 py-2 rounded-xl text-ivory/70 text-sm">{g}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── GUARANTEE ── */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-2xl mx-auto text-center bg-gradient-to-br from-charcoal to-[#1a1020] border border-smoke rounded-2xl p-10">
          <h3 className="text-2xl font-bold text-white mb-4">Quality Guarantee</h3>
          <p className="text-ivory/70 leading-relaxed mb-6">Every mix comes with revisions included. If I can&apos;t get the sound you want, you don&apos;t pay.</p>
          <div className="flex flex-wrap justify-center gap-6">
            {['Revisions included', 'Reference matching', 'Money-back guarantee'].map(g => (
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
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Level Up Your Sound?</h2>
          <p className="text-ivory/60 mb-8">Send me your stems and I&apos;ll have your first mix back in 48 hours.</p>
          <a href="https://instagram.com/1AsaLuke" target="_blank" rel="noopener noreferrer"
            className="inline-block bg-gold text-obsidian px-10 py-4 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all duration-500 hover:scale-110 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)]">
            Get Started — DM @1AsaLuke
          </a>
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
