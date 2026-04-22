import { useApp } from '../lib/store'
import { t } from '../lib/i18n'

export default function TopBar() {
  const { state, actions } = useApp()
  const lang = state.lang || 'en'

  const handleShare = () => {
    const text = `🚨 GodavariMatters — Hold your officials accountable for garbage in Rajamahendravaram!\n\nReport garbage dumps anonymously. Auto-detect sachivalayam, MLA, and MP.\n\n👉 godavarimatters.in`
    if (navigator.share) {
      navigator.share({ title: 'GodavariMatters', text, url: window.location.href })
    } else {
      navigator.clipboard.writeText(text + '\n' + window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  const toggleLang = () => {
    actions.setLang(lang === 'en' ? 'te' : 'en')
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="brand">{t('app_title', lang).replace('!', '')}<span className="brand-accent">!</span></span>
        <span className="version">v1.0</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button onClick={toggleLang} style={{
          padding: '4px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: '800',
          background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid #fde8e2'
        }}>
          {lang === 'en' ? 'తెలుగు' : 'EN'}
        </button>
        <button className="icon-btn" onClick={handleShare} title="Share App">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
        </button>
      </div>
    </header>
  )
}
