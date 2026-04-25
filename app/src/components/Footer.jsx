import { useApp } from '../lib/store'

export default function Footer() {
  const { state } = useApp()
  const lang = state.lang || 'en'

  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-section footer-left">
          <span className="footer-brand">GodavariMatters</span>
        </div>
        <div className="footer-section footer-right">
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
            <a href="https://godavarimatters.in" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Learn more</a> · 
            <a href="mailto:info@godavarimatters.in" style={{ color: 'var(--accent)', textDecoration: 'none', marginLeft: 8 }}>Contact</a>
          </p>
        </div>
      </div>
    </footer>
  )
}
