// Re-mounts on every /plan navigation → gives each page a smooth fade-in entrance.
export default function PlanTemplate({ children }: { children: React.ReactNode }) {
  return <div className="luf-page">{children}</div>
}
