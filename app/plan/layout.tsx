import BottomTabBar from '@/components/BottomTabBar'

// Persistent 3-tab bottom nav across every /plan/* page — Today, Progress,
// Community. Padding-bottom on the wrapper keeps the fixed bar from ever
// covering page content, no per-page adjustment needed.
export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="pb-16">{children}</div>
      <BottomTabBar />
    </>
  )
}
