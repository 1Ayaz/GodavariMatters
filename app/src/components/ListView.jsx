import { useState, useMemo } from 'react'
import { useApp } from '../lib/store'

function WardRow({ area, reports, onReportClick }) {
  const [expanded, setExpanded] = useState(false)
  const unresolved = reports.filter(r => r.status !== 'resolved').length

  return (
    <>
      <div className={`ward-row${expanded ? ' expanded' : ''}`} onClick={() => setExpanded(!expanded)}>
        <div className="ward-count-badge">{reports.length}</div>
        <div className="ward-info">
          <div className="ward-name">{area.name}</div>
          <div className="ward-detail">{unresolved} unresolved · {area.type === 'urban' ? 'Sachivalayam' : 'Village'}</div>
        </div>
        <div className="ward-expand">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
      {expanded && (
        <div className="ward-reports">
          {reports.map(r => (
            <div key={r.id} className="wr-item" onClick={() => onReportClick(r)}>
              <div className="wr-count">1</div>
              <div className="wr-info">
                <div className="wr-landmark">{r.landmark || 'No landmark'}</div>
                <div className="wr-time">{timeAgo(r.created_at)}</div>
              </div>
              <span className={`wr-severity ${r.severity}`}>{r.severity}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function timeAgo(date) {
  const now = Date.now()
  const d = new Date(date).getTime()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  const days = Math.floor(diff / 86400)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

export default function ListView() {
  const { state, filteredReports, actions } = useApp()

  const grouped = useMemo(() => {
    const map = {}
    filteredReports.forEach(r => {
      const area = r.assigned_area || 'Unknown'
      if (!map[area]) map[area] = { name: area, type: r.area_type || 'urban', reports: [] }
      map[area].reports.push(r)
    })
    return Object.values(map).sort((a, b) => b.reports.length - a.reports.length)
  }, [filteredReports])

  if (state.activeView !== 'list') return null

  return (
    <div className="view-panel list-panel active">
      <div className="list-scroll">
        {grouped.map(area => (
          <WardRow
            key={area.name}
            area={area}
            reports={area.reports}
            onReportClick={(r) => actions.selectReport(r)}
          />
        ))}
        {grouped.length === 0 && (
          <div style={{ 
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '60px 24px', textAlign: 'center'
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', background: '#fef2f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
              fontSize: 36
            }}>📸</div>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a', marginBottom: 6 }}>No Reports Yet</p>
            <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.5, maxWidth: 260 }}>
              Be the first to report a garbage issue in your neighbourhood. Your report is 100% anonymous.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
