'use client'

import { useState, Suspense } from 'react'
import Image from 'next/image'
import HeroVideoBG from '@/components/HeroVideoBG'
import VideoTileRow from '@/components/VideoTileRow'

const INCLUDED = [
  { title: 'Your Custom Sculpt Plan', desc: 'Workouts built for you — home or gym, matched to your level (beginner → advanced) and your goal.' },
  { title: 'The Eat-What-You-Love Meal Plan', desc: 'Your meals planned every week for your goal (lose or gain), plus a grocery list built around your budget and the foods you love.' },
  { title: 'Coach Asa, Built In', desc: 'Tell it about your day — voice or text — and it adjusts your plan around your real life, right there with you.' },
  { title: 'The Curve Collective', desc: 'A private community of women walking it out with you.' },
  { title: 'The Transformation Tracker', desc: 'See your progress beyond the scale — weight, measurements, and photos over time.' },
  { title: 'The Menu Cookbook', desc: 'Cravable, macro-friendly recipes — real food you actually want to eat.' },
  { title: 'The 7-Day Jump Start', desc: 'A quick win in your very first week so you feel the momentum fast.' },
  { title: 'The Eat-Out Cheat Sheet', desc: 'Stay on track at restaurants and social events without the guilt.' },
  { title: 'The 21-Day Habit Reset', desc: 'The system that makes your results actually stick.' },
]

const FAQ = [
  { q: 'Is this actually free?', a: "Yes — every part of the app is free, no trial, no card, no catch. Custom workouts, meal plans, Coach Asa, the community, all of it." },
  { q: 'What if I want to gain weight, not lose it?', a: 'This is built for both. Your plan is set to your goal — lose or gain your first 10–15 lbs. Most programs only do fat loss; this does either.' },
  { q: "I'm a total beginner. Is this for me?", a: 'Yes. Your training is matched to your level — beginner, intermediate, or advanced — and you can train at home or in the gym.' },
  { q: 'Do I really talk to someone, or is it automated?', a: "Coach Asa is built right into the app — tell it what's going on with your day (voice or text) and it responds in real time, adjusting your plan around your actual life instead of just tracking you from a distance." },
]

export default function ChallengePage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-paper" />}>
      <ChallengeContent />
    </Suspense>
  )
}

