import Link from 'next/link'
import Image from 'next/image'
import JsonLd, { localBusinessSchema } from '@/components/JsonLd'
import RevealScript from '@/components/RevealScript'
import HeroVideoBG from '@/components/HeroVideoBG'

export const dynamic = 'force-dynamic'

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] bg-paper">
      <JsonLd data={localBusinessSchema} />
      <RevealScript />

      {/* ── FITNESS — the lead. Everything else on this domain is secondary. ── */}
      <section id="fitness" className="relative pt-32 pb-24 sm:pb-32 px-6 overflow-hidden">
        <HeroVideoBG srcs={['/videos/hero-fitness-5.mp4', '/videos/hero-fitness-2.mp4', '/videos/hero-fitness-1.mp4', '/videos/hero-fitness-3.mp4', '/videos/hero-fitness-4.mp4']} />
        <div className="luf-reveal relative max-w-6xl mx-auto grid md:grid-cols-2 gap-12 md:gap-24 items-center">
          <div className="bg-paper/70 backdrop-blur-md rounded-3xl p-8 sm:p-10 shadow-xl">
            <p className="text-gold text-sm font-semibold tracking-[0.3em] uppercase mb-5">Life-Up Fitness App</p>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-ink mb-6 leading-[1.1]">
              Two things get in your way. This app removes both.
            </h1>
            <p className="text-gold text-lg sm:text-xl font-semibold mb-6">
              No time to figure it out. No willpower left when cravings hit.
            </p>
            <p className="text-ink/60 text-lg leading-relaxed mb-6">
              Custom workouts, meals built around the foods you actually love, all the
              decisions made for you — the full app, 100% free.
            </p>
            <p className="text-sm mb-8">
              <span className="inline-block bg-gold/10 border border-gold/30 text-gold font-semibold px-3 py-1.5 rounded-xl">
                No trial. No card. Just create your account.
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-5">
              {/* Straight to signup, not /challenge — that page is a near-duplicate
                  of this same pitch (same headline, same "100% free" copy), so
                  routing homepage traffic through it first was a real redundant
                  hop: read the pitch, click Get Started, read almost the same
                  pitch again, click Get Started again, THEN finally reach the
                  form. /challenge still exists for other traffic (ads, social
                  links) that hasn't seen this pitch yet. */}
              <Link
                href="/signup?redirect=/plan/intake"
                className="group relative inline-block bg-gold text-obsidian px-10 py-4 text-base font-bold tracking-wider uppercase rounded-2xl transition-all duration-500 hover:scale-110 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)]"
                style={{ perspective: '600px', transformStyle: 'preserve-3d' }}
              >
                Get started — 100% free
              </Link>
              <Link href="/blueprint" className="text-ink/70 text-sm font-semibold hover:text-gold transition-colors underline underline-offset-4">
                Start free with your Calorie Blueprint →
              </Link>
            </div>
          </div>
          <div>
            <div className="relative rounded-2xl overflow-hidden mb-4 aspect-[4/3]">
              <Image src="/images/fitness-photo-1.jpg" alt="Client mid-challenge, staying strong" fill className="object-cover" sizes="(max-width: 768px) 100vw, 400px" priority />
            </div>
            <div className="grid grid-cols-2 gap-4" style={{ perspective: '800px' }}>
            <div className="bg-charcoal/70 backdrop-blur-md border border-white/10 rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_25px_50px_rgba(201,168,76,0.15)] hover:rotate-x-[-2deg]" style={{ transformStyle: 'preserve-3d' }}>
              <p className="text-gold text-lg font-bold mb-1">Sculpt Sessions</p>
              <p className="text-ivory/40 text-sm">Custom workouts, home or gym, matched to your level</p>
            </div>
            <div className="bg-charcoal/70 backdrop-blur-md border border-white/10 rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_25px_50px_rgba(201,168,76,0.15)] hover:rotate-x-[-2deg]" style={{ transformStyle: 'preserve-3d' }}>
              <p className="text-gold text-lg font-bold mb-1">Fuel, Figured Out</p>
              <p className="text-ivory/40 text-sm">Auto-generated meals — one tap builds your week</p>
            </div>
            <div className="bg-charcoal/70 backdrop-blur-md border border-white/10 rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_25px_50px_rgba(201,168,76,0.15)] hover:rotate-x-[-2deg]" style={{ transformStyle: 'preserve-3d' }}>
              <p className="text-gold text-lg font-bold mb-1">Fast-Food Fix</p>
              <p className="text-ivory/40 text-sm">Away-from-home escape plan — instant order, no decision</p>
            </div>
            <div className="bg-charcoal/70 backdrop-blur-md border border-white/10 rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_25px_50px_rgba(201,168,76,0.15)] hover:rotate-x-[-2deg]" style={{ transformStyle: 'preserve-3d' }}>
              <p className="text-gold text-lg font-bold mb-1">Coach On Call</p>
              <p className="text-ivory/40 text-sm">Voice memo me, I hear it, I respond</p>
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section className="py-24 px-6 border-t border-smoke/50">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-3xl font-bold text-ink mb-3">Let&apos;s work.</h2>
          <p className="text-ink/50 text-sm mb-10">DM me or reach out below.</p>

          <div className="flex flex-col gap-3 mb-10">
            <a href="https://instagram.com/1AsaLuke" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 bg-charcoal/70 backdrop-blur-md border border-white/10 py-4 rounded-xl text-ivory text-sm hover:border-gold hover:text-gold transition-all duration-300">
              Instagram — @1AsaLuke
            </a>
            <a href="mailto:info.lifeupventures@gmail.com"
              className="flex items-center justify-center gap-3 bg-charcoal/70 backdrop-blur-md border border-white/10 py-4 rounded-xl text-ivory text-sm hover:border-gold hover:text-gold transition-all duration-300">
              info.lifeupventures@gmail.com
            </a>
            <a href="tel:+13127214945"
              className="flex items-center justify-center gap-3 bg-charcoal/70 backdrop-blur-md border border-white/10 py-4 rounded-xl text-ivory text-sm hover:border-gold hover:text-gold transition-all duration-300">
              312-721-4945
            </a>
          </div>
        </div>
      </section>

      {/* ── Small, out-of-the-way mention — this is a fitness site now ── */}
      <p className="text-center text-ink/30 text-[11px] py-5 px-6 space-x-3">
        <span>Also making music —</span>
        <a href="https://open.spotify.com/search/Asa%20Luke" target="_blank" rel="noopener noreferrer" className="underline hover:text-ink/50 transition-colors">Spotify</a>
        <a href="https://music.apple.com/search?term=Asa+Luke" target="_blank" rel="noopener noreferrer" className="underline hover:text-ink/50 transition-colors">Apple Music</a>
        <Link href="/services/audio-engineering" className="underline hover:text-ink/50 transition-colors">Audio Engineering</Link>
      </p>

      {/* ── FOOTER ── */}
    </div>
  )
}
