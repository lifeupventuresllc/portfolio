'use client'

import { useState } from 'react'

export default function FunnelPage() {
  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState('')
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

    // Send to API (emails Asa + auto-replies to lead)
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

  const serviceLink = selectedService === 'content'
    ? '/services/content-editing'
    : selectedService === 'audio'
    ? '/services/audio-engineering'
    : '/#fitness'

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl">

        {step === 1 && (
          <div className="text-center">
            {/* Header */}
            <p className="text-gold text-xs font-semibold tracking-[0.3em] uppercase mb-4">Free Sample — No Strings Attached</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              See the Difference <span className="text-gold">Before You Commit</span>
            </h1>
            <p className="text-ivory/60 max-w-md mx-auto mb-12 leading-relaxed">
              Pick a service below and I&apos;ll do your first one free. You see the quality, then decide.
            </p>

            {/* Service Cards */}
            <div className="grid sm:grid-cols-3 gap-4 mb-12">
              <button
                onClick={() => setSelectedService('content')}
                className={`p-6 rounded-xl border text-left transition-all duration-300 hover:-translate-y-1 ${
                  selectedService === 'content'
                    ? 'border-gold bg-gold/10 shadow-lg shadow-gold/10'
                    : 'border-smoke bg-charcoal hover:border-gold/40'
                }`}
              >
                <p className="text-gold text-2xl mb-2">🎬</p>
                <h3 className="text-white font-bold text-sm mb-1">Free Video Edit</h3>
                <p className="text-ivory/50 text-xs leading-relaxed">Send me a clip, I&apos;ll edit it in 48 hours</p>
              </button>

              <button
                onClick={() => setSelectedService('audio')}
                className={`p-6 rounded-xl border text-left transition-all duration-300 hover:-translate-y-1 ${
                  selectedService === 'audio'
                    ? 'border-gold bg-gold/10 shadow-lg shadow-gold/10'
                    : 'border-smoke bg-charcoal hover:border-gold/40'
                }`}
              >
                <p className="text-gold text-2xl mb-2">🎵</p>
                <h3 className="text-white font-bold text-sm mb-1">Free Mix &amp; Master</h3>
                <p className="text-ivory/50 text-xs leading-relaxed">Send me a track, I&apos;ll mix it in 48 hours</p>
              </button>

              <button
                onClick={() => setSelectedService('fitness')}
                className={`p-6 rounded-xl border text-left transition-all duration-300 hover:-translate-y-1 ${
                  selectedService === 'fitness'
                    ? 'border-gold bg-gold/10 shadow-lg shadow-gold/10'
                    : 'border-smoke bg-charcoal hover:border-gold/40'
                }`}
              >
                <p className="text-gold text-2xl mb-2">💪</p>
                <h3 className="text-white font-bold text-sm mb-1">Free Fitness Consult</h3>
                <p className="text-ivory/50 text-xs leading-relaxed">15-minute call to build your plan</p>
              </button>
            </div>

            {/* Lead Capture Form */}
            <form onSubmit={handleSubmit} className="max-w-sm mx-auto">
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full mb-3 px-4 py-3 bg-charcoal border border-smoke rounded-xl text-white text-sm placeholder-ivory/30 focus:outline-none focus:border-gold transition-colors"
                required
              />
              <input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full mb-4 px-4 py-3 bg-charcoal border border-smoke rounded-xl text-white text-sm placeholder-ivory/30 focus:outline-none focus:border-gold transition-colors"
                required
              />
              <button
                type="submit"
                disabled={loading || !selectedService}
                className="w-full py-4 bg-gold text-obsidian font-bold text-sm uppercase tracking-wider rounded-xl hover:bg-gold/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gold/20"
              >
                {loading ? 'Submitting...' : 'Claim Your Free Sample'}
              </button>
              {!selectedService && (
                <p className="text-ivory/30 text-xs mt-3">Select a service above to continue</p>
              )}
            </form>

            <p className="text-ivory/20 text-xs mt-8">No spam. No commitment. Just a free sample.</p>
          </div>
        )}

        {step === 2 && (
          <div className="text-center">
            <div className="w-16 h-16 bg-gold/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-gold text-2xl">✓</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">You&apos;re In!</h2>
            <p className="text-ivory/60 mb-8 max-w-md mx-auto leading-relaxed">
              Thanks, {name}! Here&apos;s what happens next:
            </p>

            <div className="max-w-sm mx-auto text-left space-y-4 mb-10">
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-gold text-obsidian rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">1</div>
                <div>
                  <p className="text-white text-sm font-semibold">I&apos;ll reach out within 24 hours</p>
                  <p className="text-ivory/40 text-xs">Via email or DM to collect your files</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-gold text-obsidian rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">2</div>
                <div>
                  <p className="text-white text-sm font-semibold">I complete your free sample</p>
                  <p className="text-ivory/40 text-xs">48-hour turnaround on your edit or mix</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-gold text-obsidian rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">3</div>
                <div>
                  <p className="text-white text-sm font-semibold">You decide if you want to continue</p>
                  <p className="text-ivory/40 text-xs">No pressure — the sample speaks for itself</p>
                </div>
              </div>
            </div>

            <a
              href={serviceLink}
              className="inline-block bg-gold text-obsidian px-8 py-3 font-bold text-sm uppercase tracking-wider rounded-xl hover:bg-gold/90 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gold/20"
            >
              Browse Packages While You Wait
            </a>

            <p className="text-ivory/20 text-xs mt-6">
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
