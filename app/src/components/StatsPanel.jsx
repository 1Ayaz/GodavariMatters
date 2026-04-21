import { useMemo, useRef, useState, useCallback } from 'react'
import { useApp } from '../lib/store'

export default function StatsPanel() {
  const { state, filteredReports } = useApp()
  const [expanded, setExpanded] = useState(false)
  const panelRef = useRef(null)
  const startY = useRef(0)
  const isDragging = useRef(false)

  const stats = useMemo(() => {
    const all = state.reports
    const unresolved = all.filter(r => r.status !== 'resolved').length
    const resolved = all.filter(r => r.status === 'resolved').length
    const rate = all.length > 0 ? ((resolved / all.length) * 100).toFixed(1) : '0'

    // Group by area for leaderboard
    const areaMap = {}
    all.forEach(r => {
      const area = r.assigned_area || 'Unknown'
      if (!areaMap[area]) areaMap[area] = { name: area, type: r.area_type, total: 0, unresolved: 0 }
      areaMap[area].total++
      if (r.status !== 'resolved') areaMap[area].unresolved++
    })

    const leaderboard = Object.values(areaMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)

    const maxCount = leaderboard[0]?.total || 1

    return { unresolved, resolved, rate, leaderboard, maxCount }
  }, [state.reports])

  // Touch drag handlers for slide-up behavior
  const handleTouchStart = useCallback((e) => {
    startY.current = e.touches[0].clientY
    isDragging.current = true
  }, [])

  const handleTouchEnd = useCallback((e) => {
    if (!isDragging.current) return
    isDragging.current = false
    const endY = e.changedTouches[0].clientY
    const diff = startY.current - endY
    // Swipe up = expand, swipe down = collapse
    if (diff > 50) setExpanded(true)
    else if (diff < -50) setExpanded(false)
  }, [])

  const handleClick = useCallback(() => {
    setExpanded(prev => !prev)
  }, [])

  return (
    <div
      ref={panelRef}
      className={`stats-panel${expanded ? ' expanded' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="drag-handle" onClick={handleClick} />
      <div className="stats-cards">
        <div className="stat-card unresolved-card">
          <span className="stat-number">{stats.unresolved}</span>
          <span className="stat-label">UNRESOLVED</span>
        </div>
        <div className="stat-card resolved-card">
          <span className="stat-number">{stats.resolved}</span>
          <span className="stat-label">RESOLVED</span>
        </div>
        <div className="stat-card rate-card">
          <span className="stat-number">{stats.rate}<small>%</small></span>
          <span className="stat-label">FIXED RATE</span>
        </div>
      </div>

      <h3 className="section-title">WORST AREAS BY REPORTS</h3>
      {stats.leaderboard.map((item, i) => (
        <div key={item.name} className="lb-item">
          <span className={`lb-rank${i < 3 ? ' top3' : ''}`}>{i + 1}</span>
          <div className="lb-info">
            <div className="lb-name">{item.name}</div>
            <div className="lb-ward">{item.unresolved} unresolved · {item.type === 'urban' ? 'Ward' : 'Village'}</div>
            <div className="lb-bar" style={{ width: `${(item.total / stats.maxCount) * 100}%` }} />
          </div>
          <span className="lb-count">{item.total}</span>
        </div>
      ))}

      {stats.leaderboard.length === 0 && (
        <p style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
          No reports yet. Be the first to report! 📸
        </p>
      )}
    </div>
  )
}
