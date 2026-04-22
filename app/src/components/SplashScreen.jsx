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
          {t('splash_title_1', lang)}<br />
          <span className="splash-highlight">{t('splash_title_2', lang)}</span>
        </h1>
        <p className="splash-desc" dangerouslySetInnerHTML={{ __html: t('splash_desc', lang).replace('. ', '.<br />') }} />
        <div className="splash-stats">
          <div className="splash-stat">
            <span className="splash-stat-num">96+</span>
            <span className="splash-stat-label">{t('sachivalayam', lang)}s</span>
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
        <p className="splash-sub">{t('urban', lang)} + {t('rural', lang)} · All of Rajamahendravaram</p>
        <div className="splash-cta">{t('splash_tap', lang)}</div>
      </div>
      <div className="splash-brand">
        <span>{t('app_title', lang).replace('!', '')}</span>
      </div>
    </div>
  )
}
