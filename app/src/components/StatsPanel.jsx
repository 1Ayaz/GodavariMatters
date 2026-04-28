import { useMemo } from 'react'
import BottomSheet from './BottomSheet'
import { useApp } from '../lib/store'
import { displayName } from '../lib/names'

/**
 * StatsPanel — City-wide statistics sheet.
 * Uses the shared BottomSheet component (no custom drag/peek logic).
 * Triggered by the stats button in BottomBar via actions.toggleStats().
 */
export default function StatsPanel() {
  const { state, actions } = useApp()

  const stats = useMemo(() => {
    const all = state.reports
    const unresolved = all.filter(r => r.status !== 'resolved').length
    const resolved   = all.filter(r => r.status === 'resolved').length
    const rate = all.length > 0 ? ((resolved / all.length) * 100).toFixed(1) : '0'

    const areaMap = {}
    all.forEach(r => {
      const area = r.assigned_area || 'Unknown'
      if (!areaMap[area]) areaMap[area] = {
        name: area,
        displayName: displayName(area),
        total: 0,
        unresolved: 0,
      }
      areaMap[area].total++
      if (r.status !== 'resolved') areaMap[area].unresolved++
    })

    const leaderboard = Object.values(areaMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 15)

    return {
      unresolved,
      resolved,
      rate,
      leaderboard,
      maxCount: leaderboard[0]?.total || 1,
      total: all.length,
    }
  }, [state.reports])

  if (state.activeView !== 'map') return null

  return (
    <BottomSheet
      isOpen={state.showStats}
      onClose={actions.toggleStats}
      className="stats-sheet"
    >
      {/* ── Header ── */}
      <div className="sheet-header">
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>City Statistics</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0', fontWeight: 500 }}>
            Greater Rajamahendravaram Municipal Corporation
          </p>
        </div>
        <button className="close-btn" onClick={actions.toggleStats}>×</button>
      </div>

      {/* ── Body ── */}
      <div className="sheet-body">

        {/* Stat cards */}
        <div className="stats-cards">
          <div className="stat-card unresolved-card">
            <span className="stat-number">{stats.unresolved.toLocaleString()}</span>
            <span className="stat-label">Unresolved</span>
          </div>
          <div className="stat-card resolved-card">
            <span className="stat-number">{stats.resolved.toLocaleString()}</span>
            <span className="stat-label">Resolved</span>
          </div>
          <div className="stat-card rate-card">
            <span className="stat-number">{stats.rate}<small>%</small></span>
            <span className="stat-label">Fixed Rate</span>
          </div>
        </div>

        {/* Leaderboard */}
        <h3 className="section-title" style={{ marginTop: 20, marginBottom: 12 }}>
          Worst Wards by Reports
        </h3>

        <div className="lb-list">
          {stats.leaderboard.map((item, i) => (
            <div key={item.name} className="lb-item">
              <span className={`lb-rank${i < 3 ? ' top3' : ''}`}>{i + 1}</span>
              <div className="lb-info">
                <div className="lb-name">{item.displayName}</div>
                <div className="lb-ward">
                  {item.unresolved} unresolved · GRMC Sachivalayam
                </div>
                <div
                  className="lb-bar"
                  style={{ width: `${(item.total / stats.maxCount) * 100}%` }}
                />
              </div>
              <span className="lb-count">{item.total}</span>
            </div>
          ))}

          {stats.leaderboard.length === 0 && (
            <div className="lb-empty">
              <p>No reports yet — be the first to report!</p>
            </div>
          )}
        </div>

      </div>
    </BottomSheet>
  )
}
