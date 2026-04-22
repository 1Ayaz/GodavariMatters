import { useMemo, useRef, useState, useCallback } from 'react'
import { useApp } from '../lib/store'
import { t } from '../lib/i18n'

export default function StatsPanel() {
  const { state, filteredReports } = useApp()
  const lang = state.lang || 'en'
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
      .sort((a, b) => b.unresolved - a.unresolved)
      .slice(0, 10)

    const maxCount = leaderboard[0]?.unresolved || 1

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
          <span className="stat-label">{t('unresolved', lang)}</span>
        </div>
        <div className="stat-card resolved-card">
          <span className="stat-number">{stats.resolved}</span>
          <span className="stat-label">{t('resolved', lang)}</span>
        </div>
        <div className="stat-card rate-card">
          <span className="stat-number">{stats.rate}<small>%</small></span>
          <span className="stat-label">{t('fixed_rate', lang)}</span>
        </div>
      </div>

      <h3 className="section-title" style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        CIVIC ACCOUNTABILITY INDEX
      </h3>
      {stats.leaderboard.map((item, i) => (
        <div key={item.name} className="lb-item">
          <span className={`lb-rank${i < 3 ? ' top3' : ''}`}>{i + 1}</span>
          <div className="lb-info">
            <div className="lb-name">{item.name}</div>
            <div className="lb-ward" style={{ fontWeight: 600, color: '#ef4444' }}>
              {item.unresolved} CRITICAL ISSUES
            </div>
            <div className="lb-official" style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', marginTop: '2px' }}>
              {item.type === 'urban' ? 'Responsible: WHS Secretary' : 'Responsible: Engineering Assistant'}
            </div>
            <div className="lb-bar" style={{ width: `${(item.unresolved / stats.maxCount) * 100}%`, background: '#ef4444' }} />
          </div>
          <span className="lb-count" style={{ color: '#ef4444', fontWeight: 800 }}>{item.unresolved}</span>
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
