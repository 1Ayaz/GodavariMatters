import { useMemo, useState } from 'react'
import { useApp } from '../lib/store'
import { t } from '../lib/i18n'
import { displayName } from '../lib/names'

// ── Constants ──
const RMC_HELPLINE = '9494060060'
const RMC_HELPLINE_DISPLAY = '9494-060-060'
const COMMISSIONER_EMAIL = 'mc.rjy@aptransco.in'
const PGRS_URL = 'https://pgrs.ap.gov.in/'
const MEEKOSAM_URL = 'https://meekosam.ap.gov.in'
const RURAL_HELPLINE = '1902'
const RMC_LOGO = 'https://upload.wikimedia.org/wikipedia/en/2/2f/Rajahmundry_Municipal_Corporation_Logo.png'

// Politician photos
const POLITICIAN_PHOTOS = {
  'Adireddy Srinivas': 'https://meeadireddy.com/wp-content/uploads/2024/06/adireddy-vasu-profile.jpg',
  'Gorantla Butchaiah Chowdary': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Gorantla_Butchaiah_Chowdary_MLA.jpg/220px-Gorantla_Butchaiah_Chowdary_MLA.jpg',
  'Daggubati Purandheshwari': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Daggubati_Purandeswari.jpg/220px-Daggubati_Purandeswari.jpg',
}

