import { useMemo, useState } from 'react'
import { useApp } from '../lib/store'
import { t } from '../lib/i18n'

// ── Contact info constants (safe to publish) ──
const RMC_HELPLINE = '9494060060'
const RMC_HELPLINE_DISPLAY = '9494-060-060'
const RMC_WA_MESSAGE = 'Hello RMC Helpline, I want to report a garbage issue in my sachivalayam.'
const COMMISSIONER_EMAIL = 'mc.rjy@aptransco.in' // Public RMC email
const MEEKOSAM_URL = 'https://meekosam.ap.gov.in'
const PGRS_URL = 'https://pgrs.ap.gov.in/'
const RURAL_HELPLINE = '1902'

function ContactSheet({ person, onClose }) {
  if (!person) return null

  const isCommissioner = person.role === 'commissioner'
  const isRural = person.isRural
  const waMsg = encodeURIComponent(
    `Hello, I am filing a garbage complaint regarding ${person.area || 'my area'} in Rajamahendravaram. Role: ${person.roleLabel}. Please take action.`
  )

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bottom-sheet small-sheet" style={{ padding: 0 }}>
        {/* Header */}
        <div className="sheet-header">
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: 1, marginBottom: 4 }}>
              {person.roleLabel}
            </div>
            <h2 style={{ fontSize: 18 }}>{person.name}</h2>
            {person.sub && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{person.sub}</p>
            )}
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="sheet-body">
          {/* Privacy notice for WAS/WHS */}
          {!isCommissioner && !isRural && (
            <div style={{
              background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10,
              padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400e'
            }}>
              <strong>Note:</strong> Personal contacts of ward-level officials are protected under government privacy rules. Use the RMC Helpline below to escalate — they are legally required to respond.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Commissioner: email */}
            {isCommissioner && (
              <a href={`mailto:${COMMISSIONER_EMAIL}?subject=Garbage Complaint - ${person.area || 'Rajamahendravaram'}&body=Dear Commissioner Rahul Meena,%0A%0AI am writing to bring to your attention a garbage issue at [describe location].%0A%0AKindly take necessary action.%0A%0AThank you.`}
                className="action-btn complaint-btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>
                Email Commissioner
              </a>
            )}

            {/* RMC WhatsApp Helpline — for everyone */}
            {!isRural && (
              <a href={`https://wa.me/91${RMC_HELPLINE}?text=${encodeURIComponent(RMC_WA_MESSAGE)}`}
                target="_blank" rel="noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center',
                  padding: '14px', borderRadius: 12, background: '#25D366', color: '#fff',
                  fontWeight: 700, fontSize: 15, textDecoration: 'none'
                }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp RMC: {RMC_HELPLINE_DISPLAY}
              </a>
            )}

            {/* RMC Phone call */}
            {!isRural && (
              <a href={`tel:${RMC_HELPLINE}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center',
                  padding: '14px', borderRadius: 12, border: '1.5px solid var(--border)',
                  background: '#fff', color: 'var(--text-primary)', fontWeight: 700,
                  fontSize: 15, textDecoration: 'none'
                }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 012 2.18 2 2 0 014 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                Call RMC: {RMC_HELPLINE_DISPLAY}
              </a>
            )}

            {/* PGRS for formal complaint */}
            {!isRural && (
              <a href={PGRS_URL} target="_blank" rel="noreferrer"
                className="action-btn cleaned-btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                File Formal PGRS Complaint
              </a>
            )}

            {/* Rural channels */}
            {isRural && (
              <>
                <a href={`tel:${RURAL_HELPLINE}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center',
                    padding: '14px', borderRadius: 12, background: 'var(--green)', color: '#fff',
                    fontWeight: 700, fontSize: 15, textDecoration: 'none'
                  }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 012 2.18 2 2 0 014 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                  Call 1902 (State Helpline)
                </a>
                <a href={MEEKOSAM_URL} target="_blank" rel="noreferrer"
                  className="action-btn cleaned-btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  File on Meekosam Portal
                </a>
              </>
            )}
          </div>

          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 16 }}>
            {isRural
              ? t('rural_note', lang)
              : t('urban_note', lang)}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Clickable tree node ──
function TreeNode({ avatar, avatarClass, roleName, roleLabel, sub, name, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        all: 'unset', display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', cursor: 'pointer', gap: 4, padding: '8px 6px',
        borderRadius: 12, transition: 'background 0.15s', width: '100%'
      }}
      onMouseOver={(e) => e.currentTarget.style.background = '#fef2f0'}
      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
      title={`Tap to contact ${roleName}`}
    >
      <div className={`bt-avatar ${avatarClass}`} style={{ position: 'relative' }}>
        <span>{avatar}</span>
        <span style={{
          position: 'absolute', bottom: -2, right: -2, width: 14, height: 14,
          background: 'var(--accent)', borderRadius: '50%', border: '2px solid #fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="7" height="7" viewBox="0 0 24 24" fill="white"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 012 2.18 2 2 0 014 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
        </span>
      </div>
      <div style={{ lineHeight: 1.3 }}>
        <div className="bt-role-name" style={{ fontSize: 12 }}>{name || roleName}</div>
        <div className="bt-role-sub" style={{ fontSize: 10 }}>{name ? roleName : roleLabel}</div>
        {name && sub && <div className="bt-role-sub" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{sub}</div>}
      </div>
    </button>
  )
}

