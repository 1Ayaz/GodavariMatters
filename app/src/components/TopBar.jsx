import { useApp } from '../lib/store'

/**
 * TopBar — NammaKasa-style header
 *
 * Layout: [Logo + version] ←→ [Lang toggle + Share icon]
 * Matches the NammaKasa reference: clean white bar, bold brand,
 * small version tag, single icon on right.
 */
export default function TopBar() {
  const { state, actions } = useApp()
  const lang = state.lang || 'en'

  const handleShare = () => {
    const text = `🚨 GodavariMatters — Hold your officials accountable!\n\nReport garbage anonymously in Rajamahendravaram. Auto-routed to GRMC.\n\n👉 godavari-matters.vercel.app`
    if (navigator.share) {
      navigator.share({ title: 'GodavariMatters', text, url: window.location.href })
    } else {
      navigator.clipboard.writeText(text + '\n' + window.location.href)
    }
  }

  return (
    <header className="topbar">
      {/* Brand */}
      <div className="topbar-left">
        <span className="brand">
          Godavari<span className="brand-accent">!</span>Matters
        </span>
        <span className="version">v1.1</span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Language toggle */}
        <button
          onClick={() => actions.setLang(lang === 'en' ? 'te' : 'en')}
          style={{
            padding: '4px 10px', borderRadius: 8,
            fontSize: 12, fontWeight: 800,
            background: 'var(--accent-light)', color: 'var(--accent)',
            border: '1px solid #fde8e2',
          }}
        >
          {lang === 'en' ? 'తెలుగు' : 'EN'}
        </button>

        {/* Share — minimal icon, no text */}
        <button
          className="icon-btn"
          onClick={handleShare}
          title="Share App"
          style={{ color: 'var(--accent)' }}
        >
          {/* Upload / share icon */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
            <polyline points="16 6 12 2 8 6"/>
            <line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
        </button>
      </div>
    </header>
  )
}
