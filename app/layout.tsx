import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navbar from "@/components/Navbar";

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
    default: 'Asa Luke — Content Editing | Audio Engineering | Fitness',
    template: '%s | Asa Luke',
  },
  description: 'I edit your content. I mix your music. I build your body. Professional content editing, audio engineering, and fitness coaching by Asa Luke.',
  keywords: ['content editing', 'video editing', 'audio engineering', 'mixing', 'mastering', 'fitness coaching', 'reels editing', 'social media content', 'Asa Luke', 'Los Angeles'],
  openGraph: {
    title: 'Asa Luke — Content Editing | Audio Engineering | Fitness',
    description: 'I edit your content. I mix your music. I build your body.',
    url: 'https://www.asaluke.io',
    siteName: 'Asa Luke',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Asa Luke — Content Editing | Audio Engineering | Fitness',
    description: 'I edit your content. I mix your music. I build your body.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-obsidian`}
      >
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
