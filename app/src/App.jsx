import { useEffect } from 'react'
import { AppProvider, useApp } from './lib/store'
import SplashScreen from './components/SplashScreen'
import TopBar from './components/TopBar'
import ViewSwitcher from './components/ViewSwitcher'
import MapView from './components/MapView'
import ListView from './components/ListView'
import BottomBar from './components/BottomBar'
import ReportSheet from './components/ReportSheet'
import DetailSheet from './components/DetailSheet'
import LeaderSheet from './components/LeaderSheet'
import CleanedSheet from './components/CleanedSheet'
import 'leaflet/dist/leaflet.css'

function AppContent() {
  const { state, actions } = useApp()

  // Keyboard shortcuts — accessibility & power-user feature
  useEffect(() => {
    const handler = (e) => {
      // Don't fire shortcuts when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      switch (e.key) {
        case 'r': case 'R':
          // Only allow report shortcut on mobile
          if (!e.ctrlKey && !e.metaKey && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) actions.showReportForm(true)
          break
        case 'Escape':
          actions.showReportForm(false)
          actions.showCleanedForm(false)
          actions.selectReport(null)
          actions.selectLeader(null)
          break
        case 'm': case 'M':
          if (!e.ctrlKey) actions.setView('map')
          break
        case 'l': case 'L':
          if (!e.ctrlKey) actions.setView('list')
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [actions])

  return (
    <>
      {!state.splashDismissed && (
        <SplashScreen onDismiss={actions.dismissSplash} />
      )}
      <TopBar />
      <ViewSwitcher />
      <MapView />
      <ListView />
      <BottomBar />
      <ReportSheet />
      <DetailSheet />
      <LeaderSheet />
      <CleanedSheet />
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

