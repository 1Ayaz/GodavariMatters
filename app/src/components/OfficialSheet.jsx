import BottomSheet from './BottomSheet'
import { useApp } from '../lib/store'

const COMMISSIONER_EMAIL = 'mc.rjy@aptransco.in'
const RMC_HELPLINE = '9494060060'
const PGRS_URL = 'https://pgrs.ap.gov.in/'
const RMC_LOGO = 'https://upload.wikimedia.org/wikipedia/en/2/2f/Rajahmundry_Municipal_Corporation_Logo.png'

/**
 * OfficialSheet — shown when user taps any node in the BlameTree.
 * All areas are GRMC urban — no rural branch exists anymore.
 */
export default function OfficialSheet() {
  const { state, actions } = useApp()
  const person = state.selectedOfficial

  if (!person) return null

  return (
    <BottomSheet
      isOpen={!!person}
      onClose={() => actions.selectOfficial(null)}
      className="small-sheet"
    >
      {/* ── Header ── */}
      <div className="sheet-header" style={{ paddingTop: 0 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {person.showRmcLogo && (
            <img
              src={RMC_LOGO} alt="RMC"
              style={{ width: 44, height: 44, objectFit: 'contain' }}
              onError={e => { e.target.style.display = 'none' }}
            />
          )}
          <div>
            <div style={{
              fontSize: 10, fontWeight: 800, color: 'var(--accent)',
              letterSpacing: 1, marginBottom: 3, textTransform: 'uppercase',
            }}>
              {person.roleLabel}
            </div>
            <h2 style={{ fontSize: 17, margin: 0 }}>{person.name || person.roleLabel}</h2>
            {person.sub && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {person.sub}
              </p>
            )}
          </div>
        </div>
        <button className="close-btn" onClick={() => actions.selectOfficial(null)}>×</button>
      </div>

      {/* ── Body ── */}
      <div className="sheet-body">

        {/* Privacy notice — for ward-level officials */}
        {person.showPrivacy && (
          <div style={{
            background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14,
            padding: 14, marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)',
          }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: '#fee2e2', display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div>
                <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: 2, fontSize: 13 }}>
                  Privacy Protected
                </strong>
                Official phone numbers are masked. Request access for legitimate follow-ups.
              </div>
            </div>
            <a
              href={`mailto:admin@godavarimatters.in?subject=Contact Request: ${person.roleLabel} - ${person.area}&body=I need the contact for ${person.roleLabel} in ${person.area} to follow up on a sanitation complaint.`}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                padding: 11, borderRadius: 10, background: 'var(--text-primary)', color: '#fff',
                fontWeight: 700, fontSize: 13, textDecoration: 'none',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 17a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2h16a2 2 0 012 2v10z"/>
                <path d="M2 7l10 7 10-7"/>
              </svg>
              Request Phone Number
            </a>
          </div>
        )}

        <div className="section-title" style={{ marginBottom: 10 }}>Official Channels</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* Commissioner email — only shown when isCommissioner flag is set */}
          {person.isCommissioner && (
            <a
              href={`mailto:${COMMISSIONER_EMAIL}?subject=Garbage Complaint - ${person.area || 'Rajamahendravaram'}&body=Dear Commissioner,%0A%0AI am writing about a garbage issue at [location].%0AKindly take action.%0A%0AThank you.`}
              className="action-btn complaint-btn"
              style={{
                textDecoration: 'none', display: 'flex',
                alignItems: 'center', gap: 8, justifyContent: 'center', padding: 14,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <polyline points="2,4 12,13 22,4"/>
              </svg>
              Email Commissioner
            </a>
          )}

          {/* WhatsApp RMC helpline */}
          <a
            href={`https://wa.me/91${RMC_HELPLINE}?text=${encodeURIComponent('Hello RMC, I want to report a garbage issue in my area.')}`}
            target="_blank" rel="noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
              padding: 14, borderRadius: 12, background: '#25D366', color: '#fff',
              fontWeight: 700, fontSize: 15, textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(37,211,102,0.2)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            WhatsApp RMC Helpline
          </a>

          {/* Call RMC */}
          <a
            href={`tel:${RMC_HELPLINE}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
              padding: 12, borderRadius: 12, border: '1.5px solid var(--border)',
              background: '#fff', color: 'var(--text-primary)',
              fontWeight: 700, fontSize: 14, textDecoration: 'none',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 012 2.18 2 2 0 014 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
            </svg>
            Call: 9494-060-060
          </a>

          {/* PGRS formal complaint */}
          <a
            href={PGRS_URL} target="_blank" rel="noreferrer"
            className="action-btn cleaned-btn"
            style={{
              textDecoration: 'none', display: 'flex',
              alignItems: 'center', gap: 8, justifyContent: 'center', borderRadius: 12,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            File PGRS Complaint
          </a>

        </div>
      </div>
    </BottomSheet>
  )
}
