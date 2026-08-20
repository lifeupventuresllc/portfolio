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

      {/* ── Top-of-page app CTA — same free-entry link and copy as the hero
          and footer ones, largest of the three since it's the very first
          thing a visitor sees (before the fixed Navbar's Login/My Plan
          links, which never offer this free no-signup entry point, or the
          whole hero below it) — but no heavy border/color-block around it;
          just a clean, larger version of the same gold button + a soft
          shadow, matching the understated glass-card look everywhere else
          on this page instead of reading as a loud banner. ── */}
      <div className="pt-24 pb-10 px-6 text-center">
        <Link
          href="/try?to=/plan"
          className="inline-block bg-gold text-obsidian px-12 py-5 text-lg sm:text-xl font-bold tracking-wider uppercase rounded-2xl shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
        >
          Get started — 100% free
        </Link>
      </div>

      {/* ── FITNESS — the lead. Everything else on this domain is secondary. ── */}
      <section id="fitness" className="relative pt-12 pb-24 sm:pb-32 px-6 overflow-hidden">
        <HeroVideoBG srcs={['/videos/hero-fitness-5.mp4', '/videos/hero-fitness-2.mp4', '/videos/hero-fitness-1.mp4', '/videos/hero-fitness-3.mp4', '/videos/hero-fitness-4.mp4']} />
        <div className="luf-reveal relative max-w-6xl mx-auto grid md:grid-cols-2 gap-12 md:gap-24 items-center">
          <div className="bg-paper/70 backdrop-blur-md rounded-3xl p-8 sm:p-10 shadow-xl">
            <p className="text-gold text-sm font-semibold tracking-[0.3em] uppercase mb-5">Life-Up Fitness App</p>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-ink mb-6 leading-[1.1] uppercase">
              Willpower&apos;s not the point. Catching you is.
            </h1>
            <p className="text-gold text-lg sm:text-xl font-semibold mb-6">
              You&apos;re not lacking discipline — you&apos;re carrying a job, a household, and everyone
              else&apos;s needs before your own.
            </p>
            <p className="text-ink/60 text-lg leading-relaxed mb-6">
              That&apos;s the real reason fitness apps stop working for you — not that you didn&apos;t
              want it enough, just that nobody built one that actually noticed when you started
              slipping. This one does. It catches the moment before you quit and rebuilds your
              plan around the life you&apos;re actually living, not the one a generic program
              assumes you have.
            </p>
            <p className="text-sm mb-8">
              <span className="inline-block bg-gold/10 border border-gold/30 text-gold font-semibold px-3 py-1.5 rounded-xl">
                No signup. No card. Just start.
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-5">
              {/* /try, not straight to /signup — she gets into the real dashboard
                  immediately, no account wall, matching the Instagram/TikTok
                  pattern Asa asked for. Points at /plan (not /plan/intake) —
                  she should never be routed straight into the structured form;
                  Coach Asa can build a real plan for her conversationally with
                  no intake at all (see app/api/plan/operator/route.ts's
                  cold-start build). Account creation is offered later, once
                  she's actually seen her real plan (see the "Save your
                  progress" flow in app/plan/page.tsx), not required up front. */}
              <Link
                href="/try?to=/plan"
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
            {/* Leads the feature list, ahead of the 2x2 grid below — Asa's
                explicit placement call. Label deliberately doesn't claim this
                IS "the one thing the app does" (it does a lot — workouts,
                meals, the coach) — it states the VALUE this delivers for
                her instead, same real-doorway convention as the grid below.
                Gold border + a small label sets it apart as the lead-in, not
                just a 5th equal tile — see luf-the-one-thing-pitch. Routes to
                Coach Asa (/plan/coach), not /plan/today: the pattern card on
                /plan/today only renders once a real dip is detected, so a
                brand-new visitor with zero history would land on a plain
                nutrition page and feel nothing — Coach Asa can actually
                demonstrate "already knows you" immediately, cold, through a
                real conversation, which is the whole point of this card.
                Asa's own correction after the first version linked here. */}
            <Link href="/try?to=/plan/coach" className="group block mb-4 bg-charcoal/70 backdrop-blur-md border border-gold/40 rounded-2xl p-8 transition-all duration-500 hover:border-gold hover:-translate-y-1 hover:shadow-[0_25px_50px_rgba(201,168,76,0.2)]">
              <p className="text-gold/70 text-[10px] uppercase tracking-[0.2em] font-semibold mb-2">Why this actually works for you</p>
              <p className="text-gold text-lg font-bold mb-1">Already Knows You</p>
              <p className="text-ivory/40 text-sm">Notices when you&apos;re about to quit, before you even say so — and quietly rebuilds your plan around your real life instead of shaming a broken streak</p>
            </Link>

            {/* Each card is a real doorway into that exact feature now (via
                /try, same no-account entry as the main CTA), not static
                marketing copy — tap "Coach On Call" and land in the real
                Coach Asa chat, not a description of it. */}
            <div className="grid grid-cols-2 gap-4" style={{ perspective: '800px' }}>
            <Link href="/try?to=/plan/workout" className="block bg-charcoal/70 backdrop-blur-md border border-white/10 rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_25px_50px_rgba(201,168,76,0.15)] hover:rotate-x-[-2deg]" style={{ transformStyle: 'preserve-3d' }}>
              <p className="text-gold text-lg font-bold mb-1">Sculpt Sessions</p>
              <p className="text-ivory/40 text-sm">Custom workouts, home or gym, matched to your level</p>
            </Link>
            <Link href="/try?to=/plan/meals" className="block bg-charcoal/70 backdrop-blur-md border border-white/10 rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_25px_50px_rgba(201,168,76,0.15)] hover:rotate-x-[-2deg]" style={{ transformStyle: 'preserve-3d' }}>
              <p className="text-gold text-lg font-bold mb-1">Fuel, Figured Out</p>
              <p className="text-ivory/40 text-sm">Auto-generated meals — one tap builds your week</p>
            </Link>
            <Link href="/try?to=/plan/eating-out" className="block bg-charcoal/70 backdrop-blur-md border border-white/10 rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_25px_50px_rgba(201,168,76,0.15)] hover:rotate-x-[-2deg]" style={{ transformStyle: 'preserve-3d' }}>
              <p className="text-gold text-lg font-bold mb-1">Fast-Food Fix</p>
              <p className="text-ivory/40 text-sm">Away-from-home escape plan — instant order, no decision</p>
            </Link>
            <Link href="/try?to=/plan/coach" className="block bg-charcoal/70 backdrop-blur-md border border-white/10 rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_25px_50px_rgba(201,168,76,0.15)] hover:rotate-x-[-2deg]" style={{ transformStyle: 'preserve-3d' }}>
              <p className="text-gold text-lg font-bold mb-1">Coach On Call</p>
              <p className="text-ivory/40 text-sm">Voice memo me, I hear it, I respond</p>
            </Link>
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

      {/* ── Bottom-of-page app link — the last real CTA before the page ends,
          for anyone who scrolled all the way through and needs one more
          chance to actually start. ── */}
      <section className="pb-16 px-6 text-center">
        <Link
          href="/try?to=/plan"
          className="inline-block bg-gold text-obsidian px-10 py-4 text-base font-bold tracking-wider uppercase rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)]"
        >
          Get started — 100% free
        </Link>
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
