import { Metadata } from 'next'
import NicheLanding from '@/components/NicheLanding'
import JsonLd, { breadcrumbSchema } from '@/components/JsonLd'

export const metadata: Metadata = {
  title: 'Content Editing for Restaurants',
  description: 'Professional Reels and video editing for restaurants. Make your food look as good online as it tastes in person. Free sample edit.',
}

export default function RestaurantsPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: 'https://www.asaluke.io' },
        { name: 'Content Editing', url: 'https://www.asaluke.io/services/content-editing' },
        { name: 'For Restaurants', url: 'https://www.asaluke.io/for/restaurants' },
      ])} />
    <NicheLanding
      headline="Your Food Looks Amazing. Your Instagram Doesn't."
      subheadline="You spend hours perfecting your dishes. Let us perfect how they look on screen. 12 professionally edited Reels per month — so your food gets the attention it deserves."
      painPoints={[
        "You're posting blurry phone videos of incredible food and getting zero engagement",
        "Your competitors are getting more foot traffic because their Instagram looks professional",
        "You don't have time to learn video editing — you're running a restaurant",
        "You've tried posting consistently but gave up because the results were flat",
      ]}
      solution={[
        "12 professionally edited Reels per month showcasing your dishes, atmosphere, and specials",
        "Captions and hashtag strategy tailored to local food audiences",
        "Brand-matched color grading that makes your food pop on screen",
        "Content calendar so you always know what's posting and when",
        "48-hour turnaround on every edit — no delays",
      ]}
      ctaText="Get a Free Sample Edit"
      service="content"
      source="restaurant-landing"
      steps={[
        { title: 'Send Us a Clip', desc: 'Film a quick video of your food, kitchen, or restaurant vibe on your phone' },
        { title: 'We Edit It', desc: 'We add cuts, music, captions, color grading, and hooks that stop the scroll' },
        { title: 'You Post It', desc: 'Get the finished Reel back in 48 hours. Post it and watch engagement grow.' },
      ]}
    />
    </>
  )
}
