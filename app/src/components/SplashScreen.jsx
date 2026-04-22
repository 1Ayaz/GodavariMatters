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
          Rajamahendravaram is <br />
          <span className="splash-highlight">Drowning in Waste.</span>
        </h1>
        <p className="splash-desc">
          Our city and our river are being buried under thousands of tons of garbage despite massive funding.
        </p>

        <div className="splash-data-grid">
          <div className="splash-data-card">
            <span className="sdc-label">Total RMC Budget</span>
            <span className="sdc-value sdc-accent">₹574.6 Crore</span>
          </div>
          <div className="splash-data-card">
            <span className="sdc-label">Godavari Cleanup</span>
            <span className="sdc-value">₹88.4 Crore</span>
          </div>
          <div className="splash-data-card">
            <span className="sdc-label">Sanitation Ops</span>
            <span className="sdc-value sdc-accent">₹3.0 Cr/Month</span>
          </div>
          <div className="splash-data-card">
            <span className="sdc-label">Garbage Tax</span>
            <span className="sdc-value">Scrapped in 2024</span>
          </div>
        </div>

        <p className="splash-sub">
          The budget is being spent. The taxes were paid. <br />
          Where are the results? Hold the responsible officials accountable.
        </p>
        <div className="splash-cta">{t('splash_tap', lang)}</div>
      </div>
      <div className="splash-brand">
        <span>Godavar<span className="splash-brand-accent">!</span>Matters</span>
      </div>
    </div>
  )
}
