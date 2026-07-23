import Link from 'next/link'
import Image from 'next/image'
import JsonLd, { localBusinessSchema } from '@/components/JsonLd'
import RevealScript from '@/components/RevealScript'
import HeroVideoBG from '@/components/HeroVideoBG'

export const dynamic = 'force-dynamic'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper">
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
            <p className="text-ink/60 text-lg leading-relaxed mb-8">
              Custom workouts, meals built around the foods you actually love, daily
              check-ins, all the decisions made for you — the full app, starting at
              $10/mo. Want me personally checking in on video too? That&apos;s the only upgrade.
            </p>
            <div className="flex flex-wrap items-center gap-5">
              <Link
                href="/challenge"
                className="group relative inline-block bg-gold text-obsidian px-10 py-4 text-base font-bold tracking-wider uppercase rounded-2xl transition-all duration-500 hover:scale-110 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)]"
                style={{ perspective: '600px', transformStyle: 'preserve-3d' }}
              >
                Try free for 14 days — from $10/mo after
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
            <div className="bg-charcoal border border-smoke/50 rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_25px_50px_rgba(201,168,76,0.15)] hover:rotate-x-[-2deg]" style={{ transformStyle: 'preserve-3d' }}>
              <p className="text-gold text-lg font-bold mb-1">Custom workouts</p>
              <p className="text-ivory/40 text-sm">Home or gym, matched to your level</p>
            </div>
            <div className="bg-charcoal border border-smoke/50 rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_25px_50px_rgba(201,168,76,0.15)] hover:rotate-x-[-2deg]" style={{ transformStyle: 'preserve-3d' }}>
              <p className="text-gold text-lg font-bold mb-1">Auto-generated meals</p>
              <p className="text-ivory/40 text-sm">One tap builds your week — tweak anything after</p>
            </div>
            <div className="bg-charcoal border border-smoke/50 rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_25px_50px_rgba(201,168,76,0.15)] hover:rotate-x-[-2deg]" style={{ transformStyle: 'preserve-3d' }}>
              <p className="text-gold text-lg font-bold mb-1">Daily check-ins</p>
              <p className="text-ivory/40 text-sm">&quot;How are you feeling&quot; — I adjust your day</p>
            </div>
            <div className="bg-charcoal border border-smoke/50 rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_25px_50px_rgba(201,168,76,0.15)] hover:rotate-x-[-2deg]" style={{ transformStyle: 'preserve-3d' }}>
              <p className="text-gold text-lg font-bold mb-1">Talk to your coach</p>
              <p className="text-ivory/40 text-sm">Voice memo me, I hear it, I respond</p>
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── THE MENU (COOKBOOK) — fitness-adjacent, stays right after ── */}
      <section className="py-24 sm:py-32 px-6 border-t border-smoke/50 bg-charcoal/40">
        <div className="luf-reveal max-w-6xl mx-auto grid md:grid-cols-2 gap-12 md:gap-24 items-center">
          <div className="order-2 md:order-1 grid grid-cols-2 gap-4" style={{ perspective: '800px' }}>
            <div className="bg-charcoal border border-smoke/50 rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_25px_50px_rgba(201,168,76,0.15)]">
              <p className="text-gold text-3xl font-bold mb-2">25+</p>
              <p className="text-ivory/40 text-sm uppercase tracking-wider">Recipes</p>
            </div>
            <div className="bg-charcoal border border-smoke/50 rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_25px_50px_rgba(201,168,76,0.15)]">
              <p className="text-gold text-3xl font-bold mb-2">$25.99</p>
              <p className="text-ivory/40 text-sm uppercase tracking-wider">One-Time</p>
            </div>
            <div className="bg-charcoal border border-smoke/50 rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_25px_50px_rgba(201,168,76,0.15)]">
              <p className="text-gold text-3xl font-bold mb-2">Macros</p>
              <p className="text-ivory/40 text-sm uppercase tracking-wider">+ Cost Per Serving</p>
            </div>
            <div className="bg-charcoal border border-smoke/50 rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_25px_50px_rgba(201,168,76,0.15)]">
              <p className="text-gold text-3xl font-bold mb-2">Lifetime</p>
              <p className="text-ivory/40 text-sm uppercase tracking-wider">Access</p>
            </div>
          </div>
          <div className="order-1 md:order-2">
            <p className="text-gold text-sm font-semibold tracking-[0.3em] uppercase mb-5">Digital Cookbook</p>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold text-ink mb-8 leading-[1.1]">
              The Menu.
            </h2>
            <p className="text-ink/60 text-lg leading-relaxed mb-10">
              25+ macro-friendly recipes — breakfast, lunch, dinner, snacks, and desserts —
              each with full macros and cost per serving. No guesswork, just food that fits your goals.
            </p>
            <Link
              href="/services/fitness#menu"
              className="group relative inline-block bg-gold text-obsidian px-10 py-4 text-base font-bold tracking-wider uppercase rounded-2xl transition-all duration-500 hover:scale-110 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)]"
              style={{ perspective: '600px', transformStyle: 'preserve-3d' }}
            >
              Get The Menu — $25.99
            </Link>
          </div>
        </div>
      </section>

      {/* ── ALSO BY ASA LUKE — Content + Music, demoted to a compact secondary section ── */}
      <section className="py-20 px-6 border-t border-smoke/50">
        <div className="max-w-4xl mx-auto">
          <p className="text-gold text-xs font-semibold tracking-[0.3em] uppercase mb-2 text-center">Also By Asa Luke</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-ink mb-10 text-center">Content editing &amp; music mixing, on the side.</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            <Link href="/services/content-editing" className="group block bg-charcoal border border-smoke/50 rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:-translate-y-1">
              <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-2">Content Editing</p>
              <p className="text-white text-xl font-bold mb-2">Your content, professionally edited.</p>
              <p className="text-ivory/50 text-sm mb-4">Short-form video editing for creators and brands. Starting at $247.</p>
              <span className="text-gold text-sm font-semibold group-hover:translate-x-1 transition-transform inline-block">Learn more →</span>
            </Link>
            <Link href="/services/audio-engineering" className="group block bg-charcoal border border-smoke/50 rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:-translate-y-1">
              <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-2">Audio Engineering</p>
              <p className="text-white text-xl font-bold mb-2">Your music, professionally mixed.</p>
              <p className="text-ivory/50 text-sm mb-4">Mixing and mastering for independent artists. Starting at $99.</p>
              <span className="text-gold text-sm font-semibold group-hover:translate-x-1 transition-transform inline-block">Learn more →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── LISTEN ── */}
      <section className="py-24 px-6 border-t border-smoke/50 bg-charcoal/40">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-gold text-xs font-semibold tracking-[0.3em] uppercase mb-3">Listen</p>
          <h2 className="text-2xl font-bold text-ink mb-8">Find Me on These Platforms</h2>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="https://open.spotify.com/search/Asa%20Luke" target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-full border border-smoke/50 text-ink/70 text-sm hover:border-gold hover:text-gold transition-all duration-300">
              Spotify
            </a>
            <a href="https://music.apple.com/search?term=Asa+Luke" target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-full border border-smoke/50 text-ink/70 text-sm hover:border-gold hover:text-gold transition-all duration-300">
              Apple Music
            </a>
            <a href="https://soundcloud.com/search?q=asa%20luke" target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-full border border-smoke/50 text-ink/70 text-sm hover:border-gold hover:text-gold transition-all duration-300">
              SoundCloud
            </a>
            <a href="https://music.youtube.com/search?q=Asa+Luke" target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-full border border-smoke/50 text-ink/70 text-sm hover:border-gold hover:text-gold transition-all duration-300">
              YouTube Music
            </a>
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
              className="flex items-center justify-center gap-3 bg-charcoal border border-smoke/50 py-4 rounded-xl text-ivory text-sm hover:border-gold hover:text-gold transition-all duration-300">
              Instagram — @1AsaLuke
            </a>
            <a href="mailto:info.lifeupventures@gmail.com"
              className="flex items-center justify-center gap-3 bg-charcoal border border-smoke/50 py-4 rounded-xl text-ivory text-sm hover:border-gold hover:text-gold transition-all duration-300">
              info.lifeupventures@gmail.com
            </a>
            <a href="tel:+13127214945"
              className="flex items-center justify-center gap-3 bg-charcoal border border-smoke/50 py-4 rounded-xl text-ivory text-sm hover:border-gold hover:text-gold transition-all duration-300">
              312-721-4945
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
    </div>
  )
}
