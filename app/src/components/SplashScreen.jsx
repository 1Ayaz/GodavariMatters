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
    <div className={`splash-screen${fadeOut ? ' fade-out' : ''}`} onClick={dismiss} style={{
      backgroundImage: 'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.9)), url(/hero.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }}>
      <div className="splash-content">
        <div className="splash-badge">RAJAMAHENDRAVARAM</div>
        <h1 className="splash-title">
          Rajamahendravaram is <br />
          <span className="splash-highlight">Drowning in Waste.</span>
        </h1>
        <p className="splash-desc">
          ₹574 Crore Budget. ₹88 Crore for Godavari. <br />
          Where is the clean city we were promised?
        </p>

        <div className="splash-data-grid">
          <div className="splash-data-card">
            <span className="sdc-label">RMC Annual Budget</span>
            <span className="sdc-value sdc-accent">₹574.6 Cr</span>
          </div>
          <div className="splash-data-card">
            <span className="sdc-label">Godavari Project</span>
            <span className="sdc-value">₹88.4 Cr</span>
          </div>
          <div className="splash-data-card">
            <span className="sdc-label">Monthly Ops Cost</span>
            <span className="sdc-value sdc-accent">₹3.0 Cr</span>
          </div>
          <div className="splash-data-card">
            <span className="sdc-label">Tax Collection</span>
            <span className="sdc-value">82%+</span>
          </div>
        </div>

        <p className="splash-sub">
          Stop ignoring the garbage. Start tracking the accountability. <br />
          Hold your Sachivalayam officials responsible today.
        </p>
        <div className="splash-cta">{t('splash_tap', lang)}</div>
      </div>
      <div className="splash-brand">
        <span>Godavar<span className="splash-brand-accent">!</span>Matters</span>
      </div>
    </div>
  )
}
