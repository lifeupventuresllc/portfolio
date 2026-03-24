'use client'

import { useState } from 'react'

const SERVICES = {
  content: {
    emoji: '🎬',
    title: 'Content Blueprint + AI Prompt',
    desc: '7-step Reels system + a copy-paste AI prompt that writes your captions, on-screen text & headlines',
    guideUrl: '/guides/content',
  },
  audio: {
    emoji: '🎵',
    title: 'Vocal Chain Preset Template',
    desc: 'Plug-and-play vocal chain with exact settings for clean, professional vocals in any DAW',
    guideUrl: '/guides/audio',
  },
  fitness: {
    emoji: '💪',
    title: '7-Day Fast Food Swap Guide',
    desc: 'Healthy high-protein alternatives to your favorite fast food — same convenience, better macros',
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
          <div className="text-center">
            <div className="w-20 h-20 bg-gold/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-gold text-3xl">✓</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Your Guide is Ready!</h2>
            <p className="text-ivory/60 mb-10 max-w-md mx-auto leading-relaxed">
              Thanks, {name}! I also sent a copy to your email. Here&apos;s your instant access:
            </p>

            {/* Download Card */}
            <a
              href={selected.guideUrl}
              className="block max-w-sm mx-auto bg-gradient-to-br from-charcoal to-gold/5 border-2 border-gold/40 rounded-2xl p-8 mb-10 transition-all duration-500 hover:scale-105 hover:shadow-[0_0_60px_rgba(201,168,76,0.2)] hover:border-gold"
            >
              <p className="text-4xl mb-3">{selected.emoji}</p>
              <h3 className="text-white font-bold text-lg mb-2">{selected.title}</h3>
              <p className="text-ivory/50 text-sm mb-4">{selected.desc}</p>
              <span className="inline-block bg-gold text-obsidian px-6 py-2 font-bold text-xs uppercase tracking-wider rounded-xl">
                Read Now &rarr;
              </span>
            </a>

            {/* Next Steps */}
            <div className="max-w-sm mx-auto text-left space-y-4 mb-10">
              <p className="text-ivory/40 text-xs uppercase tracking-wider text-center mb-2">What happens next</p>
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-gold text-obsidian rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">1</div>
                <div>
                  <p className="text-white text-sm font-semibold">Read your free guide</p>
                  <p className="text-ivory/40 text-xs">Actionable strategies you can use right now</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-gold text-obsidian rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">2</div>
                <div>
                  <p className="text-white text-sm font-semibold">Want it done for you?</p>
                  <p className="text-ivory/40 text-xs">Check out my packages — I do all of this and more</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-gold text-obsidian rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">3</div>
                <div>
                  <p className="text-white text-sm font-semibold">I&apos;ll follow up</p>
                  <p className="text-ivory/40 text-xs">I may reach out to see if I can help further</p>
                </div>
              </div>
            </div>

            <a
              href={selectedService === 'content' ? '/services/content-editing#pricing' : selectedService === 'audio' ? '/services/audio-engineering#pricing' : '/#fitness'}
              className="inline-block bg-gold text-obsidian px-8 py-3 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)]"
            >
              Browse My Packages
            </a>

            <p className="text-ivory/20 text-xs mt-8">
              Questions? DM me{' '}
              <a href="https://instagram.com/1AsaLuke" target="_blank" rel="noopener noreferrer" className="text-gold/50 hover:text-gold">
                @1AsaLuke
              </a>
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
