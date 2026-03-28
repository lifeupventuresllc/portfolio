import { Metadata } from 'next'
import NicheLanding from '@/components/NicheLanding'

export const metadata: Metadata = {
  title: 'Content Editing for Creators',
  description: 'Professional video editing for content creators. Create more, edit less. Free sample edit of your existing content.',
}

export default function CreatorsPage() {
  return (
    <NicheLanding
      headline="Create More. Edit Less."
      subheadline="You have the ideas. You have the personality. But editing takes 3x longer than filming and it's killing your output. Let us handle the editing so you can create more."
      painPoints={[
        "Editing a single Reel takes you 2-4 hours and you're only posting 2-3 times a week",
        "Your content quality is inconsistent because you're rushing edits to keep up",
        "You're burning out trying to be the creator AND the editor",
        "You know consistent posting is key to growth but you physically can't keep up",
      ]}
      solution={[
        "12+ professionally edited Reels per month — you film, we edit",
        "Captions, hooks, and trending audio that boost engagement",
        "Brand-consistent color grading across every post",
        "Content calendar and posting strategy so you never run out of ideas",
        "48-hour turnaround — film today, post tomorrow",
      ]}
      ctaText="Get a Free Sample Edit"
      service="content"
      source="creator-landing"
      steps={[
        { title: 'Send Us Raw Footage', desc: 'Film your content like normal — no special equipment needed, just your phone' },
        { title: 'We Make It Fire', desc: 'We add professional cuts, captions, color grading, hooks, and music' },
        { title: 'You Post & Grow', desc: 'Get the finished Reel in 48 hours. Stay consistent without the burnout.' },
      ]}
    />
  )
}
