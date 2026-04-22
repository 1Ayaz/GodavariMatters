import { useApp } from '../lib/store'

const SITE_URL = 'https://godavari-matters.vercel.app'

export default function QRModal({ onClose }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(SITE_URL)}&size=220x220&margin=12&format=svg`

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bottom-sheet small-sheet" style={{ maxWidth: 420 }}>
        <div className="sheet-header">
          <h2 style={{ fontSize: 18 }}>Report from your phone</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="sheet-body" style={{ textAlign: 'center', padding: '8px 24px 32px' }}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
            Scan this QR code to open GodavariMatters on your phone and report garbage with a <strong>live photo</strong>.
          </p>
          <div style={{
            display: 'inline-block', padding: 16, background: '#fff',
            borderRadius: 16, border: '1px solid var(--border)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
          }}>
            <img
              src={qrUrl}
              alt="QR Code to open GodavariMatters"
              width={220} height={220}
              style={{ display: 'block' }}
            />
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 16, fontWeight: 600 }}>
            godavari-matters.vercel.app
          </p>
          <p style={{
            fontSize: 12, color: 'var(--text-muted)', marginTop: 12,
            background: 'var(--accent-light)', padding: '8px 14px',
            borderRadius: 10, display: 'inline-block'
          }}>
            📸 Live camera photos ensure report authenticity
          </p>
        </div>
      </div>
    </div>
  )
}
