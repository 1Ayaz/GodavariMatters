import { useApp } from '../lib/store'

export default function BottomBar() {
  const { state, actions } = useApp()
  const totalReports = state.reports.length

  return (
    <div className="bottom-bar">
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
    </div>
  )
}
