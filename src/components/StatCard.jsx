/**
 * Dashboard stat card — same structure/classes as the demo's stat cards,
 * with the animated counter extracted into <Counter />.
 */
export default function StatCard({ label, children, trend, trendColor = 'good', delay = 0, counter = false }) {
  const trendClass =
    trendColor === 'good'
      ? 'text-[var(--good)]'
      : 'text-[var(--accent)]'
  const delayClass = delay ? ` d${delay}` : ''
  return (
    <div className={`card reveal${delayClass} p-5`}>
      <div className="text-xs text-[var(--ink-soft)] font-medium">{label}</div>
      <div className={`text-3xl font-extrabold mt-1${counter ? ' counter' : ''}`}>{children}</div>
      <div className={`text-xs font-semibold mt-1 ${trendClass}`}>{trend}</div>
    </div>
  )
}
