import { useApp } from '../lib/store'
import { displayName } from '../lib/names'
import { POLITICIAN_PHOTOS } from '../lib/utils'

/**
 * BlameTree — NammaKasa-exact layout mapped to RJY/GRMC
 *
 * Structure (mirrors nammakasa.in exactly):
 *
 *        ┌──────────────────┐
 *        │  Your Ward       │   ← red rounded pill, centered
 *        │  Area Name       │
 *        └──────────────────┘
 *                 │
 *        ╭────────┴────────╮
 *        │                 │
 *    [GRMC logo]      [Corporator]   ← fork: left = authority, right = political (vacant)
 *    Municipal Auth   Vacant · Special Officer Rule
 *        │
 *    [MHO]              ← Municipal Health Officer · City SWM Head
 *        │
 *    [SS]               ← Sanitary Supervisor · Zonal Level
 *        │
 *    [WSES]             ← Ward Sanitation & Environment Secretary · First contact
 *
 *   ─── ELECTED REPRESENTATIVES FOR THIS WARD ───
 *   [MLA photo]   [MP photo]
 *
 * Special zones swap the chain:
 *   park  → AD Horticulture → Park Staff
 *   ghat  → MHO → Private Agency
 */

const RMC_LOGO = '/rmc-logo.svg'

// ── Rounded-square avatar ──────────────────────────────────────────────────────
function Avatar({ initials, img, bg = '#dbeafe', color = '#3b82f6', size = 52, faded = false }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 16,
      background: img ? '#fff' : bg,
      border: '1.5px solid #e5e7eb',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.max(11, size * 0.26), fontWeight: 800, color,
      overflow: 'hidden', flexShrink: 0, margin: '0 auto',
      opacity: faded ? 0.45 : 1,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      {img
        ? <img src={img} alt={initials}
            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 6 }}
            onError={e => { e.target.style.display = 'none' }} />
        : <span>{initials}</span>
      }
    </div>
  )
}

// ── Clickable chain node (icon + label) ───────────────────────────────────────
function Node({ initials, img, bg, color, title, sub, onClick, size = 52, faded = false }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
        background: 'none', border: 'none',
        cursor: onClick ? 'pointer' : 'default', padding: 0,
        width: '100%',
      }}
    >
      <Avatar initials={initials} img={img} bg={bg} color={color} size={size} faded={faded} />
      <div style={{ textAlign: 'center', lineHeight: 1.3 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: faded ? '#9ca3af' : '#1f2937' }}>
          {title}
        </div>
        {sub && (
          <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, marginTop: 1 }}>
            {sub}
          </div>
        )}
      </div>
    </button>
  )
}

// ── Vertical connector line ────────────────────────────────────────────────────
function VLine({ h = 26 }) {
  return <div style={{ width: 1.5, height: h, margin: '0 auto', background: '#d1d5db' }} />
}

// ── SVG fork (ward pill → authority + corporator) ──────────────────────────────
function Fork() {
  return (
    <svg
      width="100%" height="52" viewBox="0 0 220 52"
      preserveAspectRatio="none"
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* Stem down from pill */}
      <line x1="110" y1="0" x2="110" y2="18" stroke="#d1d5db" strokeWidth="1.5" />
      {/* Curve left → authority */}
      <path d="M110 18 C110 42 55 42 55 52" fill="none" stroke="#c4b5fd" strokeWidth="1.5" />
      {/* Curve right → corporator */}
      <path d="M110 18 C110 42 165 42 165 52" fill="none" stroke="#c4b5fd" strokeWidth="1.5" />
    </svg>
  )
}

