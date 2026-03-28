import { Metadata } from 'next'
import NicheLanding from '@/components/NicheLanding'

export const metadata: Metadata = {
  title: 'Mixing & Mastering for Independent Artists',
  description: 'Professional mixing and mastering for independent music artists. Make your music sound radio-ready. Free mix of one track.',
}

export default function ArtistsPage() {
  return (
    <NicheLanding
      headline="Your Music Deserves a Professional Mix."
      subheadline="You've written something great. But bedroom mixes don't compete with what's on Spotify. Get a professional mix that makes your music sound radio-ready — without paying big studio prices."
      painPoints={[
        "Your mixes sound muddy, thin, or flat compared to professional releases",
        "You've watched 100 YouTube tutorials but still can't get the sound you hear in your head",
        "Big studios charge $500-2000 per track and you can't afford that right now",
        "You're losing listeners because the production quality doesn't match your talent",
      ]}
      solution={[
        "Professional mixing and mastering with 10+ years experience",
        "Your tracks will sound clean, punchy, and competitive on any platform",
        "Works with any DAW — just send us your stems",
        "Unlimited revisions until you're 100% satisfied",
        "Fast turnaround — most tracks done in 48-72 hours",
      ]}
      ctaText="Get a Free Mix"
      service="audio"
      source="artist-landing"
      steps={[
        { title: 'Send Your Stems', desc: 'Export your individual tracks (vocals, drums, bass, etc.) from any DAW' },
        { title: 'We Mix & Master', desc: 'We balance, EQ, compress, and master your track to professional standards' },
        { title: 'You Release', desc: 'Get your polished track back in 48-72 hours. Ready for Spotify, Apple Music, everywhere.' },
      ]}
    />
  )
}
