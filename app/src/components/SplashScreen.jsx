import { useState, useEffect } from 'react'

export default function SplashScreen({ onDismiss }) {
  const [visible, setVisible] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)

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
          This city has a<br />
          <span className="splash-highlight">civic issue.</span>
        </h1>
        <p className="splash-desc">
          Report it. Photograph it.<br />
          Track who is responsible.
        </p>
        <div className="splash-stats">
          <div className="splash-stat">
            <span className="splash-stat-num">96+</span>
            <span className="splash-stat-label">Sachivalayams</span>
          </div>
          <div className="splash-divider" />
          <div className="splash-stat">
            <span className="splash-stat-num">2</span>
            <span className="splash-stat-label">MLAs</span>
          </div>
          <div className="splash-divider" />
          <div className="splash-stat">
            <span className="splash-stat-num">1</span>
            <span className="splash-stat-label">MP</span>
          </div>
        </div>
        <p className="splash-sub">Urban + Rural · All of Rajamahendravaram</p>
        <div className="splash-cta">Tap anywhere to continue</div>
      </div>
      <div className="splash-brand">
        <span>Godavari</span><span className="splash-brand-accent">Matters</span>
      </div>
    </div>
  )
}