// ── Chain definitions per zone type ───────────────────────────────────────────
function getChain(zoneType) {
  if (zoneType === 'park') {
    return [
      {
        key: 'adh', initials: 'ADH',
        bg: '#dcfce7', color: '#16a34a',
        title: 'AD Horticulture',
        sub: 'Parks Dept · GRMC',
        role: 'Assistant Director of Horticulture',
        desc: 'Anitha · Parks Department · GRMC · 8688401560',
      },
      {
        key: 'staff', initials: '🌳',
        bg: '#f0fdf4', color: '#16a34a',
        title: 'Park Staff',
        sub: 'On-ground maintenance',
        role: 'Park Maintenance Staff',
        desc: 'On-ground maintenance · Horticulture Dept',
      },
    ]
  }

  if (zoneType === 'ghat') {
    return [
      {
        key: 'mho', initials: 'MHO',
        bg: '#ccfbf1', color: '#0d9488',
        title: 'Municipal Health Officer',
        sub: 'City SWM Head · GRMC',
        role: 'Municipal Health Officer (MHO)',
        desc: 'Dr. A. Vinuthna · Supervises private ghat contracts · GRMC Health Wing',
      },
      {
        key: 'agency', initials: '🚿',
        bg: '#ccfbf1', color: '#0d9488',
        title: 'Private Agency',
        sub: 'Contract cleaning crew',
        role: 'Private Cleaning Agency',
        desc: 'Contract crew · Riverfront maintenance · 16 priority ghats',
      },
    ]
  }

  // Default: Urban ward — mirrors NammaKasa SC → ZC → JHI chain
  return [
    {
      key: 'mho', initials: 'MHO',
      bg: '#dbeafe', color: '#3b82f6',
      title: 'Municipal Health Officer',
      sub: 'City SWM Head · GRMC HQ',
      role: 'Municipal Health Officer (MHO)',
      desc: 'Dr. A. Vinuthna · City-wide Sanitation Head · GRMC · 9849908348',
    },
    {
      key: 'ss', initials: 'SS',
      bg: '#dbeafe', color: '#3b82f6',
      title: 'Sanitary Supervisor',
      sub: 'Zonal level · Block of wards',
      role: 'Sanitary Supervisor',
      desc: 'Zonal sanitation oversight · Reports to MHO · Block of wards',
    },
    {
      key: 'wses', initials: 'WSES',
      bg: '#dbeafe', color: '#3b82f6',
      title: 'WSES',
      sub: 'Ward Sanitation & Environment Sec.',
      role: 'Ward Sanitation & Environment Secretary (WSES)',
      desc: "Your sachivalayam's first point of contact for garbage",
    },
  ]
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function BlameTree({ jurisdiction, onPoliticianClick }) {
  const { actions } = useApp()

  const area     = displayName(jurisdiction?.area || jurisdiction?.name || 'Unknown Area')
  const zoneType = jurisdiction?.specialZone?.zoneType || 'urban'
  const chain    = getChain(zoneType)

  const openContact = (role, desc) =>
    actions.selectOfficial({ roleLabel: role, sub: desc, area })

  // Zone badge
  const zoneBadge =
    zoneType === 'park'  ? { label: '🌳 Public Park',   bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' }
    : zoneType === 'ghat'? { label: '🏞️ Riverfront',    bg: '#f0fdfa', color: '#0d9488', border: '#99f6e4' }
    : null

  return (
    <>
      {/* ══════════ ACCOUNTABILITY CARD ══════════ */}
      <div style={{
        border: '1px solid #e5e7eb', borderRadius: 16, background: '#fff',
        padding: '16px 12px 14px', marginBottom: 20,
      }}>

        {/* Header row — label + optional zone badge */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 16,
        }}>
          <span style={{
            fontSize: 10, fontWeight: 800, letterSpacing: 1.2,
            color: '#9ca3af', textTransform: 'uppercase',
          }}>
            Accountability
          </span>
          {zoneBadge && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
              background: zoneBadge.bg, border: `1px solid ${zoneBadge.border}`,
              color: zoneBadge.color,
            }}>
              {zoneBadge.label}
            </span>
          )}
        </div>

        {/* ── Ward pill ── */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{
            background: '#fff1f2',
            border: '2px solid #fca5a5',
            borderRadius: 20, padding: '8px 28px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(239,68,68,0.10)',
          }}>
            <div style={{
              fontSize: 10, color: '#ef4444', fontWeight: 700,
              marginBottom: 2, letterSpacing: 0.4,
            }}>
              Your Ward
            </div>
            <div style={{
              fontSize: 17, fontWeight: 800, color: '#991b1b', lineHeight: 1.2,
            }}>
              {area}
            </div>
          </div>
        </div>

        {/* ── Fork SVG — endpoints match the two flex:1 columns below ──
             SVG viewBox 220px wide: stem at x=110 (50%), left ends at x=55 (25%), right at x=165 (75%)
             With two flex:1 columns: left center = 25%, right center = 75% → perfect alignment ── */}
        <Fork />

        {/* ── Row 1: Fork nodes — two EQUAL columns so SVG endpoints land on node centers ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>

          {/* LEFT (flex:1 = 50% → center at 25%) — GRMC */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Node
              initials="RMC" img={RMC_LOGO}
              title="GRMC"
              sub="Municipal Authority"
              onClick={() => openContact(
                'GRMC — Municipal Authority',
                'Greater Rajamahendravaram Municipal Corporation · Helpline: 94940-60060'
              )}
              size={52}
            />
          </div>

          {/* RIGHT (flex:1 = 50% → center at 75%) — Corporator */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Node
              initials="⚠️"
              bg="#fffbeb" color="#d97706"
              title="Corporator"
              faded
              size={52}
            />
            <div style={{
              marginTop: 6, fontSize: 9, fontWeight: 800, color: '#d97706',
              background: '#fffbeb', border: '1px solid #fde68a',
              borderRadius: 20, padding: '2px 9px', textAlign: 'center',
              lineHeight: 1.4,
            }}>
              Vacant · Special Officer Rule
            </div>
          </div>

        </div>

        {/* ── Row 2: Vertical chain — left half only (under GRMC), right half is spacer ── */}
        <div style={{ display: 'flex' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 10 }}>
            {chain.map(node => (
              <div
                key={node.key}
                style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              >
                <VLine h={24} />
                <Node
                  initials={node.initials} img={node.img}
                  bg={node.bg} color={node.color}
                  title={node.title} sub={node.sub}
                  onClick={() => openContact(node.role, node.desc)}
                  size={48}
                />
              </div>
            ))}
          </div>
          {/* Spacer — keeps right half empty so chain stays left-aligned */}
          <div style={{ flex: 1 }} />
        </div>

      </div>

      {/* ══════════ ELECTED REPRESENTATIVES ══════════ */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
      }}>
        <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
        <span style={{
          fontSize: 10, fontWeight: 800, letterSpacing: 1, color: '#9ca3af',
          textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}>
          Elected Representatives for this Ward
        </span>
        <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>

        {/* MLA */}
        {jurisdiction?.mla && (
          <button
            onClick={() => onPoliticianClick?.({ ...jurisdiction.mla, type: 'MLA' })}
            style={{
              flex: 1, maxWidth: 150, textAlign: 'center',
              background: 'none', border: 'none', cursor: 'pointer',
              borderRadius: 12, padding: '8px 4px',
            }}
          >
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              margin: '0 auto 8px', overflow: 'hidden',
              border: '2.5px solid #e5e7eb', background: '#f3f4f6',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}>
              {POLITICIAN_PHOTOS[jurisdiction.mla.name]
                ? <img src={POLITICIAN_PHOTOS[jurisdiction.mla.name]} alt={jurisdiction.mla.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.target.style.display = 'none' }} />
                : <div style={{
                    width: '100%', height: '100%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, color: '#d97706', fontSize: 14,
                  }}>MLA</div>
              }
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#111827', lineHeight: 1.2, marginBottom: 3 }}>
              {jurisdiction.mla.name}
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>
              <span style={{ fontWeight: 800, color: '#f59e0b' }}>{jurisdiction.mla.party}</span>
              {' · MLA'}
            </div>
          </button>
        )}

        {/* MP */}
        {jurisdiction?.mp && (
          <button
            onClick={() => onPoliticianClick?.({ ...jurisdiction.mp, type: 'MP' })}
            style={{
              flex: 1, maxWidth: 150, textAlign: 'center',
              background: 'none', border: 'none', cursor: 'pointer',
              borderRadius: 12, padding: '8px 4px',
            }}
          >
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              margin: '0 auto 8px', overflow: 'hidden',
              border: '2.5px solid #e5e7eb', background: '#f3f4f6',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}>
              {POLITICIAN_PHOTOS[jurisdiction.mp.name]
                ? <img src={POLITICIAN_PHOTOS[jurisdiction.mp.name]} alt={jurisdiction.mp.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.target.style.display = 'none' }} />
                : <div style={{
                    width: '100%', height: '100%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, color: '#ea580c', fontSize: 14,
                  }}>MP</div>
              }
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#111827', lineHeight: 1.2, marginBottom: 3 }}>
              {jurisdiction.mp.name}
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>
              <span style={{ fontWeight: 800, color: '#f97316' }}>{jurisdiction.mp.party}</span>
              {' · MP'}
            </div>
          </button>
        )}

      </div>

      <p style={{
        textAlign: 'center', fontSize: 10, color: '#9ca3af',
        marginTop: 12, fontWeight: 500,
      }}>
        Tap any card for contact options · Corporator elections expected mid-2026
      </p>
    </>
  )
}
