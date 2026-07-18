import type { Metadata } from 'next'

// Link-preview metadata for /blueprint. The page itself is a client
// component, so title/description live here. The og:image is supplied
// automatically by ./opengraph-image.tsx.
const title = 'Free Calorie Blueprint — Life-Up Fitness'
const description =
  'Get your exact daily calories + protein for your goal. Free, personalized 7-page blueprint — takes about a minute.'

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: 'https://www.asaluke.io/blueprint',
    siteName: 'Life-Up Fitness',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
}

export default function BlueprintLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
