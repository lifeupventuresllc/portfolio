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

      {/* ── HERO ── */}
      <section className="min-h-[100vh] flex flex-col items-center justify-center text-center px-6 pt-14 relative overflow-hidden">
        <div className="luf-breathe absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_45%,rgba(201,168,76,0.10),transparent_70%)]" />

        <div className="relative z-10 flex flex-col items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight mb-6">
            ASA <span className="text-gold">LUKE</span>
          </h1>

          <p className="text-ink text-xl sm:text-2xl max-w-xl mx-auto mb-20 leading-relaxed font-medium">
            I edit your content. I mix your music. I build your body.
          </p>

          <div className="flex flex-col sm:flex-row gap-8 justify-center" style={{ perspective: '1200px' }}>
            <Link
              href="/services/content-editing#pricing"
              className="group relative px-10 sm:px-20 py-8 sm:py-10 bg-charcoal/80 border-2 border-smoke/80 rounded-3xl overflow-hidden transition-all duration-500 hover:border-gold hover:scale-[1.08] hover:-translate-y-4 hover:shadow-[0_0_60px_rgba(201,168,76,0.4),0_30px_60px_rgba(201,168,76,0.25)]"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-gold to-gold/80 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_center,rgba(201,168,76,0.4),transparent_70%)]" />
              <span className="relative z-10 text-2xl font-bold tracking-[0.25em] uppercase text-ivory group-hover:text-obsidian transition-colors duration-300">
                Content
              </span>
            </Link>

            <Link
              href="/services/audio-engineering#pricing"
              className="group relative px-10 sm:px-20 py-8 sm:py-10 bg-charcoal/80 border-2 border-smoke/80 rounded-3xl overflow-hidden transition-all duration-500 hover:border-gold hover:scale-[1.08] hover:-translate-y-4 hover:shadow-[0_0_60px_rgba(201,168,76,0.4),0_30px_60px_rgba(201,168,76,0.25)]"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-gold to-gold/80 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_center,rgba(201,168,76,0.4),transparent_70%)]" />
              <span className="relative z-10 text-2xl font-bold tracking-[0.25em] uppercase text-ivory group-hover:text-obsidian transition-colors duration-300">
                Music
              </span>
            </Link>

            <Link
              href="/#fitness"
              className="group relative px-10 sm:px-20 py-8 sm:py-10 bg-charcoal/80 border-2 border-smoke/80 rounded-3xl overflow-hidden transition-all duration-500 hover:border-gold hover:scale-[1.08] hover:-translate-y-4 hover:shadow-[0_0_60px_rgba(201,168,76,0.4),0_30px_60px_rgba(201,168,76,0.25)]"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-gold to-gold/80 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_center,rgba(201,168,76,0.4),transparent_70%)]" />
              <span className="relative z-10 text-2xl font-bold tracking-[0.25em] uppercase text-ivory group-hover:text-obsidian transition-colors duration-300">
                Fitness
              </span>
            </Link>
          </div>
        </div>

        <div className="absolute bottom-8 text-ink/25 text-xs tracking-[0.3em] uppercase animate-pulse">
          Scroll
        </div>
      </section>

      {/* ── CONTENT EDITING ── */}
      <section className="py-24 sm:py-32 px-6 border-t border-smoke/50">
        <div className="luf-reveal max-w-6xl mx-auto grid md:grid-cols-2 gap-12 md:gap-24 items-center">
          <div>
            <p className="text-gold text-sm font-semibold tracking-[0.3em] uppercase mb-5">Content Editing</p>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold text-ink mb-8 leading-[1.1]">
              Your content,<br />professionally edited.
            </h2>
            <p className="text-ink/60 text-lg leading-relaxed mb-10">
              Short-form video editing for creators and brands. Hooks, captions,
              color grading, strategy — done for you. You film, I handle the rest.
            </p>
            <Link
              href="/services/content-editing#pricing"
              className="group relative inline-block bg-gold text-obsidian px-10 py-4 text-base font-bold tracking-wider uppercase rounded-2xl transition-all duration-500 hover:scale-110 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)]"
              style={{ perspective: '600px', transformStyle: 'preserve-3d' }}
            >
              View Packages
            </Link>
            <br />
            <Link href="/services/content-editing" className="inline-block text-gold/60 text-sm tracking-wider uppercase mt-4 hover:text-gold transition-colors">
              Learn more &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4" style={{ perspective: '800px' }}>
            <div className="bg-charcoal border border-smoke/50 rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_25px_50px_rgba(201,168,76,0.15)] hover:rotate-x-[-2deg]" style={{ transformStyle: 'preserve-3d' }}>
              <p className="text-gold text-3xl font-bold mb-2">4-12+</p>
              <p className="text-ivory/40 text-sm uppercase tracking-wider">Reels / Month</p>
            </div>
            <div className="bg-charcoal border border-smoke/50 rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_25px_50px_rgba(201,168,76,0.15)] hover:rotate-x-[-2deg]" style={{ transformStyle: 'preserve-3d' }}>
              <p className="text-gold text-3xl font-bold mb-2">24-72hr</p>
              <p className="text-ivory/40 text-sm uppercase tracking-wider">Turnaround</p>
            </div>
            <div className="bg-charcoal border border-smoke/50 rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_25px_50px_rgba(201,168,76,0.15)] hover:rotate-x-[-2deg]" style={{ transformStyle: 'preserve-3d' }}>
              <p className="text-gold text-3xl font-bold mb-2">$247</p>
              <p className="text-ivory/40 text-sm uppercase tracking-wider">Starting At</p>
            </div>
            <div className="bg-charcoal border border-smoke/50 rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_25px_50px_rgba(201,168,76,0.15)] hover:rotate-x-[-2deg]" style={{ transformStyle: 'preserve-3d' }}>
              <p className="text-gold text-3xl font-bold mb-2">100%</p>
              <p className="text-ivory/40 text-sm uppercase tracking-wider">Guarantee</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── AUDIO ENGINEERING ── */}
      <section className="py-24 sm:py-32 px-6 border-t border-smoke/50 bg-charcoal/40">
        <div className="luf-reveal max-w-6xl mx-auto grid md:grid-cols-2 gap-12 md:gap-24 items-center">
          <div className="order-2 md:order-1 grid grid-cols-2 gap-4" style={{ perspective: '800px' }}>
            <div className="bg-obsidian border border-smoke/50 rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_25px_50px_rgba(201,168,76,0.15)] hover:rotate-x-[-2deg]" style={{ transformStyle: 'preserve-3d' }}>
              <p className="text-gold text-3xl font-bold mb-2">10+</p>
              <p className="text-ivory/40 text-sm uppercase tracking-wider">Years Experience</p>
            </div>
            <div className="bg-obsidian border border-smoke/50 rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_25px_50px_rgba(201,168,76,0.15)] hover:rotate-x-[-2deg]" style={{ transformStyle: 'preserve-3d' }}>
              <p className="text-gold text-3xl font-bold mb-2">48hr</p>
              <p className="text-ivory/40 text-sm uppercase tracking-wider">Turnaround</p>
            </div>
            <div className="bg-obsidian border border-smoke/50 rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_25px_50px_rgba(201,168,76,0.15)] hover:rotate-x-[-2deg]" style={{ transformStyle: 'preserve-3d' }}>
              <p className="text-gold text-3xl font-bold mb-2">$99</p>
              <p className="text-ivory/40 text-sm uppercase tracking-wider">Starting At</p>
            </div>
            <div className="bg-obsidian border border-smoke/50 rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_25px_50px_rgba(201,168,76,0.15)] hover:rotate-x-[-2deg]" style={{ transformStyle: 'preserve-3d' }}>
              <p className="text-gold text-3xl font-bold mb-2">WAV</p>
              <p className="text-ivory/40 text-sm uppercase tracking-wider">24-Bit Delivery</p>
            </div>
          </div>
          <div className="order-1 md:order-2">
            <p className="text-gold text-sm font-semibold tracking-[0.3em] uppercase mb-5">Audio Engineering</p>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold text-ink mb-8 leading-[1.1]">
              Your music,<br />professionally mixed.
            </h2>
            <p className="text-ink/60 text-lg leading-relaxed mb-10">
              Mixing and mastering for independent artists. Hip-Hop, R&B, Pop, Gospel —
              10+ years behind the board. Singles to full albums.
            </p>
            <Link
              href="/services/audio-engineering#pricing"
              className="group relative inline-block bg-gold text-obsidian px-10 py-4 text-base font-bold tracking-wider uppercase rounded-2xl transition-all duration-500 hover:scale-110 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)]"
              style={{ perspective: '600px', transformStyle: 'preserve-3d' }}
            >
              View Packages
            </Link>
            <br />
            <Link href="/services/audio-engineering" className="inline-block text-gold/60 text-sm tracking-wider uppercase mt-4 hover:text-gold transition-colors">
              Learn more &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── FITNESS ── */}
      <section id="fitness" className="relative py-24 sm:py-32 px-6 border-t border-smoke/50 overflow-hidden">
        <HeroVideoBG srcs={['/videos/hero-fitness-2.mp4', '/videos/hero-fitness-1.mp4', '/videos/hero-fitness-3.mp4', '/videos/hero-fitness-4.mp4']} />
        <div className="luf-reveal relative max-w-6xl mx-auto grid md:grid-cols-2 gap-12 md:gap-24 items-center">
          <div className="bg-paper/95 rounded-3xl p-8 sm:p-10 shadow-xl">
            <p className="text-gold text-sm font-semibold tracking-[0.3em] uppercase mb-5">Life-Up Fitness</p>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold text-ink mb-8 leading-[1.1]">
              Get snatched.<br />Without starving.
            </h2>
            <p className="text-ink/60 text-lg leading-relaxed mb-8">
              Custom workouts, meals built around the foods you actually love, daily
              check-ins, all the decisions made for you — the full app, starting at
              $10/mo. Want me personally on video too? That&apos;s the only upgrade.
            </p>
            <div className="flex flex-wrap items-center gap-5">
              <Link
                href="/challenge"
                className="group relative inline-block bg-gold text-obsidian px-10 py-4 text-base font-bold tracking-wider uppercase rounded-2xl transition-all duration-500 hover:scale-110 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)]"
                style={{ perspective: '600px', transformStyle: 'preserve-3d' }}
              >
                See pricing — from $10/mo
              </Link>
              <Link href="/blueprint" className="text-ink/70 text-sm font-semibold hover:text-gold transition-colors underline underline-offset-4">
                Start free with your Calorie Blueprint →
              </Link>
            </div>
          </div>
          <div>
            <div className="relative rounded-2xl overflow-hidden mb-4 aspect-[4/3]">
              <Image src="/images/fitness-photo-1.jpg" alt="Client mid-challenge, staying strong" fill className="object-cover" sizes="(max-width: 768px) 100vw, 400px" />
            </div>
            <div className="grid grid-cols-2 gap-4" style={{ perspective: '800px' }}>
            <div className="bg-charcoal border border-smoke/50 rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_25px_50px_rgba(201,168,76,0.15)] hover:rotate-x-[-2deg]" style={{ transformStyle: 'preserve-3d' }}>
              <p className="text-gold text-3xl font-bold mb-2">$10/mo</p>
              <p className="text-ivory/40 text-sm uppercase tracking-wider">Full App Access</p>
            </div>
            <div className="bg-charcoal border border-smoke/50 rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_25px_50px_rgba(201,168,76,0.15)] hover:rotate-x-[-2deg]" style={{ transformStyle: 'preserve-3d' }}>
              <p className="text-gold text-3xl font-bold mb-2">Custom</p>
              <p className="text-ivory/40 text-sm uppercase tracking-wider">Workouts + Meals</p>
            </div>
            <div className="bg-charcoal border border-smoke/50 rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_25px_50px_rgba(201,168,76,0.15)] hover:rotate-x-[-2deg]" style={{ transformStyle: 'preserve-3d' }}>
              <p className="text-gold text-3xl font-bold mb-2">Daily</p>
              <p className="text-ivory/40 text-sm uppercase tracking-wider">Decision-Free Check-ins</p>
            </div>
            <div className="bg-charcoal border border-smoke/50 rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_25px_50px_rgba(201,168,76,0.15)] hover:rotate-x-[-2deg]" style={{ transformStyle: 'preserve-3d' }}>
              <p className="text-gold text-3xl font-bold mb-2">Optional</p>
              <p className="text-ivory/40 text-sm uppercase tracking-wider">Video Calls With Me</p>
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── THE MENU (COOKBOOK) ── */}
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
