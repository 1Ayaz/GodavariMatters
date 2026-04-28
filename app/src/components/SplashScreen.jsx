import { useEffect, useState } from 'react'
import { useApp } from '../lib/store'

export default function SplashScreen() {
  const { actions } = useApp()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Slight delay so map starts rendering behind it
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  const handleDismiss = () => {
    actions.dismissSplash()
  }

  return (
    <div
      onClick={handleDismiss}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        // No background — map shows through, blurred
        backdropFilter: 'blur(6px) brightness(0.55)',
        WebkitBackdropFilter: 'blur(6px) brightness(0.55)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease',
        cursor: 'pointer',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '32px 28px 24px',
          maxWidth: '420px',
          width: '100%',
          boxShadow: '0 8px 48px rgba(0,0,0,0.18)',
          cursor: 'default',
        }}
      >
        {/* Logo */}
        <div style={{
          fontFamily: 'Georgia, serif',
          fontSize: '18px',
          fontWeight: '700',
          letterSpacing: '-0.3px',
          marginBottom: '20px',
          color: '#111',
        }}>
          Godavar<span style={{ color: '#e53e2f' }}>!</span>Matters
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: 'Georgia, serif',
          fontSize: '28px',
          fontWeight: '700',
          lineHeight: '1.25',
          color: '#111',
          margin: '0 0 14px 0',
        }}>
          Rajahmundry has a garbage problem.
        </h1>

        {/* Subtext */}
        <p style={{
          fontSize: '15px',
          lineHeight: '1.6',
          color: '#444',
          margin: '0 0 8px 0',
        }}>
          Report it. Photograph it. Name who's responsible.
        </p>

        <p style={{
          fontSize: '14px',
          lineHeight: '1.6',
          color: '#666',
          margin: '0 0 24px 0',
        }}>
          Every dump is mapped to the Ward Secretary, Sanitary Supervisor, and Municipal Health Officer.
          When enough citizens report, it becomes impossible to ignore.
        </p>

        {/* Stats */}
        <div style={{
          borderTop: '1px solid #eee',
          paddingTop: '16px',
          marginBottom: '20px',
          fontSize: '13px',
          color: '#888',
          textAlign: 'center',
          lineHeight: '1.8',
        }}>
          5.79 lakh citizens &nbsp;·&nbsp; 52 wards &nbsp;·&nbsp; 21 merged villages &nbsp;·&nbsp; All of Rajahmundry
        </div>

        {/* CTA */}
        <button
          onClick={handleDismiss}
          style={{
            width: '100%',
            padding: '14px',
            background: '#e53e2f',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            letterSpacing: '0.2px',
          }}
        >
          See the map →
        </button>

        {/* Tap hint */}
        <p style={{
          textAlign: 'center',
          fontSize: '12px',
          color: '#bbb',
          margin: '12px 0 0 0',
        }}>
          Tap anywhere to continue
        </p>
      </div>
    </div>
  )
}