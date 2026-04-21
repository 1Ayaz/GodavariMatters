import { useMemo } from 'react'

/**
 * NammaKasa-style Accountability / Blame Tree
 * Shows escalation chain: WHS → WAS → Municipal Commissioner → District Collector
 * Politicians (MLA/MP) shown separately at bottom with photos
 */
export default function BlameTree({ jurisdiction, sachivalayamOfficials, onPoliticianClick }) {
  const isUrban = jurisdiction?.type === 'urban'
  const areaCode = jurisdiction?.code

  // Find the matching sachivalayam official data
  const officials = useMemo(() => {
    if (!sachivalayamOfficials || !areaCode) return null
    return sachivalayamOfficials.find(s => s.code === areaCode)
  }, [sachivalayamOfficials, areaCode])

  const whsName = officials?.officials?.ward_health_secretary?.name || 'Ward Health Secretary'
  const wasName = officials?.officials?.ward_admin_secretary?.name || 'Ward Admin Secretary'

  return (
    <>
      <h3 className="section-title">ACCOUNTABILITY</h3>
      <div className="blame-tree">
        {/* Top: Your Sachivalayam */}
        <div className="bt-top">
          <div className="bt-top-label">Your Sachivalayam</div>
          <div className="bt-top-value">{jurisdiction?.area || 'Unknown'}</div>
        </div>

        {/* Branch split: Authority + Corporator */}
        <div className="bt-connector" />
        <div className="bt-branches">
          <div className="bt-branch">
            <div className="bt-avatar bt-avatar-blue">
              <span>RMC</span>
            </div>
            <div className="bt-role-name">RMC</div>
            <div className="bt-role-sub">Garbage Authority</div>
          </div>
          <div className="bt-branch">
            <div className="bt-avatar bt-avatar-warn">
              <span>!</span>
            </div>
            <div className="bt-role-name" style={{ color: '#d97706' }}>Corporator</div>
            <div className="bt-role-sub" style={{ color: '#d97706' }}>Vacant</div>
          </div>
        </div>

        {/* Chain: Commissioner → WAS → WHS */}
        <div className="bt-chain">
          <div className="bt-line" />
          <div className="bt-node">
            <div className="bt-avatar bt-avatar-blue"><span>MC</span></div>
            <div className="bt-node-info">
              <div className="bt-role-name">Municipal Commissioner</div>
              <div className="bt-role-sub">Rahul Meena, IAS · RMC HQ · City-wide SWM Head</div>
            </div>
          </div>

          <div className="bt-line" />
          <div className="bt-node">
            <div className="bt-avatar bt-avatar-blue"><span>WAS</span></div>
            <div className="bt-node-info">
              <div className="bt-role-name">{wasName}</div>
              <div className="bt-role-sub">Ward Admin Secretary · Escalation point</div>
            </div>
          </div>

          <div className="bt-line" />
          <div className="bt-node">
            <div className="bt-avatar bt-avatar-accent"><span>WHS</span></div>
            <div className="bt-node-info">
              <div className="bt-role-name">{whsName}</div>
              <div className="bt-role-sub">Ward Health Secretary · Monitors collection</div>
            </div>
          </div>
        </div>
      </div>

      {/* Elected Representatives — separate from blame tree */}
      <div className="bt-separator" />
      <h3 className="section-title" style={{ color: '#9ca3af' }}>
        ELECTED REPRESENTATIVES FOR THIS WARD
      </h3>
      <div className="elected-row">
        {jurisdiction?.mla && (
          <div className="elected-card" onClick={() => onPoliticianClick?.({ ...jurisdiction.mla, type: 'MLA' })}>
            <div className="elected-avatar">
              <img
                src="https://meeadireddy.com/wp-content/uploads/2024/06/adireddy-vasu-profile.jpg"
                alt={jurisdiction.mla.name}
                onError={(e) => { e.target.style.display='none'; e.target.parentNode.innerHTML='<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#fef3cd;font-size:20px">MLA</div>' }}
              />
            </div>
            <div className="elected-name">{jurisdiction.mla.name}</div>
            <div className="elected-meta">
              <span className={`party-tag ${jurisdiction.mla.party.toLowerCase()}`}>{jurisdiction.mla.party}</span> · MLA
            </div>
          </div>
        )}
        {jurisdiction?.mp && (
          <div className="elected-card" onClick={() => onPoliticianClick?.({ ...jurisdiction.mp, type: 'MP' })}>
            <div className="elected-avatar">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Daggubati_Purandeswari.jpg/220px-Daggubati_Purandeswari.jpg"
                alt={jurisdiction.mp.name}
                onError={(e) => { e.target.style.display='none'; e.target.parentNode.innerHTML='<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#fed7aa;font-size:20px">MP</div>' }}
              />
            </div>
            <div className="elected-name">{jurisdiction.mp.name}</div>
            <div className="elected-meta">
              <span className={`party-tag ${jurisdiction.mp.party.toLowerCase()}`}>{jurisdiction.mp.party}</span> · MP
            </div>
          </div>
        )}
      </div>
      <p className="bt-note">Tap any card for contact options · Corporator elections expected mid-2026</p>
    </>
  )
}
