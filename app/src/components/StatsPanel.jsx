import { useMemo, useRef, useState, useCallback } from 'react'
import { useApp } from '../lib/store'
import { t } from '../lib/i18n'

export default function StatsPanel() {
  const { state } = useApp()
  const lang = state.lang || 'en'
  const [expanded, setExpanded] = useState(false)
  const startY = useRef(0)
  const isDragging = useRef(false)

  const stats = useMemo(() => {
    const all = state.reports
    const unresolved = all.filter(r => r.status !== 'resolved').length
    const resolved = all.filter(r => r.status === 'resolved').length
    const rate = all.length > 0 ? ((resolved / all.length) * 100).toFixed(1) : '0'

    // Group by area for leaderboard (NammaKasa: "WORST WARDS BY REPORTS")
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

    return { unresolved, resolved, rate, leaderboard, maxCount, total: all.length }
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
    if (diff > 50) setExpanded(true)
    else if (diff < -50) setExpanded(false)
  }, [])

  const handleClick = useCallback(() => {
    setExpanded(prev => !prev)
  }, [])

  // Only show on map view
  if (state.activeView !== 'map') return null

  return (
    <div
      className={`stats-panel${expanded ? ' expanded' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="drag-handle" onClick={handleClick} />
      
      {/* NammaKasa-style stat cards */}
      <div className="stats-cards">
        <div className="stat-card unresolved-card">
          <span className="stat-number">{stats.unresolved.toLocaleString()}</span>
          <span className="stat-label">{t('unresolved', lang)}</span>
        </div>
        <div className="stat-card resolved-card">
          <span className="stat-number">{stats.resolved.toLocaleString()}</span>
          <span className="stat-label">{t('resolved', lang)}</span>
        </div>
        <div className="stat-card rate-card">
          <span className="stat-number">{stats.rate}<small>%</small></span>
          <span className="stat-label">{t('fixed_rate', lang)}</span>
        </div>
      </div>

      {/* Worst Wards leaderboard (NammaKasa: "WORST WARDS BY REPORTS") */}
      <h3 className="section-title" style={{ marginTop: 4 }}>
        {t('worst_wards', lang)}
      </h3>
      {stats.leaderboard.map((item, i) => (
        <div key={item.name} className="lb-item">
          <span className={`lb-rank${i < 3 ? ' top3' : ''}`}>{item.total}</span>
          <div className="lb-info">
            <div className="lb-name">{item.name}</div>
            <div className="lb-ward">
              {item.unresolved} {t('unresolved', lang).toLowerCase()}
            </div>
            <div className="lb-bar" style={{ width: `${(item.total / stats.maxCount) * 100}%` }} />
          </div>
        </div>
      ))}

      {stats.leaderboard.length === 0 && (
        <p style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
          {t('no_reports_yet', lang)}
        </p>
      )}
    </div>
  )
}
