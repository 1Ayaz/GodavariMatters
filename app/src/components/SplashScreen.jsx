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
        <div className="splash-badge">RAJAMAHENDRAVARAM</div>
        <h1 className="splash-title">
          Our City Deserves <br />
          <span className="splash-highlight">Better Sanitation.</span>
        </h1>
        <p className="splash-desc">
          ₹574 Crore Annual Budget. ₹88 Crore for Godavari Rejuvenation. <br />
          Yet garbage piles up across our neighbourhoods.
        </p>

        <div className="splash-data-grid">
          <div className="splash-data-card">
            <span className="sdc-label">RMC Annual Budget</span>
            <span className="sdc-value sdc-accent">₹574.6 Cr</span>
          </div>
          <div className="splash-data-card">
            <span className="sdc-label">Sanitation Allocation</span>
            <span className="sdc-value">₹88.4 Cr</span>
          </div>
          <div className="splash-data-card">
            <span className="sdc-label">Monthly Ops Cost</span>
            <span className="sdc-value sdc-accent">₹3.0 Cr</span>
          </div>
          <div className="splash-data-card">
            <span className="sdc-label">Property Tax Collection</span>
            <span className="sdc-value">82%+</span>
          </div>
        </div>

        <p className="splash-sub">
          Report garbage issues in your area. <br />
          Track civic complaints across all 50 Sachivalayams.
        </p>
        <div className="splash-cta">{t('splash_tap', lang)}</div>
      </div>
      <div className="splash-brand">
        <span>Godavar<span className="splash-brand-accent">i</span>Matters</span>
      </div>
    </div>
  )
}
