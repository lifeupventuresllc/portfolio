import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
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

export const metadata: Metadata = {
  metadataBase: new URL('https://www.asaluke.io'),
  title: {
    default: 'Life-Up Fitness by Asa Luke',
    template: '%s | Asa Luke',
  },
  description: 'Custom workouts, done-for-you meals, and daily coaching — the app that decides for you. Life-Up Fitness by Asa Luke.',
  keywords: ['fitness coaching', 'workout app', 'meal plan app', 'personal training', 'weight loss app', 'Life-Up Fitness', 'Asa Luke', 'Los Angeles'],
  openGraph: {
    title: 'Life-Up Fitness by Asa Luke',
    description: 'Custom workouts, done-for-you meals, and daily coaching — the app that decides for you.',
    url: 'https://www.asaluke.io',
    siteName: 'Asa Luke',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Life-Up Fitness by Asa Luke',
    description: 'Custom workouts, done-for-you meals, and daily coaching — the app that decides for you.',
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Life-Up Fitness', statusBarStyle: 'black-translucent' },
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-obsidian min-h-screen flex flex-col`}
      >
        <PWARegister />
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
