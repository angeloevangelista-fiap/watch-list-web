import { useEffect, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { getStats } from '../api/watchlist'

function Stat({ label, value, sub }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  )
}

export default function StatsBar({ version }) {
  const [state, setState] = useState({ stats: null, error: null })

  useEffect(() => {
    let cancelled = false
    getStats()
      .then((stats) => !cancelled && setState({ stats, error: null }))
      .catch((error) => !cancelled && setState({ stats: null, error }))
    return () => {
      cancelled = true
    }
  }, [version])

  if (state.error) {
    return (
      <div className="alert error stats-error">
        <TriangleAlert size={18} />
        <span>
          <strong>GET /watchlist/stats</strong> failed: {state.error.message}
        </span>
      </div>
    )
  }

  const s = state.stats
  if (!s) return <div className="stats skeleton-stats" aria-busy="true" />

  const pct = s.total ? Math.round((s.watched / s.total) * 100) : 0
  return (
    <section className="stats" aria-label="Watchlist stats">
      <Stat label="Total" value={s.total} sub={`${s.byType?.movie ?? 0} movies · ${s.byType?.series ?? 0} series`} />
      <Stat label="Watched" value={s.watched} sub={`${pct}% complete`} />
      <Stat label="To watch" value={s.unwatched} />
      <Stat label="Avg. rating" value={s.averageRating != null ? `${s.averageRating}★` : '—'} />
      <div className="stat-progress" aria-hidden="true">
        <div style={{ width: `${pct}%` }} />
      </div>
    </section>
  )
}
