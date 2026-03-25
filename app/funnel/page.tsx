'use client'

import { useState } from 'react'

const SERVICES = {
  content: {
    emoji: '🎬',
    title: 'Caption Traction + Reel Appeal',
    desc: 'AI prompt that writes your captions, headlines & on-screen text — plus a 7-step Reels system',
    guideUrl: '/guides/content',
  },
  audio: {
    emoji: '🎵',
    title: 'The Mix Fix',
    desc: 'Step-by-step vocal chain for any DAW — stock plugins only, 1-2 actions per step, pro results',
    guideUrl: '/guides/audio',
  },
  fitness: {
    emoji: '💪',
    title: 'The Fast Food Flip + The Compound Comeback',
    desc: '7-day healthy fast food swaps + a 7-day progressive overload compound movement program',
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
                    className={`p-6 rounded-2xl border text-left transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(201,168,76,0.15)] ${
                      selectedService === key
                        ? 'border-gold bg-gold/10 shadow-[0_0_40px_rgba(201,168,76,0.2)] scale-[1.03]'
                        : 'border-smoke bg-charcoal hover:border-gold/40'
                    }`}
                  >
                    <p className="text-3xl mb-3">{svc.emoji}</p>
                    <h3 className="text-white font-bold text-sm mb-2">{svc.title}</h3>
                    <p className="text-ivory/50 text-xs leading-relaxed">{svc.desc}</p>
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
            <div className="text-center mb-10">
              <div className="w-16 h-16 bg-gold/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gold text-2xl">✓</span>
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Here&apos;s Your Free Guide, {name}!</h2>
              <p className="text-ivory/50 text-sm">I also sent a copy to your email. Scroll down to read it now.</p>
            </div>

            {/* Offer CTA — Top */}
            <div className="text-center mb-8">
              <a
                href={selectedService === 'content' ? '/services/content-editing#pricing' : selectedService === 'audio' ? '/services/audio-engineering#pricing' : '/#fitness'}
                className="inline-block bg-gold text-obsidian px-8 py-3 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-110 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)]"
              >
                Want This Done For You? View Packages
              </a>
            </div>

            {/* Embedded Guide — No Click Away */}
            <div className="rounded-2xl overflow-hidden border-2 border-gold/20">
              <iframe
                src={selected.guideUrl}
                className="w-full border-0"
                style={{ height: '80vh', minHeight: '600px' }}
                title={selected.title}
              />
            </div>

            {/* Offer CTA — Bottom */}
            <div className="text-center mt-10 bg-gradient-to-br from-charcoal to-gold/5 border border-gold/30 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-white mb-3">Ready to Level Up?</h3>
              <p className="text-ivory/60 text-sm mb-6">This guide shows you the strategy. I do all of this and more — done for you.</p>
              <a
                href={selectedService === 'content' ? '/services/content-editing#pricing' : selectedService === 'audio' ? '/services/audio-engineering#pricing' : '/#fitness'}
                className="inline-block bg-gold text-obsidian px-10 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-110 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)]"
              >
                Browse My Packages
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
