import BottomTabBar from '@/components/BottomTabBar'
import TrackAppOpen from '@/components/TrackAppOpen'
import NextStepBar from '@/components/NextStepBar'

// Persistent 3-tab bottom nav across every /plan/* page — Today, Progress,
// Community. Padding-bottom on the wrapper keeps the fixed bar from ever
// covering page content, no per-page adjustment needed. TrackAppOpen is the
// Phase 2 passive signal — a real visit timestamp, no permission prompt.
export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TrackAppOpen />
      {/* Bar height PLUS the iPhone home-indicator strip (2026-10-23, Asa:
          "sometimes you can't click all the buttons… it gets cut off") —
          pb-16 alone left the last ~34px of every page under the tab bar. */}
      <div style={{ paddingBottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}>{children}</div>
      <NextStepBar />
      <BottomTabBar />
    </>
  )
}
