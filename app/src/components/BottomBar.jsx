import { useState } from 'react'
import { useApp } from '../lib/store'
import { t } from '../lib/i18n'
import QRModal from './QRModal'

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

export default function BottomBar() {
  const { state, actions } = useApp()
  const totalReports = state.reports.length
  const lang = state.lang || 'en'
  const [showQR, setShowQR] = useState(false)
  const isMobile = isMobileDevice()

  const handleReport = () => {
    if (isMobile) {
      actions.showReportForm(true)
    } else {
      setShowQR(true)
    }
  }

  return (
    <>
      <div className="bottom-bar">
        <button className="report-btn" onClick={handleReport}>
          {isMobile ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="5" y="2" width="14" height="20" rx="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" strokeLinecap="round" />
            </svg>
          )}
          {isMobile ? t('report_garbage', lang) : (lang === 'te' ? 'QR స్కాన్ చేసి రిపోర్ట్ చేయండి' : 'Scan QR to Report')}
        </button>
        <button className="leaderboard-fab" onClick={() => {
          const panel = document.querySelector('.stats-panel')
          if (panel) panel.classList.toggle('expanded')
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="13" width="5" height="9"/><rect x="9.5" y="5" width="5" height="17"/><rect x="17" y="9" width="5" height="13"/></svg>
          <span>{totalReports}</span>
        </button>
      </div>
      {showQR && <QRModal onClose={() => setShowQR(false)} />}
    </>
  )
}
