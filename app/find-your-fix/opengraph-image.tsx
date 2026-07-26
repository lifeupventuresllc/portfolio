import { ImageResponse } from 'next/og'

// Link-preview (Open Graph) image for /find-your-fix. Next.js auto-wires
// og:image + twitter:image from this file, so the link no longer previews
// as a black box when shared (IG DMs, iMessage, etc).
export const runtime = 'edge'
export const alt = 'Life-Up Fitness — Find Your Fix'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function FindYourFixOgImage() {
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
              alignItems: 'center',
              gap: 12,
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
            <span>🎯</span>
            <span>FREE · 60-SECOND QUIZ</span>
          </div>
          <div
            style={{
              display: 'flex',
              color: '#FFFFFF',
              fontSize: 108,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: -2,
            }}
          >
            Find Your
          </div>
          <div
            style={{
              display: 'flex',
              color: '#C9A84C',
              fontSize: 108,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: -2,
            }}
          >
            Fix
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
          Nutrition, movement, or both — find out exactly what&apos;s been stalling you.
        </div>
      </div>
    ),
    { ...size }
  )
}
