import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// AdminPage is only needed on /admin — lazy-load so it doesn't
// bloat the main bundle for regular users
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'))

const isAdmin = window.location.pathname === '/admin'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isAdmin
      ? <Suspense fallback={null}><AdminPage /></Suspense>
      : <App />
    }
  </StrictMode>,
)