function ChallengeContent() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-[100dvh] bg-paper">
      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <HeroVideoBG srcs={['/videos/hero-fitness-4.mp4', '/videos/hero-fitness-5.mp4', '/videos/hero-fitness-2.mp4', '/videos/hero-fitness-1.mp4', '/videos/hero-fitness-3.mp4']} />
        <div className="max-w-3xl mx-auto text-center relative bg-paper/70 backdrop-blur-md rounded-3xl p-8 sm:p-10 shadow-xl">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-4">Life-Up Fitness App</p>
          <h1 className="text-4xl sm:text-6xl font-bold text-ink mb-4 tracking-tight">Two things get in your way. This app removes both.</h1>
          <p className="text-xl sm:text-2xl text-gold font-semibold mb-6">No time to figure it out. No willpower left when cravings hit.</p>
          <p className="text-ink/60 mb-8 max-w-2xl mx-auto leading-relaxed">
            Custom training, done-for-you weekly nutrition, decisions made for you — the full app,
            100% free. No starving. No bland food. No doing it alone.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 mb-10 text-left max-w-xl mx-auto">
            {[
              { t: 'Sculpt Sessions', d: 'Custom workouts — home or gym, matched to your level' },
              { t: 'Fuel, Figured Out', d: 'Auto-generated meals — one tap builds your week' },
              { t: 'Fast-Food Fix', d: 'Away-from-home escape plan — instant order, no decision' },
              { t: 'Coach On Call', d: 'Talk to your coach — voice memo it, it hears you, it responds' },
              { t: 'Macros, Mapped Out', d: 'Calorie & macro tracking — see where you stand today' },
              { t: 'Budget, Bagged', d: 'Grocery list, budget-aware — nearby stores mapped out' },
              { t: 'The Menu — Free Forever', d: '25+ cookbook recipes, full macros + cost per serving' },
            ].map((f) => (
              <div key={f.t} className="bg-charcoal/70 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3">
                <p className="text-white font-semibold text-sm">{f.t}</p>
                <p className="text-ivory/50 text-xs mt-0.5">{f.d}</p>
              </div>
            ))}
          </div>
          <a
            href="/signup?redirect=/plan/intake"
            className="inline-block bg-gold text-obsidian px-10 py-4 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all duration-500 hover:scale-110 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)] cursor-pointer"
          >
            Get started — 100% free
          </a>
        </div>
      </section>

      {/* Whats Inside */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-4xl mx-auto">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase text-center mb-3">Everything Included</p>
          <h2 className="text-3xl font-bold text-center text-ink mb-4">What&apos;s Inside</h2>
          <div className="w-16 h-0.5 bg-gold/50 mx-auto mb-10" />
          <div className="relative rounded-2xl overflow-hidden mb-12 aspect-[21/9] max-w-2xl mx-auto">
            <Image src="/images/fitness-photo-2.jpg" alt="Pushing through the work, banded squats outdoors" fill className="object-cover object-[50%_25%]" sizes="(max-width: 768px) 100vw, 672px" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {INCLUDED.map((item, i) => (
              <div key={i} className="bg-charcoal/70 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-gold/40 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <svg className="w-5 h-5 text-gold flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <h3 className="text-white font-semibold text-sm">{item.title}</h3>
                </div>
                <p className="text-ivory/50 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Built for your level */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-3">Built For You</p>
          <h2 className="text-3xl font-bold text-ink mb-4">Matched to your level</h2>
          <div className="w-16 h-0.5 bg-gold/50 mx-auto mb-10" />
          <p className="text-ink/60 mb-8 max-w-2xl mx-auto leading-relaxed">
            Tell the app your goal, your stats, your budget, and where you train — and it builds your plan around it.
          </p>
          <div className="mb-10">
            <VideoTileRow />
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {['Beginner', 'Intermediate', 'Advanced'].map((lvl) => (
              <div key={lvl} className="bg-charcoal/70 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                <p className="text-gold font-bold mb-1">{lvl}</p>
                <p className="text-ivory/50 text-sm">Home or gym · lose or gain</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Free — the whole app, no tiers */}
      <section id="pricing" className="py-20 px-4 border-t border-smoke">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-3">Simple, By Design</p>
          <h2 className="text-3xl font-bold text-ink mb-3">100% free. Every feature. No catch.</h2>
          <p className="text-ink/50 text-sm mb-10 max-w-lg mx-auto">
            Custom workouts, done-for-you meals, Coach Asa, the community, the cookbook — everything the app does is free, for everyone, always.
          </p>
          <div className="bg-charcoal border-2 border-gold rounded-3xl p-8 sm:p-10">
            <p className="text-5xl font-bold text-emerald-400 mb-2">Free</p>
            <p className="text-ivory/50 text-sm mb-8">No trial to track. No card to enter. No plan to cancel later.</p>
            <a
              href="/signup?redirect=/plan/intake"
              className="inline-block w-full sm:w-auto bg-gold text-obsidian px-10 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)]"
            >
              Create your free account
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 border-t border-smoke">
        <div className="max-w-2xl mx-auto">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase text-center mb-3">Questions</p>
          <h2 className="text-3xl font-bold text-center text-white mb-4">Frequently Asked</h2>
          <div className="w-16 h-0.5 bg-gold/50 mx-auto mb-10" />
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <button key={i} onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full text-left bg-charcoal/70 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:border-gold/40 transition-colors">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold text-sm">{item.q}</h3>
                  <svg className={`w-4 h-4 text-gold flex-shrink-0 ml-4 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <polyline points="6 9 12 15 18 9" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                {openFaq === i && <p className="text-ivory/60 text-sm mt-3 leading-relaxed">{item.a}</p>}
              </button>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}
