import { Metadata } from 'next'
import NicheLanding from '@/components/NicheLanding'
import JsonLd, { breadcrumbSchema } from '@/components/JsonLd'

export const metadata: Metadata = {
  title: 'Content Editing for Fitness Coaches & Gyms',
  description: 'Professional workout and fitness Reels editing. Stop spending hours editing and start coaching more clients. Free sample edit.',
}

export default function FitnessPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: 'https://www.asaluke.io' },
        { name: 'Content Editing', url: 'https://www.asaluke.io/services/content-editing' },
        { name: 'For Fitness', url: 'https://www.asaluke.io/for/fitness' },
      ])} />
    <NicheLanding
      headline="Your Workouts Transform Bodies. Your Content Should Too."
      subheadline="You know how to change lives in the gym. But filming and editing takes 3x longer than the actual workout. We handle the content so you can focus on coaching."
      painPoints={[
        "You're spending 2-3 hours editing a single workout video that gets 50 views",
        "Your content doesn't match the quality of your coaching and it's hurting your brand",
        "You know you need to post consistently but editing burns you out",
        "Other coaches are blowing up because they have a content team — you don't",
      ]}
      solution={[
        "12 professionally edited workout Reels per month — clips, transformations, tips",
        "Dynamic cuts, motivational text overlays, and trending audio",
        "Color grading that makes your gym and physique look elite",
        "Captions and hashtag strategy for fitness audiences",
        "Unlimited revisions — we don't stop until you're happy",
      ]}
      ctaText="Get a Free Sample Edit"
      service="content"
      source="fitness-landing"
      steps={[
        { title: 'Film Your Workout', desc: 'Record your sets, coaching clips, or client transformations on your phone' },
        { title: 'We Edit It', desc: 'We add pro cuts, text overlays, music, and hooks that stop the scroll' },
        { title: 'You Post & Grow', desc: 'Get it back in 48 hours. Post it and attract new clients.' },
      ]}
    />
    </>
  )
}
