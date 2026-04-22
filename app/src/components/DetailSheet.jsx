import { useMemo } from 'react'
import { useApp } from '../lib/store'
import { detectJurisdiction, generateWhatsAppPayload, generateShareText } from '../lib/jurisdiction'
import BlameTree from './BlameTree'
import { t } from '../lib/i18n'

export default function DetailSheet() {
  const { state, actions } = useApp()
  const lang = state.lang || 'en'
  const report = state.selectedReport

  const jurisdiction = useMemo(() => {
    if (!report) return null
    return detectJurisdiction(report.lat, report.lng)
  }, [report])

  if (!report) return null

  const isResolved = report.status === 'resolved'
  const daysAgo = Math.max(1, Math.ceil((Date.now() - new Date(report.created_at).getTime()) / 86400000))
  const isUrban = jurisdiction?.type === 'urban'
  const complaintLabel = isUrban ? t('file_complaint', lang) : t('meekosam', lang)

  const handleSeen = async () => {
    await actions.incrementSeen(report.id)
  }

  const handleComplaint = () => {
    if (!jurisdiction) return
    const payload = generateWhatsAppPayload(report, jurisdiction, report.seen_count)
    window.open(payload.url, '_blank')
  }

  const handleShare = () => {
    if (!jurisdiction) return
    const text = generateShareText(report, jurisdiction)
    if (navigator.share) {
      navigator.share({ title: 'GodavariMatters Report', text })
    } else {
      navigator.clipboard.writeText(text)
      alert('Copied to clipboard!')
    }
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && actions.selectReport(null)}>
      <div className="bottom-sheet detail-sheet">
        <div className="sheet-header">
          <div>
            <div className="detail-badges">
              <span className={`severity-badge ${report.severity}`}>{t(report.severity, lang).toUpperCase()}</span>
              <span className={`status-badge${isResolved ? ' resolved' : ''}`}>
                {isResolved ? t('resolved', lang) : t('unresolved', lang)}
              </span>
            </div>
            <h2>{report.assigned_area || 'Unknown Area'}</h2>
            <p className="detail-landmark">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>
              {report.landmark}
            </p>
          </div>
          <div className="detail-actions">
            <button className="icon-btn" onClick={handleShare} title="Share">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </button>
            <button className="close-btn" onClick={() => actions.selectReport(null)}>&times;</button>
          </div>
        </div>

        <div className="sheet-body">
          {/* Photo */}
          <div className="detail-photo-wrap">
            <img src={report.image_url} alt="Report" className="detail-photo" />
            <button className="seen-btn" onClick={handleSeen}>
              {t('ive_seen_this', lang)} {report.seen_count > 0 && `(${report.seen_count})`}
            </button>
          </div>

          {/* Stats — NammaKasa style: 3 cards side by side */}
          <div className="detail-stats">
            <div className="dstat">
              <span className="dstat-num">{report.seen_count || 1}</span>
              <span className="dstat-label">{t('reports_count', lang)}</span>
            </div>
            <div className="dstat">
              <span className="dstat-num">{daysAgo}</span>
              <span className="dstat-label">{t('days', lang)}</span>
            </div>
            <div className="dstat">
              <span className="dstat-num monospace">
                {['minor', 'moderate', 'severe', 'critical'].includes(report.waste_type) 
                  ? t(report.waste_type, lang) 
                  : (t(`wt_${report.waste_type.toLowerCase().replace(/[^a-z0-9]/g, '_')}`, lang) === `wt_${report.waste_type.toLowerCase().replace(/[^a-z0-9]/g, '_')}` 
                      ? report.waste_type 
                      : t(`wt_${report.waste_type.toLowerCase().replace(/[^a-z0-9]/g, '_')}`, lang))}
              </span>
              <span className="dstat-label">{t('waste_type', lang)}</span>
            </div>
          </div>

          {/* BLAME TREE — with real sachivalayam data */}
          <BlameTree
            jurisdiction={jurisdiction}
            sachivalayamOfficials={state.sachivalayamOfficials}
            onPoliticianClick={(leader) => actions.selectLeader(leader)}
          />

          <p className="report-time">
            {t('reported', lang)} <strong>{daysAgo === 1 ? t('today', lang) : `${daysAgo} ${t('days_ago', lang)}`}</strong> · {(report.seen_count || 0) + 1} {t('citizens_reported', lang)}
          </p>

          {/* Action buttons */}
          <button className="action-btn complaint-btn" onClick={handleComplaint}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
            {complaintLabel}
          </button>
          {!isResolved && (
            <button className="action-btn cleaned-btn" onClick={() => actions.showCleanedForm(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              {t('verify_cleaned', lang)}
            </button>
          )}
          <p className="anon-badge">{t('anonymous', lang)}</p>
        </div>
      </div>
    </div>
  )
}
