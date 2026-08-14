import Link from 'next/link'
import { SaveGuideButton } from './save-button'

export const metadata = {
  title: 'Free: The Mix Fix — Asa Luke',
  description: 'A universal vocal chain template with step-by-step instructions for any DAW. No specific plugins needed.',
}

export default function AudioGuide() {
  return (
    <div className="min-h-[100dvh] bg-obsidian">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block bg-emerald-500 text-white text-xs font-bold uppercase px-4 py-1 rounded-full tracking-wider mb-4">100% FREE</span>
          <p className="text-gold text-xs font-semibold tracking-[0.3em] uppercase mb-4">Free Digital Asset</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
            <span className="text-gold">The Mix Fix</span>
          </h1>
          <p className="text-ivory/60 max-w-lg mx-auto mb-6">A universal vocal chain that works in any DAW. No specific plugins needed — just your stock tools. Each step is 1-2 actions max. By Asa Luke.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
            <SaveGuideButton />
            <Link href="/services/audio-engineering" className="inline-block bg-gold text-obsidian px-6 py-3 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)]">
              Want a Pro Mix? View Packages
            </Link>
          </div>
        </div>

        {/* Intro */}
        <div className="bg-charcoal border border-smoke rounded-2xl p-8 mb-8">
          <h2 className="text-lg font-bold text-white mb-3">Before You Start</h2>
          <p className="text-ivory/60 leading-relaxed mb-3">This works in <span className="text-gold font-semibold">Logic, FL Studio, Ableton, Pro Tools, GarageBand, Studio One</span> — any DAW. Every DAW comes with the tools you need built in. No paid plugins required.</p>
          <p className="text-ivory/60 leading-relaxed">Load these in order on your vocal track. Each step is <span className="text-gold font-semibold">1-2 actions</span>. That&apos;s it. Don&apos;t overthink it.</p>
        </div>

        {/* Chain Steps */}
        <div className="space-y-6">
          {/* Step 1 */}
          <section className="bg-charcoal border border-smoke rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 bg-gold text-obsidian rounded-full flex items-center justify-center font-bold text-lg">1</div>
              <div>
                <h2 className="text-xl font-bold text-white">Turn It Down</h2>
                <p className="text-gold text-xs font-semibold uppercase tracking-wider">Gain Staging</p>
              </div>
            </div>
            <div className="bg-obsidian rounded-xl p-5 border border-gold/20">
              <p className="text-white font-semibold text-sm mb-2">Action:</p>
              <p className="text-ivory/70 text-sm">Pull your vocal fader down until the loudest parts peak around <span className="text-gold font-bold">-12 dB</span>. That&apos;s it.</p>
            </div>
            <p className="text-ivory/40 text-xs mt-3 italic">Why: Every plugin after this needs headroom to work. If your vocal is already slamming 0 dB, nothing else will sound right.</p>
          </section>

          {/* Step 2 */}
          <section className="bg-charcoal border border-smoke rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 bg-gold text-obsidian rounded-full flex items-center justify-center font-bold text-lg">2</div>
              <div>
                <h2 className="text-xl font-bold text-white">Cut the Junk</h2>
                <p className="text-gold text-xs font-semibold uppercase tracking-wider">Stock EQ — Subtractive</p>
              </div>
            </div>
            <div className="bg-obsidian rounded-xl p-5 border border-gold/20 space-y-3">
              <div>
                <p className="text-white font-semibold text-sm mb-1">Action 1:</p>
                <p className="text-ivory/70 text-sm">Add your stock EQ. Turn on a <span className="text-gold font-bold">high-pass filter at 80 Hz</span>. This removes rumble and room noise you can&apos;t even hear but muddies your mix.</p>
              </div>
              <div>
                <p className="text-white font-semibold text-sm mb-1">Action 2:</p>
                <p className="text-ivory/70 text-sm">Find the muddy range (<span className="text-gold font-bold">200-400 Hz</span>). Make a narrow cut of <span className="text-gold font-bold">-2 to -3 dB</span>. Sweep slowly — when it sounds cleaner, stop there.</p>
              </div>
            </div>
          </section>

          {/* Step 3 */}
          <section className="bg-charcoal border border-smoke rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 bg-gold text-obsidian rounded-full flex items-center justify-center font-bold text-lg">3</div>
              <div>
                <h2 className="text-xl font-bold text-white">Tame the S Sounds</h2>
                <p className="text-gold text-xs font-semibold uppercase tracking-wider">Stock De-Esser</p>
              </div>
            </div>
            <div className="bg-obsidian rounded-xl p-5 border border-gold/20">
              <p className="text-white font-semibold text-sm mb-1">Action:</p>
              <p className="text-ivory/70 text-sm">Add your stock de-esser. Set the frequency to <span className="text-gold font-bold">6-7 kHz</span>. Turn the threshold down until the harsh &quot;S&quot; and &quot;T&quot; sounds smooth out — but the vocal still sounds natural, not lispy.</p>
            </div>
            <p className="text-ivory/40 text-xs mt-3 italic">No de-esser in your DAW? Use an EQ with a narrow cut at 6-7 kHz, automated only on the S sounds. Or just skip this step — it&apos;s better to skip than overdo it.</p>
          </section>

          {/* Step 4 */}
          <section className="bg-charcoal border border-smoke rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 bg-gold text-obsidian rounded-full flex items-center justify-center font-bold text-lg">4</div>
              <div>
                <h2 className="text-xl font-bold text-white">Even It Out</h2>
                <p className="text-gold text-xs font-semibold uppercase tracking-wider">Stock Compressor</p>
              </div>
            </div>
            <div className="bg-obsidian rounded-xl p-5 border border-gold/20 space-y-3">
              <div>
                <p className="text-white font-semibold text-sm mb-1">Action 1:</p>
                <p className="text-ivory/70 text-sm">Add your stock compressor. Set ratio to <span className="text-gold font-bold">3:1</span>, attack to <span className="text-gold font-bold">10-15ms</span>, release to <span className="text-gold font-bold">100ms</span>.</p>
              </div>
              <div>
                <p className="text-white font-semibold text-sm mb-1">Action 2:</p>
                <p className="text-ivory/70 text-sm">Lower the threshold until you see <span className="text-gold font-bold">3-5 dB of gain reduction</span> on the loudest parts. Turn up the makeup gain to match the original volume.</p>
              </div>
            </div>
            <p className="text-ivory/40 text-xs mt-3 italic">The vocal should sound more consistent and upfront — not squashed or pumping. If it sounds worse, your threshold is too low.</p>
          </section>

          {/* Step 5 */}
          <section className="bg-charcoal border border-smoke rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 bg-gold text-obsidian rounded-full flex items-center justify-center font-bold text-lg">5</div>
              <div>
                <h2 className="text-xl font-bold text-white">Add the Shine</h2>
                <p className="text-gold text-xs font-semibold uppercase tracking-wider">Stock EQ — Additive</p>
              </div>
            </div>
            <div className="bg-obsidian rounded-xl p-5 border border-gold/20">
              <p className="text-white font-semibold text-sm mb-1">Action:</p>
              <p className="text-ivory/70 text-sm">Add another stock EQ (or use a second band on the same one). Add a gentle <span className="text-gold font-bold">high shelf at 10 kHz, +1 to +2 dB</span>. This adds air and presence — the vocal will feel closer and more &quot;expensive.&quot;</p>
            </div>
            <p className="text-ivory/40 text-xs mt-3 italic">Optional: boost 4-5 kHz by +1 dB for more presence/clarity. But only if the vocal needs it — less is more.</p>
          </section>

          {/* Step 6 */}
          <section className="bg-charcoal border border-smoke rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 bg-gold text-obsidian rounded-full flex items-center justify-center font-bold text-lg">6</div>
              <div>
                <h2 className="text-xl font-bold text-white">Add Space</h2>
                <p className="text-gold text-xs font-semibold uppercase tracking-wider">Stock Reverb — on a Send/Bus</p>
              </div>
            </div>
            <div className="bg-obsidian rounded-xl p-5 border border-gold/20 space-y-3">
              <div>
                <p className="text-white font-semibold text-sm mb-1">Action 1:</p>
                <p className="text-ivory/70 text-sm">Create a <span className="text-gold font-bold">send/bus</span> from your vocal track. Add your stock reverb on that bus. Set it to <span className="text-gold font-bold">100% wet</span>. Choose &quot;Plate&quot; or &quot;Room&quot; preset.</p>
              </div>
              <div>
                <p className="text-white font-semibold text-sm mb-1">Action 2:</p>
                <p className="text-ivory/70 text-sm">Set decay to <span className="text-gold font-bold">1.2-1.5 seconds</span>. Blend using the send fader — start low and raise until you hear space without the vocal sounding distant.</p>
              </div>
            </div>
            <p className="text-ivory/40 text-xs mt-3 italic">Never put reverb directly on the vocal track. Always use a send. This keeps the dry vocal clean and lets you control how much space to add.</p>
          </section>

          {/* Step 7 */}
          <section className="bg-charcoal border border-smoke rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 bg-gold text-obsidian rounded-full flex items-center justify-center font-bold text-lg">7</div>
              <div>
                <h2 className="text-xl font-bold text-white">Add Movement</h2>
                <p className="text-gold text-xs font-semibold uppercase tracking-wider">Stock Delay — on a Send/Bus</p>
              </div>
            </div>
            <div className="bg-obsidian rounded-xl p-5 border border-gold/20">
              <p className="text-white font-semibold text-sm mb-1">Action:</p>
              <p className="text-ivory/70 text-sm">Create another send/bus. Add stock delay. Set to <span className="text-gold font-bold">1/4 note, sync to BPM, feedback 15-20%</span>. Blend low — you should barely hear the repeats. It fills gaps between phrases.</p>
            </div>
            <p className="text-ivory/40 text-xs mt-3 italic">If you can clearly hear the delay repeating, it&apos;s too loud. Turn it down. It should be felt, not heard.</p>
          </section>
        </div>

        {/* Signal Flow */}
        <div className="mt-10 bg-charcoal border border-gold/30 rounded-2xl p-8">
          <h2 className="text-lg font-bold text-white mb-4 text-center">Your Complete Chain</h2>
          <div className="flex flex-wrap justify-center gap-2 text-sm">
            {['Gain Stage', 'Cut EQ', 'De-Esser', 'Compressor', 'Shine EQ', 'Reverb', 'Delay'].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="bg-gold/10 border border-gold/30 text-gold px-3 py-1.5 rounded-lg font-semibold text-xs">{step}</span>
                {i < 6 && <span className="text-gold/40">&rarr;</span>}
              </div>
            ))}
          </div>
          <p className="text-center text-ivory/40 text-xs mt-4">All stock plugins. Any DAW. 7 steps. Done.</p>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center bg-gradient-to-br from-charcoal to-gold/5 border border-gold/30 rounded-2xl p-10">
          <h3 className="text-2xl font-bold text-white mb-3">Want a Professional Mix?</h3>
          <p className="text-ivory/60 mb-8 max-w-md mx-auto">The Mix Fix gets you started. I take it to the finish line. 10+ years mixing Hip-Hop, R&B, Pop, Gospel. Send me your stems.</p>
          <Link href="/services/audio-engineering#pricing" className="inline-block bg-gold text-obsidian px-10 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-110 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)]">
            View Audio Packages
          </Link>
        </div>

        <p className="text-center text-ivory/20 text-xs mt-10">&copy; {new Date().getFullYear()} Asa Luke. All rights reserved.</p>
      </div>
    </div>
  )
}
