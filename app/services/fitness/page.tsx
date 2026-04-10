'use client'

import { useState } from 'react'

const WHATS_INSIDE = [
  {
    title: '15 Core Recipes',
    desc: 'Under 30 min, under 8 ingredients, macro breakdown + cost per serving',
  },
  {
    title: 'Weekly Meal Plan',
    desc: '6 days mapped out with daily macros',
  },
  {
    title: 'Budget Grocery Lists',
    desc: 'Organized by store section, under $75/week',
  },
  {
    title: 'Protein Cheat Sheet',
    desc: 'Top 20 cheapest protein sources ranked',
  },
  {
    title: 'Prep Day Playbook',
    desc: '2-hour timed cook session, step by step',
  },
  {
    title: 'Budget Tips',
    desc: 'Substitutions that save money without losing protein',
  },
]

const FAQ = [
  {
    q: 'Is this a subscription?',
    a: 'No, one-time purchase. Download and keep forever.',
  },
  {
    q: 'Do I need a food scale?',
    a: 'No. Everything measured in cups, tablespoons, and ounces.',
  },
  {
    q: "What if I'm vegetarian?",
    a: 'Most recipes use chicken, beef, or turkey. The cheat sheet includes plant-based options like lentils, beans, and tofu.',
  },
  {
    q: 'Can I adjust portions?',
    a: 'Yes. The system works for any calorie target. Adjust portions up or down based on your size.',
  },
]

export default function ProteinBudgetSystemPage() {
  const [checkoutEmail, setCheckoutEmail] = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  async function handleCheckout() {
    if (!checkoutEmail) return
    setCheckoutLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageSlug: 'protein-budget-system', email: checkoutEmail }),
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
        <div className="max-w-3xl mx-auto text-center relative">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-4">
            Digital Product
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            The Protein Budget System
          </h1>
          <p className="text-xl sm:text-2xl text-gold font-semibold mb-6">
            Hit 120g+ protein daily on under $75/week
          </p>
          <p className="text-ivory/60 mb-10 max-w-2xl mx-auto leading-relaxed">
            15 macro-friendly recipes, a complete weekly meal plan, budget grocery lists, and a
            2-hour prep day playbook. Everything you need — one download.
          </p>
          <button
            onClick={() =>
              document.getElementById('checkout')?.scrollIntoView({ behavior: 'smooth' })
            }
            className="inline-block bg-gold text-obsidian px-10 py-4 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all duration-500 hover:scale-110 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)] cursor-pointer"
          >
            Get The System — $27
          </button>
        </div>
      </section>

      {/* Problem */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-4">
            The Problem
          </p>
          <p className="text-ivory/70 text-lg leading-relaxed">
            You know you need more protein. But groceries are expensive, meal prep feels
            overwhelming, and every app just tracks what you already ate instead of telling you what
            to eat.
          </p>
        </div>
      </section>

      {/* What's Inside */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-4xl mx-auto">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase text-center mb-3">
            Everything Included
          </p>
          <h2 className="text-3xl font-bold text-center text-white mb-4">
            What&apos;s Inside
          </h2>
          <div className="w-16 h-0.5 bg-gold/50 mx-auto mb-12" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {WHATS_INSIDE.map((item, i) => (
              <div
                key={i}
                className="bg-charcoal border border-smoke rounded-2xl p-6 hover:border-gold/40 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <svg
                    className="w-5 h-5 text-gold flex-shrink-0"
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
                  <h3 className="text-white font-semibold text-sm">{item.title}</h3>
                </div>
                <p className="text-ivory/50 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Price + Checkout */}
      <section id="checkout" className="py-20 px-4 border-t border-smoke">
        <div className="max-w-xl mx-auto">
          <div className="bg-charcoal border-2 border-gold/30 rounded-3xl p-8 sm:p-10 text-center">
            <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-4">
              One-Time Purchase
            </p>
            <div className="mb-4">
              <span className="text-5xl font-bold text-gold">$27</span>
            </div>
            <p className="text-ivory/60 text-sm mb-8 leading-relaxed">
              Less than a single week of meal delivery. Covers every week after.
            </p>

            <div className="max-w-sm mx-auto">
              <div className="flex gap-3">
                <input
                  type="email"
                  placeholder="Your email"
                  value={checkoutEmail}
                  onChange={(e) => setCheckoutEmail(e.target.value)}
                  className="flex-1 px-5 py-4 bg-obsidian border border-smoke rounded-2xl text-white text-sm placeholder-ivory/30 focus:outline-none focus:border-gold transition-colors"
                />
                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading || !checkoutEmail}
                  className="bg-gold text-obsidian px-8 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {checkoutLoading ? 'Loading...' : 'Get It — $27'}
                </button>
              </div>
              <p className="text-ivory/30 text-xs mt-3 text-center">
                Instant download. Secure payment via Stripe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-2xl mx-auto">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase text-center mb-3">
            Questions
          </p>
          <h2 className="text-3xl font-bold text-center text-white mb-4">
            Frequently Asked
          </h2>
          <div className="w-16 h-0.5 bg-gold/50 mx-auto mb-10" />

          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <button
                key={i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left bg-charcoal border border-smoke rounded-2xl p-5 hover:border-gold/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold text-sm">{item.q}</h3>
                  <svg
                    className={`w-4 h-4 text-gold flex-shrink-0 ml-4 transition-transform duration-300 ${
                      openFaq === i ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <polyline
                      points="6 9 12 15 18 9"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                {openFaq === i && (
                  <p className="text-ivory/60 text-sm mt-3 leading-relaxed">{item.a}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Stop Guessing. Start Eating.
          </h2>
          <p className="text-ivory/60 mb-8">
            One system. Every meal planned. Every dollar accounted for.
          </p>
          <button
            onClick={() =>
              document.getElementById('checkout')?.scrollIntoView({ behavior: 'smooth' })
            }
            className="inline-block bg-gold text-obsidian px-10 py-4 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all duration-500 hover:scale-110 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)] cursor-pointer"
          >
            Get The System — $27
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
