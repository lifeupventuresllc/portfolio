import Link from 'next/link'

export const metadata = {
  title: 'Free Vocal Chain Preset Guide — Asa Luke',
  description: 'A plug-and-play vocal chain template to get clean, professional vocals in any DAW.',
}

export default function AudioGuide() {
  return (
    <div className="min-h-screen bg-obsidian">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-gold text-xs font-semibold tracking-[0.3em] uppercase mb-4">Free Template</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
            The Vocal Chain<br /><span className="text-gold">Preset Template</span>
          </h1>
          <p className="text-ivory/60 max-w-lg mx-auto">A plug-and-play vocal chain that works in any DAW. Use these exact settings as your starting point for clean, professional vocals. By Asa Luke.</p>
        </div>

        {/* Intro */}
        <div className="bg-charcoal border border-smoke rounded-2xl p-8 mb-8">
          <h2 className="text-lg font-bold text-white mb-3">How to Use This</h2>
          <p className="text-ivory/60 leading-relaxed">Load these plugins in this exact order on your vocal track. Start with the settings below, then adjust to taste. This chain works for <span className="text-gold font-semibold">rap, R&B, pop, and singing vocals</span>. Every setting is a starting point — your voice and mic will need fine-tuning, but this gets you 80% there instantly.</p>
        </div>

        {/* Chain Steps */}
        <div className="space-y-6">
          {/* 1. Gain Staging */}
          <section className="bg-charcoal border border-smoke rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-gold text-obsidian rounded-full flex items-center justify-center font-bold text-sm">1</div>
              <div>
                <h2 className="text-white font-bold">Gain Staging</h2>
                <p className="text-ivory/40 text-xs">Before any plugin</p>
              </div>
            </div>
            <div className="bg-obsidian rounded-xl p-5 border border-smoke/50">
              <p className="text-ivory/60 text-sm leading-relaxed mb-3">Set your vocal fader so peaks hit around <span className="text-gold font-semibold">-18dBFS to -12dBFS</span>. This gives every plugin after it the headroom it needs to work properly.</p>
              <p className="text-gold/60 text-xs italic">If your vocal is already recorded too hot (peaking above -6dB), use a gain/trim plugin first to bring it down.</p>
            </div>
          </section>

          {/* 2. Subtractive EQ */}
          <section className="bg-charcoal border border-smoke rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-gold text-obsidian rounded-full flex items-center justify-center font-bold text-sm">2</div>
              <div>
                <h2 className="text-white font-bold">Subtractive EQ (Clean Up)</h2>
                <p className="text-ivory/40 text-xs">Stock EQ or FabFilter Pro-Q 3</p>
              </div>
            </div>
            <div className="bg-obsidian rounded-xl p-5 border border-smoke/50 space-y-3">
              <div className="flex justify-between items-center border-b border-smoke/30 pb-2">
                <span className="text-ivory/60 text-sm">High-pass filter</span>
                <span className="text-gold font-semibold text-sm">80-100 Hz, 18dB/oct</span>
              </div>
              <div className="flex justify-between items-center border-b border-smoke/30 pb-2">
                <span className="text-ivory/60 text-sm">Cut muddiness</span>
                <span className="text-gold font-semibold text-sm">200-350 Hz, -2 to -4 dB, narrow Q</span>
              </div>
              <div className="flex justify-between items-center border-b border-smoke/30 pb-2">
                <span className="text-ivory/60 text-sm">Cut boxiness</span>
                <span className="text-gold font-semibold text-sm">400-600 Hz, -1 to -3 dB, narrow Q</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ivory/60 text-sm">Tame harshness</span>
                <span className="text-gold font-semibold text-sm">2.5-4 kHz, -1 to -3 dB, narrow Q</span>
              </div>
              <p className="text-gold/60 text-xs italic pt-2">Sweep each band slowly while the vocal plays. When it sounds bad, that&apos;s your problem frequency. Cut it.</p>
            </div>
          </section>

          {/* 3. De-Esser */}
          <section className="bg-charcoal border border-smoke rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-gold text-obsidian rounded-full flex items-center justify-center font-bold text-sm">3</div>
              <div>
                <h2 className="text-white font-bold">De-Esser</h2>
                <p className="text-ivory/40 text-xs">FabFilter Pro-DS, Stock De-Esser, or Waves Sibilance</p>
              </div>
            </div>
            <div className="bg-obsidian rounded-xl p-5 border border-smoke/50 space-y-3">
              <div className="flex justify-between items-center border-b border-smoke/30 pb-2">
                <span className="text-ivory/60 text-sm">Frequency target</span>
                <span className="text-gold font-semibold text-sm">5-8 kHz</span>
              </div>
              <div className="flex justify-between items-center border-b border-smoke/30 pb-2">
                <span className="text-ivory/60 text-sm">Threshold</span>
                <span className="text-gold font-semibold text-sm">Reduce 3-6 dB on harsh S sounds</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ivory/60 text-sm">Mode</span>
                <span className="text-gold font-semibold text-sm">Split-band (not wideband)</span>
              </div>
              <p className="text-gold/60 text-xs italic pt-2">You want S sounds to be smooth, not gone. If the vocal sounds lispy, you went too far.</p>
            </div>
          </section>

          {/* 4. Compression */}
          <section className="bg-charcoal border border-smoke rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-gold text-obsidian rounded-full flex items-center justify-center font-bold text-sm">4</div>
              <div>
                <h2 className="text-white font-bold">Compression</h2>
                <p className="text-ivory/40 text-xs">CLA-2A, LA-2A, Stock Compressor, or TDR Kotelnikov (free)</p>
              </div>
            </div>
            <div className="bg-obsidian rounded-xl p-5 border border-smoke/50 space-y-3">
              <div className="flex justify-between items-center border-b border-smoke/30 pb-2">
                <span className="text-ivory/60 text-sm">Ratio</span>
                <span className="text-gold font-semibold text-sm">3:1 to 4:1</span>
              </div>
              <div className="flex justify-between items-center border-b border-smoke/30 pb-2">
                <span className="text-ivory/60 text-sm">Attack</span>
                <span className="text-gold font-semibold text-sm">10-15ms (let transients through)</span>
              </div>
              <div className="flex justify-between items-center border-b border-smoke/30 pb-2">
                <span className="text-ivory/60 text-sm">Release</span>
                <span className="text-gold font-semibold text-sm">80-120ms (smooth, musical)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ivory/60 text-sm">Gain reduction</span>
                <span className="text-gold font-semibold text-sm">3-6 dB on loudest parts</span>
              </div>
              <p className="text-gold/60 text-xs italic pt-2">The vocal should sound more consistent and upfront, not squashed. If you hear pumping, your attack is too fast or ratio is too high.</p>
            </div>
          </section>

          {/* 5. Additive EQ */}
          <section className="bg-charcoal border border-smoke rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-gold text-obsidian rounded-full flex items-center justify-center font-bold text-sm">5</div>
              <div>
                <h2 className="text-white font-bold">Additive EQ (Character)</h2>
                <p className="text-ivory/40 text-xs">Stock EQ, Pultec, or Maag EQ</p>
              </div>
            </div>
            <div className="bg-obsidian rounded-xl p-5 border border-smoke/50 space-y-3">
              <div className="flex justify-between items-center border-b border-smoke/30 pb-2">
                <span className="text-ivory/60 text-sm">Presence / clarity</span>
                <span className="text-gold font-semibold text-sm">4-6 kHz, +1 to +3 dB, wide Q</span>
              </div>
              <div className="flex justify-between items-center border-b border-smoke/30 pb-2">
                <span className="text-ivory/60 text-sm">Air / sparkle</span>
                <span className="text-gold font-semibold text-sm">10-12 kHz shelf, +1 to +2 dB</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ivory/60 text-sm">Body (if needed)</span>
                <span className="text-gold font-semibold text-sm">150-200 Hz, +1 dB, wide Q</span>
              </div>
              <p className="text-gold/60 text-xs italic pt-2">Less is more here. Boost gently. If it sounds harsh after boosting presence, go back to step 2 and cut more at 2.5-4kHz first.</p>
            </div>
          </section>

          {/* 6. Reverb */}
          <section className="bg-charcoal border border-smoke rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-gold text-obsidian rounded-full flex items-center justify-center font-bold text-sm">6</div>
              <div>
                <h2 className="text-white font-bold">Reverb (Send/Bus)</h2>
                <p className="text-ivory/40 text-xs">Valhalla Room, Stock Reverb, or RC-20</p>
              </div>
            </div>
            <div className="bg-obsidian rounded-xl p-5 border border-smoke/50 space-y-3">
              <div className="flex justify-between items-center border-b border-smoke/30 pb-2">
                <span className="text-ivory/60 text-sm">Type</span>
                <span className="text-gold font-semibold text-sm">Plate or Room</span>
              </div>
              <div className="flex justify-between items-center border-b border-smoke/30 pb-2">
                <span className="text-ivory/60 text-sm">Decay</span>
                <span className="text-gold font-semibold text-sm">1.2-1.8 seconds</span>
              </div>
              <div className="flex justify-between items-center border-b border-smoke/30 pb-2">
                <span className="text-ivory/60 text-sm">Pre-delay</span>
                <span className="text-gold font-semibold text-sm">20-40ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ivory/60 text-sm">Mix (on send)</span>
                <span className="text-gold font-semibold text-sm">100% wet, blend with fader</span>
              </div>
              <p className="text-gold/60 text-xs italic pt-2">Always use reverb on a send/bus, never directly on the vocal track. EQ the reverb return — cut below 300Hz and above 8kHz to keep it clean.</p>
            </div>
          </section>

          {/* 7. Delay */}
          <section className="bg-charcoal border border-smoke rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-gold text-obsidian rounded-full flex items-center justify-center font-bold text-sm">7</div>
              <div>
                <h2 className="text-white font-bold">Delay (Send/Bus)</h2>
                <p className="text-ivory/40 text-xs">Stock Delay, H-Delay, or EchoBoy</p>
              </div>
            </div>
            <div className="bg-obsidian rounded-xl p-5 border border-smoke/50 space-y-3">
              <div className="flex justify-between items-center border-b border-smoke/30 pb-2">
                <span className="text-ivory/60 text-sm">Type</span>
                <span className="text-gold font-semibold text-sm">1/4 note or 1/8 note (sync to BPM)</span>
              </div>
              <div className="flex justify-between items-center border-b border-smoke/30 pb-2">
                <span className="text-ivory/60 text-sm">Feedback</span>
                <span className="text-gold font-semibold text-sm">15-25%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ivory/60 text-sm">Mix</span>
                <span className="text-gold font-semibold text-sm">Subtle — blend until you miss it when off</span>
              </div>
              <p className="text-gold/60 text-xs italic pt-2">Delay fills space between phrases. It shouldn&apos;t be obvious — if you can clearly hear the repeats, turn it down.</p>
            </div>
          </section>
        </div>

        {/* Signal Flow Summary */}
        <div className="mt-12 bg-charcoal border border-gold/30 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-4 text-center">Complete Signal Flow</h2>
          <div className="flex flex-wrap justify-center gap-2 text-sm">
            {['Gain Stage', 'Subtractive EQ', 'De-Esser', 'Compressor', 'Additive EQ', 'Reverb (Send)', 'Delay (Send)'].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="bg-gold/10 border border-gold/30 text-gold px-3 py-1.5 rounded-lg font-semibold text-xs">{step}</span>
                {i < 6 && <span className="text-gold/40">&rarr;</span>}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center bg-gradient-to-br from-charcoal to-gold/5 border border-gold/30 rounded-2xl p-10">
          <h3 className="text-2xl font-bold text-white mb-3">Want a Professional Mix?</h3>
          <p className="text-ivory/60 mb-8 max-w-md mx-auto">This template gets you started. I take it to the finish line. 10+ years mixing Hip-Hop, R&B, Pop, Gospel. Send me your stems.</p>
          <Link href="/services/audio-engineering#pricing" className="inline-block bg-gold text-obsidian px-10 py-4 font-bold text-sm uppercase tracking-wider rounded-2xl transition-all duration-500 hover:scale-110 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(201,168,76,0.35)]">
            View Audio Packages
          </Link>
        </div>

        <p className="text-center text-ivory/20 text-xs mt-10">&copy; {new Date().getFullYear()} Asa Luke. All rights reserved.</p>
      </div>
    </div>
  )
}
