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
          Our city and our river are being buried under thousands of tons of garbage.
        </p>

        <div className="splash-data-grid">
          <div className="splash-data-card">
            <span className="sdc-label">Daily Waste</span>
            <span className="sdc-value sdc-accent">240+ Tons</span>
          </div>
          <div className="splash-data-card">
            <span className="sdc-label">Godavari Pollution</span>
            <span className="sdc-value">5,000kg Plastic/Wk</span>
          </div>
          <div className="splash-data-card">
            <span className="sdc-label">Annual Sanitation Tax</span>
            <span className="sdc-value sdc-accent">₹1,200/Household</span>
          </div>
          <div className="splash-data-card">
            <span className="sdc-label">Accountability</span>
            <span className="sdc-value">96 Units</span>
          </div>
        </div>

        <p className="splash-sub">
          You pay your taxes. You deserve a clean city. <br />
          It's time to hold responsible officials accountable.
        </p>
        <div className="splash-cta">{t('splash_tap', lang)}</div>
      </div>
      <div className="splash-brand">
        <span>{t('app_title', lang).replace('!', '')}</span>
      </div>
    </div>
  )
}
