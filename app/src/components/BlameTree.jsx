import { useMemo, useState } from 'react'
import { useApp } from '../lib/store'
import { t } from '../lib/i18n'
import { displayName } from '../lib/names'
import { useDragDismiss } from '../lib/useDragDismiss'
import { POLITICIAN_PHOTOS } from '../lib/utils'

// ── Constants ──
const RMC_HELPLINE = '9494060060'
const RMC_HELPLINE_DISPLAY = '9494-060-060'
const COMMISSIONER_EMAIL = 'mc.rjy@aptransco.in'
const PGRS_URL = 'https://pgrs.ap.gov.in/'
const MEEKOSAM_URL = 'https://meekosam.ap.gov.in'
const RURAL_HELPLINE = '1902'
const RMC_LOGO = 'https://upload.wikimedia.org/wikipedia/en/2/2f/Rajahmundry_Municipal_Corporation_Logo.png'


// ── Tree node ──
function TreeNode({ initials, colorClass, title, name, subtitle, tag, onClick }) {
  return (
    <button onClick={onClick} className="bt-node" title={`Tap to contact ${title}`}>
      <div className={`bt-avatar ${colorClass}`}><span>{initials}</span></div>
      <div style={{ lineHeight: 1.3, textAlign: 'left', flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name || title}</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name ? title : subtitle}</div>
      </div>
      {tag && <div style={{ fontSize: 9, padding: '3px 6px', borderRadius: 6, background: tag === 'DIRECTLY RESPONSIBLE' ? '#fee2e2' : '#f0fdf4', color: tag === 'DIRECTLY RESPONSIBLE' ? '#dc2626' : '#16a34a', fontWeight: 800, flexShrink: 0, marginLeft: 6 }}>{tag === 'DIRECTLY RESPONSIBLE' ? 'RESPONSIBLE' : tag}</div>}
    </button>
  )
}

export default function BlameTree({ jurisdiction, sachivalayamOfficials, onPoliticianClick }) {
  const { state, actions } = useApp()
  const lang = state.lang || 'en'
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

  const openContact = (person) => actions.selectOfficial({ ...person, area: displayName(area) })

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
    </>
  )
}
