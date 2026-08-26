import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Playfair_Display, Poppins } from "next/font/google";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";
import JsonLd, { organizationSchema } from "@/components/JsonLd";
import PWARegister from "@/components/PWARegister";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});
// Next Action dashboard redesign (2026-08-26, Asa's pick after a live
// mockup review): Playfair Display for her name/greeting, Poppins for the
// rest of that screen's UI text — the fitness+beauty pairing he chose.
// Scoped as CSS vars site-wide (cheap, same pattern as Geist above) but
// only actually used on the /plan dashboard for now.
const playfairDisplay = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"], style: ["italic", "normal"], variable: "--font-playfair" });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-poppins" });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.asaluke.io'),
  title: {
    // Asa's call, part of the rebrand alongside the new crown/leaf icon —
    // the tab/share title drops "Life-Up Fitness by Asa Luke" for just the
    // new name. Descriptive copy (description/keywords/siteName below) is
    // left as-is — this is the name change specifically, not a copy rewrite.
    default: 'Epaira',
    template: '%s | Asa Luke',
  },
  description: 'Custom workouts, done-for-you meals, and daily coaching — the app that decides for you. Life-Up Fitness by Asa Luke.',
  keywords: ['fitness coaching', 'workout app', 'meal plan app', 'personal training', 'weight loss app', 'Life-Up Fitness', 'Asa Luke', 'Los Angeles'],
  openGraph: {
    title: 'Epaira',
    description: 'Custom workouts, done-for-you meals, and daily coaching — the app that decides for you.',
    url: 'https://www.asaluke.io',
    siteName: 'Asa Luke',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Epaira',
    description: 'Custom workouts, done-for-you meals, and daily coaching — the app that decides for you.',
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Epaira', statusBarStyle: 'black-translucent' },
  icons: {
    icon: [{ url: '/favicon.png', sizes: '32x32', type: 'image/png' }, { url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#0b0b0f',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <JsonLd data={organizationSchema} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} ${poppins.variable} antialiased bg-obsidian min-h-[100dvh] flex flex-col`}
      >
        <PWARegister />
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
