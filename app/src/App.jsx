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
