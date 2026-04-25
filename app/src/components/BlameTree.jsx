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
function TreeNode({ initials, colorClass, title, name, subtitle, onClick, img }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', cursor: 'pointer', background: 'none', border: 'none', width: '100%', padding: 0 }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, margin: '0 auto 8px', background: img ? 'none' : '#bfdbfe', color: '#2563eb' }} className={colorClass}>
        {img ? <img src={img} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 16 }} /> : <span>{initials}</span>}
      </div>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#111827', lineHeight: 1.2, marginBottom: 2 }}>{name || title}</div>
      <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>{subtitle || title}</div>
    </button>
  )
}

export default function BlameTree({ jurisdiction, sachivalayamOfficials, onPoliticianClick }) {
  const { state, actions } = useApp()
  const lang = state.lang || 'en'
  const areaCode = jurisdiction?.code
  const isUrban = jurisdiction?.type === 'urban' || jurisdiction?.type === 'urban_sachivalayam' || jurisdiction?.isUrban === true
  const area = jurisdiction?.area || jurisdiction?.name || 'Unknown'

  const officials = useMemo(() => {
    if (!sachivalayamOfficials || !areaCode) return null
    return sachivalayamOfficials.find(s => s.code === areaCode || `2${s.code}` === areaCode || s.code === `2${areaCode}`)
  }, [sachivalayamOfficials, areaCode])

  const wsanesName = officials?.officials?.ward_sanitation_secretary?.name || officials?.officials?.ward_health_secretary?.name || 'Ward Sanitation Secretary'
  const wasName = officials?.officials?.ward_admin_secretary?.name || 'Ward Admin Secretary'

  const openContact = (person) => actions.selectOfficial({ ...person, area: displayName(area) })

  return (
    <>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 16, background: 'white', padding: '24px 16px', marginBottom: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <h3 style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 20 }}>{t('accountability', lang)}</h3>

        {/* Your Ward */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 0, position: 'relative', zIndex: 2 }}>
          <div style={{ border: '1.5px solid #fca5a5', borderRadius: 16, padding: '8px 24px', background: '#fff1f2', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, marginBottom: 2 }}>{isUrban ? 'Your Ward' : 'Your Village'}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#991b1b' }}>{displayName(area)}</div>
          </div>
        </div>

        {isUrban ? (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 1.5, height: 24, background: '#d1d5db', margin: '8px 0' }} />
            <div style={{ width: 120 }}>
              <TreeNode
                initials="RMC" img={RMC_LOGO}
                title="Municipal Corporation" name="RMC HQ"
                subtitle="City Administration"
                onClick={() => openContact({ roleLabel: 'Municipal Commissioner', name: 'Rahul Meena, IAS', sub: 'RMC HQ · Final authority for city sanitation', isCommissioner: true, showRmcLogo: true })}
              />
            </div>

            {/* Curved split lines SVG */}
            <div style={{ position: 'relative', width: '100%', height: 40, marginTop: -12, marginBottom: 10, pointerEvents: 'none' }}>
              <svg width="100%" height="100%" viewBox="0 0 200 40" preserveAspectRatio="none">
                <path d="M100 0 Q100 30 50 40" fill="none" stroke="#c4b5fd" strokeWidth="2.5" />
                <path d="M100 0 Q100 30 150 40" fill="none" stroke="#c4b5fd" strokeWidth="2.5" />
              </svg>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'flex-start', width: '100%' }}>
              {/* Left: Executive Wing */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <TreeNode
                  initials="MC"
                  title="Special Commissioner" name="Rahul Meena, IAS"
                  subtitle="RMC HQ · City-wide SWM Head"
                  onClick={() => openContact({ roleLabel: 'Special Commissioner', name: 'Rahul Meena, IAS', sub: 'RMC HQ · Final authority for city sanitation', isCommissioner: true, showRmcLogo: true })}
                />
                <div style={{ width: 1.5, height: 24, background: '#d1d5db', margin: '8px 0' }} />
                <TreeNode
                  initials="ZC"
                  title="Zonal Commissioner" name="IAS Officer"
                  subtitle="Your Zone"
                  onClick={() => openContact({ roleLabel: 'Zonal Commissioner', name: 'IAS Officer', sub: `${displayName(area)} · Zonal Head`, showPrivacy: true })}
                />
                <div style={{ width: 1.5, height: 24, background: '#d1d5db', margin: '8px 0' }} />
                <TreeNode
                  initials="WEES"
                  title="JHI & AEE" name={wsanesName}
                  subtitle="Ward SWM staff · Monitors collection"
                  onClick={() => openContact({ roleLabel: 'Ward Environment & Sanitation Secretary (WEES)', name: wsanesName, sub: `${displayName(area)} Sachivalayam · Your ward's garbage person`, showPrivacy: true })}
                />
              </div>

              {/* Right: Political Wing */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <button onClick={() => alert('Ward Corporator positions are currently vacant.')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', cursor: 'pointer', background: 'none', border: 'none', width: '100%', padding: 0, opacity: 0.7 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', border: '1.5px solid #fde68a', background: '#fffbeb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#9ca3af', lineHeight: 1.2, marginBottom: 2 }}>Corporator</div>
                  <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700 }}>Vacant since 2021</div>
                </button>
              </div>
            </div>
          </div>
        ) : (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 1.5, height: 24, background: '#d1d5db', margin: '0 0 8px' }} />
              <TreeNode
                initials="EA"
                title={t('ea', lang)} name={t('ea', lang)}
                subtitle="Village sanitation & waste management"
                onClick={() => openContact({ roleLabel: t('ea', lang), name: t('ea', lang), sub: `${displayName(area)} · Sanitation + infrastructure`, isRural: true, showPrivacy: true })}
              />
              <div style={{ width: 1.5, height: 24, background: '#d1d5db', margin: '8px 0' }} />
              <TreeNode
                initials="PS"
                title={t('ps', lang)} name={`${t('ps', lang)} (Gr-V)`}
                subtitle="Head of Grama Sachivalayam"
                onClick={() => openContact({ roleLabel: t('ps', lang), name: t('ps', lang), sub: displayName(area), isRural: true, showPrivacy: true })}
              />
              <div style={{ width: 1.5, height: 24, background: '#d1d5db', margin: '8px 0' }} />
              <TreeNode
                initials="SR" colorClass="bg-green-100 text-green-700"
                title="Sarpanch" name="Elected Village Head"
                subtitle="Political accountability for village cleanliness"
                onClick={() => openContact({ roleLabel: 'Sarpanch', name: 'Elected Village Head', sub: displayName(area), isRural: true })}
              />
            </div>
          )}
        </div>

      {/* ── Elected Representatives ── */}
      <div className="bt-separator" />
      <h3 className="elected-section-title">ELECTED REPRESENTATIVES FOR THIS WARD</h3>
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
      <p className="bt-note">Tap any card for contact options · Corporator elections expected mid-2026</p>
    </>
  )
}
