import { useState, useMemo } from 'react'
import { useApp } from '../lib/store'
import { displayName } from '../lib/names'
import TranslatedText from '../lib/TranslatedText'
import { timeAgo } from '../lib/utils'


function WardRow({ area, reports, onReportClick }) {
  const [expanded, setExpanded] = useState(false)
  const unresolved = reports.filter(r => r.status !== 'resolved').length

  // Sort reports by most recent first
  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [reports])

  // Get the highest severity for badge color
  const severityOrder = { critical: 4, severe: 3, moderate: 2, minor: 1 }
  const maxSeverity = reports.reduce((max, r) => {
    return (severityOrder[r.severity] || 0) > (severityOrder[max] || 0) ? r.severity : max
  }, 'minor')

  return (
    <>
      <div className={`ward-row${expanded ? ' expanded' : ''}`} onClick={() => setExpanded(!expanded)}>
        <div className="ward-count-badge">{reports.length}</div>
        <div className="ward-info">
          <div className="ward-name">{displayName(area.name)}</div>
          <div className="ward-detail">{unresolved} unresolved · Sachivalayam</div>
        </div>
        <svg 
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className="ward-chevron"
          style={{ 
            transform: expanded ? 'rotate(180deg)' : 'rotate(0)', 
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            color: '#9ca3af',
            flexShrink: 0
          }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      {expanded && (
        <div className="ward-reports" style={{ animation: 'slideDown 0.3s ease' }}>
          {sortedReports.map(r => (
            <div key={r.id} className="wr-item" onClick={() => onReportClick(r)}>
              <div className={`wcp-dot ${r.severity}`} />
              <div className="wr-info">
              <TranslatedText text={r.landmark || 'No landmark'} className="wr-landmark" />
                <div className="wr-time">{timeAgo(r.created_at)}</div>
              </div>
              <span className={`wcp-severity ${r.severity}`}>{r.severity}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export default function ListView() {
  const { state, filteredReports, actions } = useApp()

  const grouped = useMemo(() => {
    const map = {}
    filteredReports.forEach(r => {
      const area = r.assigned_area || 'Unknown'
      if (!map[area]) map[area] = { name: area, reports: [] }
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
