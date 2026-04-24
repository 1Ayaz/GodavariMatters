import { useMemo, useRef } from 'react'
import { useApp } from '../lib/store'
import { detectJurisdiction, generateWhatsAppPayload, generateShareText } from '../lib/jurisdiction'
import BlameTree from './BlameTree'
import { t } from '../lib/i18n'
import { displayName, normalizeKey } from '../lib/names'
import { useTranslate } from '../lib/useTranslate'

export default function DetailSheet() {
  const { state, actions } = useApp()
  const lang = state.lang || 'en'
  const report = state.selectedReport
  const selectedWard = state.selectedWard
  const sheetRef = useRef(null)
  const startY = useRef(0)

  const jurisdiction = useMemo(() => {
    if (report) return detectJurisdiction(report.lat, report.lng)
    if (selectedWard) return selectedWard 
    return null
  }, [report, selectedWard])

  // IMPORTANT: All hooks MUST be called before any early return (React Rules of Hooks)
  const translatedLandmark = useTranslate(report?.landmark || '')
  const translatedWasteType = useTranslate(report?.waste_type || '')

  if (!report && !selectedWard) return null

  const isResolved = report?.status === 'resolved'
  const daysAgo = report ? Math.max(1, Math.ceil((Date.now() - new Date(report.created_at).getTime()) / 86400000)) : 0
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

  const handleTouchStart = (e) => { startY.current = e.touches[0].clientY }
  const handleTouchMove = (e) => {
    const diff = e.touches[0].clientY - startY.current
    if (diff > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${diff}px)`
    }
  }
  const handleTouchEnd = (e) => {
    const diff = e.changedTouches[0].clientY - startY.current
    if (diff > 80) {
      actions.selectReport(null)
      actions.selectWard(null)
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = 'translateY(0)'
    }
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && (actions.selectReport(null) || actions.selectWard(null))}>
      <div className="bottom-sheet detail-sheet" ref={sheetRef} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{ transition: 'transform 0.2s ease-out' }}>
        <div className="wcp-drag-handle" style={{ margin: '0 auto 12px' }} />
        <div className="sheet-header" style={{ paddingTop: 0 }}>
          <div>
            <div className="detail-badges">
              {report ? (
                <>
                  <span className={`severity-badge ${report.severity}`}>{t(report.severity, lang).toUpperCase()}</span>
                  <span className={`status-badge${isResolved ? ' resolved' : ''}`}>
                    {isResolved ? t('resolved', lang) : t('unresolved', lang)}
                  </span>
                </>
              ) : (
                <span className="severity-badge critical">WARD SUMMARY</span>
              )}
            </div>
            <h2>{displayName(report?.assigned_area || selectedWard?.name || 'Unknown Area')}</h2>
            <p className="detail-landmark">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>
              {report ? translatedLandmark : (selectedWard?.isUrban ? t('sachivalayam_urban', lang) : t('gram_panchayat', lang))}
            </p>
          </div>
          <div className="detail-actions">
            <button className="close-btn" onClick={() => { actions.selectReport(null); actions.selectWard(null); }}>&times;</button>
          </div>
        </div>

        <div className="sheet-body">
          {report ? (
            <>
              {/* Photo(s) */}
              <div className="detail-photo-wrap">
                {report.cleaned_image_url ? (
                  <div className="before-after-container">
                    <div className="ba-item">
                      <img src={report.image_url} alt="Before" className="detail-photo" />
                      <span className="ba-label before">{t('before', lang) || 'BEFORE'}</span>
                    </div>
                    <div className="ba-item">
                      <img src={report.cleaned_image_url} alt="After" className="detail-photo" />
                      <span className="ba-label after">{t('after', lang) || 'AFTER'}</span>
                    </div>
                  </div>
                ) : (
                  <img src={report.image_url} alt="Report" className="detail-photo" />
                )}
                {!isResolved && (
                  <button className="seen-btn" onClick={handleSeen}>
                    {t('ive_seen_this', lang)} {report.seen_count > 0 && `(${report.seen_count})`}
                  </button>
                )}
              </div>

              {/* Stats */}
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
                    {translatedWasteType}
                  </span>
                  <span className="dstat-label">{t('waste_type', lang)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="ward-reports-list" style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 11, fontWeight: 800, marginBottom: 12, color: '#999', letterSpacing: 1 }}>ACTIVE ISSUES IN THIS AREA</h4>
              {state.reports.filter(r => {
                const reportKey = normalizeKey(r.assigned_area || '')
                const wardKey = normalizeKey(selectedWard?.name || '')
                return reportKey === wardKey
              }).slice(0, 5).map(r => (
                <div key={r.id} onClick={() => actions.selectReport(r)} className="ward-report-item" style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}>
                  <img src={r.image_url} alt="R" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.waste_type}</div>
                    <div style={{ fontSize: 11, color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.landmark}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#ccc' }}>→</div>
                </div>
              ))}
              {state.reports.filter(r => normalizeKey(r.assigned_area || '') === normalizeKey(selectedWard?.name || '')).length === 0 && (
                <p style={{ fontSize: 13, color: '#999', textAlign: 'center', padding: '20px 0' }}>No active reports in this ward.</p>
              )}
            </div>
          )}

          {/* BLAME TREE */}
          <BlameTree
            jurisdiction={jurisdiction}
            sachivalayamOfficials={state.sachivalayamOfficials}
            onPoliticianClick={(leader) => actions.selectLeader(leader)}
          />

          {report && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p className="report-time" style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                {t('reported', lang)} <strong>{daysAgo === 1 ? t('today', lang) : `${daysAgo} ${t('days_ago', lang)}`}</strong> · {(report.seen_count || 0) + 1} {t('citizens_reported', lang)}
              </p>

              {/* Main Accountability Action */}
              {!isResolved && (
                <button className="action-btn complaint-btn" onClick={handleComplaint} style={{ padding: '16px', borderRadius: 14 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
                  {complaintLabel}
                </button>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                {/* Resolve Action */}
                {!isResolved && (
                  <button 
                    className="action-btn cleaned-btn" 
                    onClick={() => actions.showCleanedForm(true)}
                    style={{ 
                      borderRadius: 12, padding: '12px', fontSize: 13,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    Cleaned?
                  </button>
                )}
              </div>
            </div>
          )}
          <p className="anon-badge" style={{ marginTop: 24 }}>{t('anonymous', lang)}</p>
        </div>
      </div>
    </div>
  )
}
