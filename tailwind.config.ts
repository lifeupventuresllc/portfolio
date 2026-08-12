import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      minHeight: {
        // 100vh doesn't shrink when the mobile keyboard opens — the layout stays
        // sized for the full screen while the keyboard covers part of it, which
        // reads as a jarring "hard jump" the moment you start typing. 100dvh
        // (dynamic viewport height) tracks the real visible area instead.
        screen: '100dvh',
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        obsidian: '#0A0A0F',
        charcoal: '#0A0A0A',
        gold: '#C9A84C',
        ivory: '#D4C5A0',
        smoke: '#2A2A35',
        paper: '#FFFFFF',
        ink: '#0A0A0A',
        // Warm rose-pink, not a cool/neon pink — sits next to the existing warm
        // gold (#C9A84C) on dark obsidian/charcoal grounds without clashing.
        rose: '#EA5C87',
      },
      animation: {
        'slide-down': 'slide-down 0.2s ease-out',
      },
      keyframes: {
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
