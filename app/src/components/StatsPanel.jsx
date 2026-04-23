import { useMemo, useRef, useCallback } from 'react'
import { useApp } from '../lib/store'
import { t } from '../lib/i18n'
import { displayName } from '../lib/names'

export default function StatsPanel() {
  const { state, actions } = useApp()
  const lang = state.lang || 'en'
  const startY = useRef(0)
  const isDragging = useRef(false)

  const stats = useMemo(() => {
    const all = state.reports
    const unresolved = all.filter(r => r.status !== 'resolved').length
    const resolved = all.filter(r => r.status === 'resolved').length
    const rate = all.length > 0 ? ((resolved / all.length) * 100).toFixed(1) : '0'
    const urbanCount = all.filter(r => r.area_type === 'urban').length
    const ruralCount = all.filter(r => r.area_type !== 'urban').length

    // Group by area for leaderboard
    const areaMap = {}
    all.forEach(r => {
      const area = r.assigned_area || 'Unknown'
      if (!areaMap[area]) areaMap[area] = { name: area, displayName: displayName(area), type: r.area_type, total: 0, unresolved: 0 }
      areaMap[area].total++
      if (r.status !== 'resolved') areaMap[area].unresolved++
    })

    const leaderboard = Object.values(areaMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 15)

    const maxCount = leaderboard[0]?.total || 1

    return { unresolved, resolved, rate, leaderboard, maxCount, total: all.length, urbanCount, ruralCount }
  }, [state.reports])

  // Swipe-down to close
  const handleTouchStart = useCallback((e) => {
    startY.current = e.touches[0].clientY
    isDragging.current = true
  }, [])

  const handleTouchEnd = useCallback((e) => {
    if (!isDragging.current) return
    isDragging.current = false
    const endY = e.changedTouches[0].clientY
    const diff = endY - startY.current
    // Swipe down > 80px = close
    if (diff > 80) actions.toggleStats()
  }, [actions])

  // Don't render at all when hidden — completely gone from DOM
  if (!state.showStats || state.activeView !== 'map') return null

  return (
    <>
      {/* Backdrop overlay — click to close */}
      <div className="stats-backdrop" onClick={() => actions.toggleStats()} />

      <div
        className="stats-panel visible"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="drag-handle" onClick={() => actions.toggleStats()} />

        {/* Stat cards — NammaKasa style: full-width, big numbers */}
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

        {/* Worst Wards leaderboard */}
        <h3 className="section-title">{t('worst_wards', lang)}</h3>

        <div className="lb-list">
          {stats.leaderboard.map((item, i) => (
            <div key={item.name} className="lb-item">
              <span className={`lb-rank${i < 3 ? ' top3' : ''}`}>{i + 1}</span>
              <div className="lb-info">
                <div className="lb-name">{item.displayName}</div>
                <div className="lb-ward">
                  {item.unresolved} {t('unresolved', lang).toLowerCase()} · {item.type === 'urban' ? t('sachivalayam', lang) : t('rural', lang)}
                </div>
                <div className="lb-bar" style={{ width: `${(item.total / stats.maxCount) * 100}%` }} />
              </div>
              <span className="lb-count">{item.total}</span>
            </div>
          ))}

          {stats.leaderboard.length === 0 && (
            <div className="lb-empty">
              <p>{t('no_reports_yet', lang)}</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
