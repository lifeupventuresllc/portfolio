'use client'

import { useState } from 'react'

const SERVICES = {
  content: {
    emoji: '🎬',
    title: 'Caption Traction + Reel Appeal',
    price: 'FREE',
    realValue: '$149 value',
    desc: 'AI prompt that writes your captions, headlines & on-screen text — plus a 7-step Reels system',
    assets: ['Caption Traction (AI Prompt Template)', 'Reel Appeal (7-Step Reels System)'],
    guideUrl: '/guides/content',
  },
  audio: {
    emoji: '🎵',
    title: 'The Mix Fix',
    price: 'FREE',
    realValue: '$99 value',
    desc: 'Step-by-step vocal chain for any DAW — stock plugins only, 1-2 actions per step, pro results',
    assets: ['The Mix Fix (7-Step Vocal Chain Guide)'],
    guideUrl: '/guides/audio',
  },
  fitness: {
    emoji: '💪',
    title: 'The Fast Food Flip + The Compound Comeback',
    price: 'FREE',
    realValue: '$79 value',
    desc: '5-day healthy fast food meal plans + a 7-day progressive overload compound movement program',
    assets: ['The Fast Food Flip (5-Day Meal Plans)', 'The Compound Comeback (7-Day Workout Program)'],
    guideUrl: '/guides/fitness',
  },
} as const

type ServiceKey = keyof typeof SERVICES

export default function FunnelPage() {
  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState<ServiceKey | ''>('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !email || !selectedService) return
    setLoading(true)

    // Save to localStorage as backup
    const lead = { name, email, service: selectedService, date: new Date().toISOString() }
    const leads = JSON.parse(localStorage.getItem('asa_funnel_leads') || '[]')
    leads.push(lead)
    localStorage.setItem('asa_funnel_leads', JSON.stringify(leads))

    // Send to API (saves to CRM + emails guide link + notifies Asa)
    try {
      await fetch('/api/funnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, service: selectedService }),
      })
    } catch {
      // API failed — still proceed since localStorage has the backup
    }

    setLoading(false)
    setStep(2)
  }

  const selected = selectedService ? SERVICES[selectedService] : null

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl">

        {step === 1 && (
          <div className="text-center">
            {/* Header */}
            <p className="text-gold text-xs font-semibold tracking-[0.3em] uppercase mb-4">Free Guide — Instant Access</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Get a Free <span className="text-gold">Guide</span> From Me
            </h1>
            <p className="text-ivory/60 max-w-md mx-auto mb-12 leading-relaxed">
              Pick your service below. I&apos;ll send you a free guide with real strategies you can use today — no strings attached.
            </p>

            {/* Service Cards */}
            <div className="grid sm:grid-cols-3 gap-4 mb-12">
              {(Object.keys(SERVICES) as ServiceKey[]).map((key) => {
                const svc = SERVICES[key]
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedService(key)}
                    className={`p-6 rounded-2xl border text-left transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(201,168,76,0.15)] relative ${
                      selectedService === key
                        ? 'border-gold bg-gold/10 shadow-[0_0_40px_rgba(201,168,76,0.2)] scale-[1.03]'
                        : 'border-smoke bg-charcoal hover:border-gold/40'
                    }`}
                  >
                    <span className="absolute top-3 right-3 bg-emerald-500 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-full tracking-wider">FREE</span>
                    <p className="text-3xl mb-3">{svc.emoji}</p>
                    <h3 className="text-white font-bold text-sm mb-1">{svc.title}</h3>
                    <p className="text-ivory/30 text-[10px] line-through mb-2">{svc.realValue}</p>
                    <p className="text-ivory/50 text-xs leading-relaxed mb-3">{svc.desc}</p>
                    <div className="space-y-1">
                      {svc.assets.map((asset, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <svg className="w-3 h-3 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span className="text-ivory/60 text-[10px]">{asset}</span>
                        </div>
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Lead Capture Form */}
            <form onSubmit={handleSubmit} className="max-w-sm mx-auto">
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full mb-3 px-5 py-4 bg-charcoal border border-smoke rounded-2xl text-white text-sm placeholder-ivory/30 focus:outline-none focus:border-gold transition-colors"
                required
              />
              <input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full mb-4 px-5 py-4 bg-charcoal border border-smoke rounded-2xl text-white text-sm placeholder-ivory/30 focus:outline-none focus:border-gold transition-colors"
                required
              />
              <button
                type="submit"
                disabled={loading || !selectedService}
                className="w-full py-4 bg-gold text-obsidian font-bold text-sm uppercase tracking-wider rounded-2xl hover:bg-gold/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)]"
              >
                {loading ? 'Sending...' : 'Get My Free Guide'}
              </button>
              {!selectedService && (
                <p className="text-ivory/30 text-xs mt-3">Select a guide above to continue</p>
              )}
            </form>

            <p className="text-ivory/20 text-xs mt-8">No spam. No commitment. Instant access.</p>
          </div>
        )}

        {step === 2 && selected && (
          <div>
            {/* Success Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">You&apos;re In, {name}!</h2>
              <p className="text-ivory/50 text-sm mb-1">Your free guides are ready below. A copy was also sent to your email.</p>
            </div>

            {/* Your Free Assets */}
            <div className="bg-charcoal border-2 border-emerald-500/30 rounded-2xl p-6 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-emerald-500 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-full tracking-wider">FREE</span>
                <h3 className="text-white font-bold text-lg">Your Digital Assets</h3>
              </div>
              <div className="space-y-3 mb-5">
                {selected.assets.map((asset, i) => (
                  <div key={i} className="flex items-center justify-between bg-obsidian border border-smoke rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gold/10 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <span className="text-white text-sm font-medium">{asset}</span>
                    </div>
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={selected.guideUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center py-3 bg-gold text-obsidian font-bold text-sm uppercase tracking-wider rounded-xl hover:bg-gold/90 transition-all"
                >
                  View Guides
                </a>
                <a
                  href={selected.guideUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center py-3 border-2 border-gold text-gold font-bold text-sm uppercase tracking-wider rounded-xl hover:bg-gold/10 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Save for Later
                </a>
              </div>
            </div>

            {/* Embedded Guide — Full View */}
            <div className="mb-8">
              <p className="text-ivory/40 text-xs uppercase tracking-wider mb-3 text-center">Full Guide Preview</p>
              <div className="rounded-2xl overflow-hidden border-2 border-gold/20">
                <iframe
                  src={selected.guideUrl}
                  className="w-full border-0"
                  style={{ height: '80vh', minHeight: '600px' }}
                  title={selected.title}
                />
              </div>
            </div>

            {/* Offer CTA — Bottom */}
            <div className="text-center bg-gradient-to-br from-charcoal to-gold/5 border border-gold/30 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-white mb-3">Want This Done For You?</h3>
              <p className="text-ivory/60 text-sm mb-6">This guide shows you the strategy. I do all of this and more — professionally, every month.</p>
              <a
                href={selectedService === 'content' ? '/services/content-editing' : selectedService === 'audio' ? '/services/audio-engineering' : '/services/bundles'}
                className="inline-block bg-gold text-obsidian px-10 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-110 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)]"
              >
                View My Packages
              </a>
              <p className="text-ivory/20 text-xs mt-6">
                Questions? DM me{' '}
                <a href="https://instagram.com/1AsaLuke" target="_blank" rel="noopener noreferrer" className="text-gold/50 hover:text-gold">
                  @1AsaLuke
                </a>
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