export default function BlameTree({ jurisdiction, sachivalayamOfficials, onPoliticianClick }) {
  const { state } = useApp()
  const lang = state.lang || 'en'
  const [contactPerson, setContactPerson] = useState(null)
  const areaCode = jurisdiction?.code
  const isUrban = jurisdiction?.type === 'urban'
  const area = jurisdiction?.area || 'Unknown'

  const officials = useMemo(() => {
    if (!sachivalayamOfficials || !areaCode) return null
    return sachivalayamOfficials.find(s => s.code === areaCode)
  }, [sachivalayamOfficials, areaCode])

  const whsName = officials?.officials?.ward_health_secretary?.name || 'Ward Health Secretary'
  const wasName = officials?.officials?.ward_admin_secretary?.name || 'Ward Admin Secretary'

  const openContact = (person) => setContactPerson({ ...person, area })

  return (
    <>
      <h3 className="section-title">{t('accountability', lang)}</h3>
      <div className="blame-tree">
        {/* Top: Your Sachivalayam */}
        <div className="bt-top">
          <div className="bt-top-label">{isUrban ? t('your_ward', lang) : t('your_village', lang)}</div>
          <div className="bt-top-value">{area}</div>
        </div>

        {/* Chain */}
        <div className="bt-chain">
          {isUrban ? (
            <>
              <div className="bt-line" />
              <TreeNode
                avatar="MC"
                avatarClass="bt-avatar-blue"
                roleName={t('commissioner', lang)}
                name="Rahul Meena, IAS"
                sub="RMC HQ · City-wide SWM Head"
                onClick={() => openContact({ role: 'commissioner', roleLabel: t('commissioner', lang), name: 'Rahul Meena, IAS', sub: 'Rajamahendravaram Municipal Corporation' })}
              />
              <div className="bt-line" />
              <TreeNode
                avatar="WAS"
                avatarClass="bt-avatar-blue"
                roleName={t('was', lang)}
                name={wasName}
                sub="Escalation point for your ward"
                onClick={() => openContact({ role: 'was', roleLabel: t('was', lang), name: wasName, sub: area + ' Sachivalayam' })}
              />
              <div className="bt-line" />
              <TreeNode
                avatar="WHS"
                avatarClass="bt-avatar-accent"
                roleName={t('whs', lang)}
                name={whsName}
                sub="Monitors waste collection on ground"
                onClick={() => openContact({ role: 'whs', roleLabel: t('whs', lang), name: whsName, sub: area + ' Sachivalayam' })}
              />
            </>
          ) : (
            <>
              <div className="bt-line" />
              <TreeNode
                avatar="PS"
                avatarClass="bt-avatar-blue"
                roleName={t('ps', lang)}
                name={t('ps', lang) + " (Gr-V)"}
                sub="Head of Grama Sachivalayam"
                onClick={() => openContact({ role: 'rural', roleLabel: t('ps', lang), name: t('ps', lang), sub: area, isRural: true })}
              />
              <div className="bt-line" />
              <TreeNode
                avatar="EA"
                avatarClass="bt-avatar-accent"
                roleName={t('ea', lang)}
                name={t('ea', lang)}
                sub="Village sanitation & waste management"
                onClick={() => openContact({ role: 'rural', roleLabel: t('ea', lang), name: t('ea', lang), sub: area, isRural: true })}
              />
            </>
          )}
        </div>

        {/* RMC Branch (urban only) */}
        {isUrban && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
            <button onClick={() => openContact({ role: 'was', roleLabel: 'RMC Helpline', name: 'Rajamahendravaram Municipal Corporation', sub: 'Official grievance channel' })}
              style={{
                all: 'unset', cursor: 'pointer', padding: '6px 16px', borderRadius: 20,
                background: 'var(--accent-light)', border: '1px solid var(--accent)',
                color: 'var(--accent)', fontSize: 12, fontWeight: 700
              }}>
              {t('rmc_helpline', lang)}
            </button>
          </div>
        )}
      </div>

      {/* Elected Representatives */}
      <div className="bt-separator" />
      <h3 className="section-title" style={{ color: '#9ca3af' }}>
        {t('elected_reps', lang)}
      </h3>
      <div className="elected-row">
        {jurisdiction?.mla && (
          <div className="elected-card" onClick={() => onPoliticianClick?.({ ...jurisdiction.mla, type: 'MLA' })}>
            <div className="elected-avatar">
              <img
                src="https://meeadireddy.com/wp-content/uploads/2024/06/adireddy-vasu-profile.jpg"
                alt={jurisdiction.mla.name}
                onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#fef3cd;font-size:18px">MLA</div>' }}
              />
            </div>
            <div className="elected-name">{jurisdiction.mla.name}</div>
            <div className="elected-meta">
              <span className={`party-tag ${jurisdiction.mla.party?.toLowerCase()}`}>{jurisdiction.mla.party}</span> · MLA
            </div>
          </div>
        )}
        {jurisdiction?.mp && (
          <div className="elected-card" onClick={() => onPoliticianClick?.({ ...jurisdiction.mp, type: 'MP' })}>
            <div className="elected-avatar">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Daggubati_Purandeswari.jpg/220px-Daggubati_Purandeswari.jpg"
                alt={jurisdiction.mp.name}
                onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#fed7aa;font-size:18px">MP</div>' }}
              />
            </div>
            <div className="elected-name">{jurisdiction.mp.name}</div>
            <div className="elected-meta">
              <span className={`party-tag ${jurisdiction.mp.party?.toLowerCase()}`}>{jurisdiction.mp.party}</span> · MP
            </div>
          </div>
        )}
      </div>
      <p className="bt-note">{t('tap_contact', lang)}</p>

      {/* Contact Modal */}
      {contactPerson && (
        <ContactSheet person={contactPerson} onClose={() => setContactPerson(null)} />
      )}
    </>
  )
}