// ── Contact Sheet (modal) ──
function ContactSheet({ person, onClose }) {
  if (!person) return null
  const { state } = useApp()
  const lang = state.lang || 'en'

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bottom-sheet small-sheet" style={{ padding: 0 }}>
        <div className="sheet-header">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {person.showRmcLogo && (
              <img src={RMC_LOGO} alt="RMC" style={{ width: 44, height: 44, objectFit: 'contain' }}
                onError={(e) => { e.target.style.display = 'none' }} />
            )}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: 1, marginBottom: 3, textTransform: 'uppercase' }}>
                {person.roleLabel}
              </div>
              <h2 style={{ fontSize: 17 }}>{person.name}</h2>
              {person.sub && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{person.sub}</p>}
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="sheet-body">
          {/* Privacy notice for ward-level officials */}
          {person.showPrivacy && (
            <div style={{
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14,
              padding: 14, marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)'
            }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <div>
                  <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: 2, fontSize: 13 }}>Privacy Protected</strong>
                  Official phone numbers are masked. Request access for legitimate follow-ups.
                </div>
              </div>
              <a href={`mailto:admin@godavarimatters.in?subject=Contact Request: ${person.roleLabel} - ${person.area}&body=I need the contact for ${person.name} (${person.roleLabel}) in ${person.area} to follow up on a sanitation complaint.`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                  padding: 11, borderRadius: 10, background: 'var(--text-primary)', color: '#fff',
                  fontWeight: 700, fontSize: 13, textDecoration: 'none'
                }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 17a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2h16a2 2 0 012 2v10z"/><path d="M2 7l10 7 10-7"/></svg>
                Request Phone Number
              </a>
            </div>
          )}

          <div className="section-title" style={{ marginBottom: 10 }}>Official Channels</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Commissioner email */}
            {person.isCommissioner && (
              <a href={`mailto:${COMMISSIONER_EMAIL}?subject=Garbage Complaint - ${person.area || 'Rajamahendravaram'}&body=Dear Commissioner,%0A%0AI am writing about a garbage issue at [location].%0AKindly take action.%0A%0AThank you.`}
                className="action-btn complaint-btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: 14 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>
                Email Commissioner
              </a>
            )}

            {/* Urban channels */}
            {!person.isRural && (
              <>
                <a href={`https://wa.me/91${RMC_HELPLINE}?text=${encodeURIComponent('Hello RMC, I want to report a garbage issue in my area.')}`}
                  target="_blank" rel="noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                    padding: 14, borderRadius: 12, background: '#25D366', color: '#fff',
                    fontWeight: 700, fontSize: 15, textDecoration: 'none', boxShadow: '0 4px 12px rgba(37,211,102,0.2)'
                  }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp RMC Helpline
                </a>
                <a href={`tel:${RMC_HELPLINE}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                    padding: 12, borderRadius: 12, border: '1.5px solid var(--border)',
                    background: '#fff', color: 'var(--text-primary)', fontWeight: 700, fontSize: 14, textDecoration: 'none'
                  }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 012 2.18 2 2 0 014 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                  Call: {RMC_HELPLINE_DISPLAY}
                </a>
                <a href={PGRS_URL} target="_blank" rel="noreferrer"
                  className="action-btn cleaned-btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', borderRadius: 12 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  File PGRS Complaint
                </a>
              </>
            )}

            {/* Rural channels */}
            {person.isRural && (
              <>
                <a href={`tel:${RURAL_HELPLINE}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                    padding: 12, borderRadius: 12, background: 'var(--green)', color: '#fff',
                    fontWeight: 700, fontSize: 14, textDecoration: 'none'
                  }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 012 2.18 2 2 0 014 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                  Call 1902 (State Helpline)
                </a>
                <a href={MEEKOSAM_URL} target="_blank" rel="noreferrer"
                  className="action-btn cleaned-btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  File on Meekosam Portal
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tree node ──
function TreeNode({ initials, colorClass, title, name, subtitle, tag, onClick }) {
  return (
    <button onClick={onClick} className="bt-node"
      onMouseOver={(e) => e.currentTarget.style.background = '#fef2f0'}
      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
      title={`Tap to contact ${title}`}>
      <div className={`bt-avatar ${colorClass}`}><span>{initials}</span></div>
      <div style={{ lineHeight: 1.3, textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{name || title}</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{name ? title : subtitle}</div>
        {tag && <div style={{ fontSize: 9, marginTop: 2, padding: '1px 6px', borderRadius: 4, background: tag === 'DIRECTLY RESPONSIBLE' ? '#fee2e2' : '#f0fdf4', color: tag === 'DIRECTLY RESPONSIBLE' ? '#dc2626' : '#16a34a', fontWeight: 800, display: 'inline-block' }}>{tag}</div>}
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
    return sachivalayamOfficials.find(s => s.code === areaCode || `2${s.code}` === areaCode || s.code === `2${areaCode}`)
  }, [sachivalayamOfficials, areaCode])

  // Ward officials
  const wsanesName = officials?.officials?.ward_sanitation_secretary?.name || officials?.officials?.ward_health_secretary?.name || 'Ward Sanitation Secretary'
  const wasName = officials?.officials?.ward_admin_secretary?.name || 'Ward Admin Secretary'

  const openContact = (person) => setContactPerson({ ...person, area: displayName(area) })

  return (
    <>
      <h3 className="section-title">{t('accountability', lang)}</h3>

      {/* ── Complaint Flow Info ── */}
      <div style={{
        background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12,
        padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#92400e'
      }}>
        <strong style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>📋 How Complaints Work</strong>
        {isUrban
          ? 'You report → RMC routes to your ward\'s WSanES → If unresolved, escalates to WAS → then Commissioner. Or call RMC helpline directly.'
          : 'You report → Grama Sachivalayam EA handles sanitation → Escalate to Panchayat Secretary → then MPDO/Collectorate.'}
      </div>

      <div className="blame-tree">
        {/* Your Ward */}
        <div className="bt-top">
          <div className="bt-top-label">{isUrban ? t('your_ward', lang) : t('your_village', lang)}</div>
          <div className="bt-top-value">{displayName(area)}</div>
        </div>

        {/* Chain */}
        <div className="bt-chain">
          {isUrban ? (
            <>
              {/* Level 1: WSanES — directly responsible */}
              <div className="bt-line" />
              <TreeNode
                initials="WS" colorClass="bt-avatar-accent"
                title="Ward Sanitation Secretary" name={wsanesName}
                subtitle="Garbage collection, street sweeping, drain cleaning"
                tag="DIRECTLY RESPONSIBLE"
                onClick={() => openContact({ roleLabel: 'Ward Sanitation & Environment Secretary (WSanES)', name: wsanesName, sub: `${displayName(area)} Sachivalayam · Your ward's garbage person`, showPrivacy: true })}
              />
              {/* Level 2: WAS — escalation */}
              <div className="bt-line" />
              <TreeNode
                initials="WAS" colorClass="bt-avatar-blue"
                title="Ward Admin Secretary" name={wasName}
                subtitle="Team leader — escalation if WSanES doesn't act"
                tag="ESCALATION"
                onClick={() => openContact({ roleLabel: 'Ward Administrative Secretary (WAS)', name: wasName, sub: `${displayName(area)} Sachivalayam · Ward team leader`, showPrivacy: true })}
              />
              {/* Level 3: RMC */}
              <div className="bt-line" />
              <TreeNode
                initials="RMC" colorClass="bt-avatar-blue"
                title="RMC Helpline" name="Rajamahendravaram MC"
                subtitle="City-wide complaint routing (9494-060-060)"
                onClick={() => openContact({ roleLabel: 'RMC Helpline', name: 'Rajamahendravaram Municipal Corporation', sub: 'Official grievance channel · Routes complaints to wards', showRmcLogo: true })}
              />
              {/* Level 4: Commissioner */}
              <div className="bt-line" />
              <TreeNode
                initials="MC" colorClass="bt-avatar-dark"
                title="Municipal Commissioner" name="Rahul Meena, IAS"
                subtitle="Final authority · Dial Your Commissioner (Mon 10-11 AM)"
                onClick={() => openContact({ roleLabel: 'Municipal Commissioner', name: 'Rahul Meena, IAS', sub: 'RMC HQ · Final authority for city sanitation', isCommissioner: true, showRmcLogo: true })}
              />
            </>
          ) : (
            <>
              {/* Rural: EA → PS → Sarpanch → MPDO */}
              <div className="bt-line" />
              <TreeNode
                initials="EA" colorClass="bt-avatar-accent"
                title={t('ea', lang)} name={t('ea', lang)}
                subtitle="Village sanitation & waste management"
                tag="DIRECTLY RESPONSIBLE"
                onClick={() => openContact({ roleLabel: t('ea', lang), name: t('ea', lang), sub: `${displayName(area)} · Sanitation + infrastructure`, isRural: true, showPrivacy: true })}
              />
              <div className="bt-line" />
              <TreeNode
                initials="PS" colorClass="bt-avatar-blue"
                title={t('ps', lang)} name={`${t('ps', lang)} (Gr-V)`}
                subtitle="Head of Grama Sachivalayam"
                tag="ESCALATION"
                onClick={() => openContact({ roleLabel: t('ps', lang), name: t('ps', lang), sub: displayName(area), isRural: true, showPrivacy: true })}
              />
              <div className="bt-line" />
              <TreeNode
                initials="SR" colorClass="bt-avatar-green"
                title="Sarpanch" name="Elected Village Head"
                subtitle="Political accountability for village cleanliness"
                onClick={() => openContact({ roleLabel: 'Sarpanch', name: 'Elected Village Head', sub: displayName(area), isRural: true })}
              />
              <div className="bt-line" />
              <TreeNode
                initials="MPD" colorClass="bt-avatar-dark"
                title="MPDO" name="Mandal Parishad Dev. Officer"
                subtitle="Mandal-level administration"
                onClick={() => openContact({ roleLabel: 'MPDO', name: 'MPDO - Rajamahendravaram Rural', sub: 'Mandal-level escalation for rural areas', isRural: true })}
              />
            </>
          )}
        </div>

        {/* Corporator status banner */}
        {isUrban && (
          <div style={{
            marginTop: 12, padding: '8px 14px', borderRadius: 10,
            background: '#fef3cd', border: '1px solid #fde68a', fontSize: 11,
            color: '#92400e', textAlign: 'center', lineHeight: 1.4
          }}>
            <strong>⚠ Ward Corporators:</strong> Currently vacant. RMC is under Special Officer administration. Municipal elections pending.
          </div>
        )}
      </div>

      {/* ── Elected Representatives ── */}
      <div className="bt-separator" />
      <h3 className="section-title" style={{ color: '#9ca3af' }}>{t('elected_reps', lang)}</h3>
      <div className="elected-row">
        {jurisdiction?.mla && (
          <div className="elected-card" onClick={() => onPoliticianClick?.({ ...jurisdiction.mla, type: 'MLA' })}>
            <div className="elected-avatar">
              <img src={POLITICIAN_PHOTOS[jurisdiction.mla.name] || ''} alt={jurisdiction.mla.name}
                onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#fef3cd;font-size:16px;font-weight:700">MLA</div>' }} />
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
              <img src={POLITICIAN_PHOTOS[jurisdiction.mp.name] || ''} alt={jurisdiction.mp.name}
                onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#fed7aa;font-size:16px;font-weight:700">MP</div>' }} />
            </div>
            <div className="elected-name">{jurisdiction.mp.name}</div>
            <div className="elected-meta">
              <span className={`party-tag ${jurisdiction.mp.party?.toLowerCase()}`}>{jurisdiction.mp.party}</span> · MP
            </div>
          </div>
        )}
      </div>
      <p className="bt-note">{t('tap_contact', lang)}</p>

      {contactPerson && <ContactSheet person={contactPerson} onClose={() => setContactPerson(null)} />}
    </>
  )
}
