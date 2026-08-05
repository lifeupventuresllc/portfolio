import BottomTabBar from '@/components/BottomTabBar'
import TrackAppOpen from '@/components/TrackAppOpen'

// Persistent 3-tab bottom nav across every /plan/* page — Today, Progress,
// Community. Padding-bottom on the wrapper keeps the fixed bar from ever
// covering page content, no per-page adjustment needed. TrackAppOpen is the
// Phase 2 passive signal — a real visit timestamp, no permission prompt.
export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TrackAppOpen />
      <div className="pb-16">{children}</div>
      <BottomTabBar />
    </>
  )
}
