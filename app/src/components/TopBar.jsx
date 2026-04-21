import { useApp } from '../lib/store'

export default function TopBar() {
  const handleShare = () => {
    const text = `🚨 GodavariMatters — Hold your officials accountable for garbage in Rajamahendravaram!\n\nReport garbage dumps anonymously. Auto-detect sachivalayam, MLA, and MP.\n\n👉 godavarimatters.in`
    if (navigator.share) {
      navigator.share({ title: 'GodavariMatters', text, url: window.location.href })
    } else {
      navigator.clipboard.writeText(text + '\n' + window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="brand">Godavari<span className="brand-accent">Matters</span></span>
        <span className="version">v1.0</span>
      </div>
      <button className="icon-btn" onClick={handleShare} title="Share App">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
      </button>
    </header>
  )
}
