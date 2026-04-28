import { useMemo } from 'react'
import BottomSheet from './BottomSheet'
import { useApp } from '../lib/store'
import { detectJurisdiction, generateWhatsAppPayload, generateShareText } from '../lib/jurisdiction'
import BlameTree from './BlameTree'
import { t } from '../lib/i18n'
import { displayName } from '../lib/names'
import { useTranslate } from '../lib/useTranslate'

export default function DetailSheet() {
  const { state, actions } = useApp()
  const lang = state.lang || 'en'
  const report = state.selectedReport
  const selectedWard = state.selectedWard
  const dismiss = () => { actions.selectReport(null); actions.selectWard(null) }

  const jurisdiction = useMemo(() => {
    if (report) return detectJurisdiction(report.lat, report.lng)
    if (selectedWard) {
      // Find any report in this ward to get coordinates for full jurisdiction detection
      const wardReport = state.reports.find(
        r => (r.assigned_area || '').toUpperCase().includes(selectedWard.name?.toUpperCase?.() || '')
      )
      if (wardReport) return detectJurisdiction(wardReport.lat, wardReport.lng)
      // Fallback: return ward as-is (won't have MLA/MP but won't crash)
      return { area: selectedWard.name, name: selectedWard.name }
    }
    return null
  }, [report, selectedWard, state.reports])

  const translatedLandmark = useTranslate(report?.landmark || '')
  const translatedWasteType = useTranslate(report?.waste_type || '')

  if (!report && !selectedWard) return null

  const isResolved = report?.status === 'resolved'
  const daysAgo = report
    ? Math.max(1, Math.ceil((Date.now() - new Date(report.created_at).getTime()) / 86400000))
    : 0

  const handleSeen = () => actions.incrementSeen(report.id)

  const handleComplaint = () => {
    if (!jurisdiction) return
    const payload = generateWhatsAppPayload(report, jurisdiction, report.seen_count)
    window.open(payload.url, '_blank')
  }

  return (
    <BottomSheet isOpen={!!report || !!selectedWard} onClose={dismiss} className="detail-sheet">
        <div className="sheet-header" style={{ paddingTop: 0, paddingBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: 'none' }}>
          <div style={{ flex: 1, paddingRight: 16 }}>
            {report ? (
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, color: 'var(--severity-critical)' }}>
                  <span style={{ fontSize: 18, lineHeight: 1 }}>•</span> {t(report.severity, lang).toUpperCase()}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#fef2f2', color: 'var(--severity-critical)' }}>
                  {isResolved ? t('resolved', lang) : t('unresolved', lang)}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--severity-critical)' }}>WARD SUMMARY</span>
              </div>
            )}
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', lineHeight: 1.2, marginBottom: 6 }}>
              {displayName(report?.assigned_area || selectedWard?.name || 'Unknown Area')}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6b7280', fontSize: 13, fontWeight: 500 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {report
                ? translatedLandmark
                : 'Sachivalayam · GRMC'
              }
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', color: '#9ca3af', paddingTop: 4 }}>
            <button onClick={handleComplaint} style={{ color: '#9ca3af' }}>
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </button>
            <button onClick={() => { actions.selectReport(null); actions.selectWard(null); }} style={{ color: '#9ca3af' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <div className="sheet-body" style={{ paddingTop: 0 }}>
          {report ? (
            <>
              {/* Photo(s) */}
              <div style={{ position: 'relative', marginBottom: 20 }}>
                {report.cleaned_image_url ? (
                  <div className="before-after-container" style={{ borderRadius: 16 }}>
                    <div className="ba-item">
                      <img src={report.image_url} alt="Before" className="detail-photo skeleton-img" style={{ height: 220 }} />
                      <span className="ba-label before">{t('before', lang) || 'BEFORE'}</span>
                    </div>
                    <div className="ba-item">
                      <img src={report.cleaned_image_url} alt="After" className="detail-photo skeleton-img" style={{ height: 220 }} />
                      <span className="ba-label after">{t('after', lang) || 'AFTER'}</span>
                    </div>
                  </div>
                ) : (
                  <img src={report.image_url} alt="Report" className="skeleton-img" style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 16 }} />
                )}
                {!isResolved && (
                  <button onClick={handleSeen} style={{ position: 'absolute', bottom: 12, right: 12, background: 'white', padding: '8px 14px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#ea580c', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                    I've seen this {report.seen_count > 0 && `(${report.seen_count})`}
                  </button>
                )}
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                <div style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 14, padding: '14px 12px' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#ea580c', marginBottom: 2 }}>{report.seen_count || 1}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Reports</div>
                </div>
                <div style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 14, padding: '14px 12px' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#ea580c', marginBottom: 2 }}>{daysAgo}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Days</div>
                </div>
                <div style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 14, padding: '14px 12px', minWidth: '40%' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#4f46e5', fontFamily: 'monospace', marginBottom: 4, lineHeight: 1.2 }}>{translatedWasteType}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Waste Type</div>
                </div>
              </div>
            </>
          ) : (
            // Ward-summary mode: just show a zone context badge
            // BlameTree below handles the full accountability chain
            <div style={{ marginBottom: 20 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 20,
                background: '#f0f9ff', border: '1px solid #bae6fd',
                fontSize: 12, fontWeight: 700, color: '#0369a1', marginBottom: 4,
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                GRMC Sachivalayam · Rajamahendravaram
              </div>
              <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 6, fontWeight: 500 }}>
                Tap any node below to see contact &amp; escalation options.
              </p>
            </div>
          )}

          {/* BLAME TREE */}
          <BlameTree
            jurisdiction={jurisdiction}
            onPoliticianClick={(leader) => actions.selectLeader(leader)}
          />

          {report && (
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ textAlign: 'center', fontSize: 13, color: '#9ca3af', fontWeight: 500, marginBottom: 4 }}>
                Reported <strong>{daysAgo === 1 ? t('today', lang) : `${daysAgo} ${t('days_ago', lang)}`}</strong> · {(report.seen_count || 0) + 1} citizen(s) reported
              </div>

              {!isResolved && (
                <button onClick={handleComplaint} style={{ width: '100%', background: '#22c55e', color: 'white', padding: '16px', borderRadius: 14, fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: 'none', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(34,197,94,0.3)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
                  File RMC Complaint
                </button>
              )}

              {!isResolved && (
                <button onClick={() => actions.showCleanedForm(true)} style={{ width: '100%', background: '#f3f4f6', color: '#374151', padding: '16px', borderRadius: 14, fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  It is Cleaned Up — Verify
                </button>
              )}
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#22c55e', fontSize: 13, fontWeight: 700, marginTop: 12 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                All reports are anonymous
              </div>
            </div>
          )}
        </div>
    </BottomSheet>
  )
}
