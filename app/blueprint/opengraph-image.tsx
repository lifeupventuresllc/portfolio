import { ImageResponse } from 'next/og'

// Link-preview (Open Graph) image for the /blueprint page.
// Next.js auto-wires og:image + twitter:image from this file, so the link
// no longer previews as a black box when shared (IG DMs, iMessage, etc).
export const runtime = 'edge'
export const alt = 'Life-Up Fitness — Free Calorie Blueprint'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function BlueprintOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #1A1A22 0%, #0A0A0F 55%)',
          padding: '64px 72px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top: wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: 14,
              background: '#C9A84C',
              color: '#0A0A0F',
              fontSize: 24,
              fontWeight: 900,
              letterSpacing: -1,
            }}
          >
            LU
          </div>
          <div
            style={{
              display: 'flex',
              color: '#D4C5A0',
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: 5,
            }}
          >
            LIFE-UP FITNESS
          </div>
        </div>

        {/* Middle: headline */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              color: '#C9A84C',
              border: '2px solid #C9A84C',
              borderRadius: 999,
              padding: '8px 22px',
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 2,
              marginBottom: 28,
            }}
          >
            FREE · 7-PAGE PERSONALIZED
          </div>
          <div
            style={{
              display: 'flex',
              color: '#FFFFFF',
              fontSize: 92,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: -2,
            }}
          >
            Your Calorie
          </div>
          <div
            style={{
              display: 'flex',
              color: '#C9A84C',
              fontSize: 92,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: -2,
            }}
          >
            Blueprint
          </div>
        </div>

        {/* Bottom: subtitle */}
        <div
          style={{
            display: 'flex',
            color: '#D4C5A0',
            fontSize: 32,
            fontWeight: 500,
          }}
        >
          Exactly how many calories + how much protein to eat for your goal.
        </div>
      </div>
    ),
    { ...size }
  )
}
