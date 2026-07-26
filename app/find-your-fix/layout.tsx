import type { Metadata } from 'next'

// Link-preview metadata for /find-your-fix. The page itself is a client
// component, so title/description live here. The og:image is supplied
// automatically by ./opengraph-image.tsx.
const title = 'Find Your Fix — Life-Up Fitness'
const description =
  'Take the 60-second quiz and find out exactly what\'s been stalling your weight loss — nutrition, movement, or both. Free.'

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: 'https://www.asaluke.io/find-your-fix',
    siteName: 'Life-Up Fitness',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
}

export default function FindYourFixLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
