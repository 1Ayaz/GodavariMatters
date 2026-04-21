import { useApp } from '../lib/store'

export default function BottomBar() {
  const { state, actions } = useApp()
  const totalReports = state.reports.length
  const isMobile = state.isMobile

  return (
    <div className="bottom-bar">
      {isMobile ? (
        /* Mobile: Report button + leaderboard fab — NammaKasa style */
        <>
          <button className="report-btn" onClick={() => actions.showReportForm(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Report Garbage
          </button>
          <button className="leaderboard-fab" onClick={() => {
            const panel = document.querySelector('.stats-panel')
            if (panel) panel.classList.toggle('expanded')
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="13" width="5" height="9"/><rect x="9.5" y="5" width="5" height="17"/><rect x="17" y="9" width="5" height="13"/></svg>
            <span>{totalReports}</span>
          </button>
        </>
      ) : (
        /* Desktop: QR code prompt — observation only */
        <div className="desktop-qr-bar">
          <div className="qr-info">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="3" height="3"/>
              <path d="M21 14h-3v3h3v4h-4v-4"/><path d="M14 21h3"/>
            </svg>
            <div>
              <strong>Phone camera required</strong>
              <span>Scan QR or open on mobile to report garbage</span>
            </div>
          </div>
          <div className="qr-code-mini">
            {/* Simple QR placeholder - in production use a QR library */}
            <div className="qr-placeholder">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="1">
                <rect x="2" y="2" width="6" height="6" rx="0.5"/><rect x="9" y="2" width="2" height="2"/>
                <rect x="16" y="2" width="6" height="6" rx="0.5"/><rect x="2" y="9" width="2" height="2"/>
                <rect x="6" y="9" width="2" height="2"/><rect x="9" y="9" width="2" height="6"/>
                <rect x="16" y="9" width="2" height="2"/><rect x="20" y="9" width="2" height="2"/>
                <rect x="2" y="16" width="6" height="6" rx="0.5"/><rect x="9" y="18" width="2" height="2"/>
                <rect x="13" y="16" width="2" height="2"/><rect x="16" y="13" width="6" height="2"/>
                <rect x="16" y="18" width="2" height="4"/><rect x="20" y="18" width="2" height="4"/>
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
