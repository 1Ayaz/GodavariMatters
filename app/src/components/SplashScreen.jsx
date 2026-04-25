import { useState, useEffect } from 'react'
import { useApp } from '../lib/store'
import { t } from '../lib/i18n'

export default function SplashScreen({ onDismiss }) {
  const [visible, setVisible] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)
  const { state } = useApp()
  const lang = state.lang || 'en'

  useEffect(() => {
    if (sessionStorage.getItem('gm_splash_seen')) {
      setVisible(false)
      onDismiss?.()
    }
  }, [])

  const dismiss = () => {
    setFadeOut(true)
    sessionStorage.setItem('gm_splash_seen', '1')
    setTimeout(() => {
      setVisible(false)
      onDismiss?.()
    }, 500)
  }

  if (!visible) return null

  return (
    <div className={`splash-screen${fadeOut ? ' fade-out' : ''}`} onClick={dismiss}>
      <div className="splash-content">
        <div className="splash-logo-container">
           <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 4px 12px rgba(232,57,14,0.3))', marginBottom: 16 }}>
             <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
             <circle cx="12" cy="10" r="3"></circle>
           </svg>
        </div>
        <h1 className="splash-title">
          Clean <span className="splash-highlight">Rajahmundry.</span><br />
          Together.
        </h1>
        <p className="splash-desc" style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5', margin: '0 auto 32px', maxWidth: 300 }}>
          Take a photo of garbage in your area. We route it directly to the responsible Sachivalayam officials.
        </p>

        <div className="splash-features">
          <div className="splash-feature">
            <span className="sf-icon">📸</span>
            <div className="sf-text">
              <strong>Snap it</strong>
              <span>Take a clear photo of the issue</span>
            </div>
          </div>
          <div className="splash-feature">
            <span className="sf-icon">📍</span>
            <div className="sf-text">
              <strong>Locate it</strong>
              <span>GPS automatically finds the ward</span>
            </div>
          </div>
          <div className="splash-feature">
            <span className="sf-icon">✅</span>
            <div className="sf-text">
              <strong>Resolve it</strong>
              <span>Track progress until it's clean</span>
            </div>
          </div>
        </div>

        <div className="splash-cta" style={{ marginTop: '40px' }}>{t('splash_tap', lang)}</div>
      </div>
      <div className="splash-brand">
        <span>Godavar<span className="splash-brand-accent">i</span>Matters</span>
      </div>
    </div>
  )
}
