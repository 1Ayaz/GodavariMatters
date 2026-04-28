import 'leaflet/dist/leaflet.css'
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
import OfficialSheet from './components/OfficialSheet'
import CleanedSheet from './components/CleanedSheet'
import StatsPanel from './components/StatsPanel'

// ── Stage 1: Logo + skeleton while data loads ──────────────────────────────
function LoadingScreen() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: '#fff',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 0,
    }}>
      {/* Logo */}
      <div style={{
        fontFamily: 'Plus Jakarta Sans, -apple-system, sans-serif',
        fontSize: 28, fontWeight: 800, letterSpacing: '-0.8px',
        color: '#1a1a1a', marginBottom: 40,
        animation: 'logoPulse 1.8s ease-in-out infinite',
      }}>
        Godavari<span style={{ color: '#E8390E' }}>!</span>Matters
      </div>

      {/* Skeleton map placeholder */}
      <div style={{
        width: '80%', maxWidth: 320,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {[100, 75, 88, 60].map((w, i) => (
          <div key={i} style={{
            height: 12, borderRadius: 8,
            width: `${w}%`,
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: `skeletonLoading 1.5s ${i * 0.15}s infinite`,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes logoPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes skeletonLoading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}

// ── Main app content ───────────────────────────────────────────────────────
function AppContent() {
  const { state, actions } = useApp()

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      switch (e.key) {
        case 'r': case 'R':
          if (!e.ctrlKey && !e.metaKey && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent))
            actions.showReportForm(true)
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

  // Stage 1 — data still loading → show logo skeleton
  if (state.loading) {
    return <LoadingScreen />
  }

  // Stage 2 — data ready, splash not dismissed → map renders behind splash
  if (!state.splashDismissed) {
    return (
      <>
        {/* Map loads silently behind splash */}
        <div style={{ visibility: 'visible', position: 'fixed', inset: 0, zIndex: 0 }}>
          <TopBar />
          <ViewSwitcher />
          <MapView />
        </div>
        <SplashScreen />
      </>
    )
  }

  // Stage 3 — full app
  return (
    <>
      <TopBar />
      <ViewSwitcher />
      <MapView />
      <StatsPanel />
      <ListView />
      <BottomBar />
      <ReportSheet />
      <DetailSheet />
      <OfficialSheet />
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