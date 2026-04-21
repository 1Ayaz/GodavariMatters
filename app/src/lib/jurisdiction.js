/**
 * GodavariMatters — Jurisdiction Engine
 * 
 * Given a GPS coordinate, determines which Sachivalayam/Village 
 * the point falls in using the GeoJSON polygon boundary data.
 * Routes to the correct official based on urban vs rural.
 */

let boundaryData = null
let governanceData = null

/**
 * Load boundary and governance data
 */
export async function loadData() {
  if (!boundaryData) {
    const [geoRes, govRes] = await Promise.all([
      fetch('/rajahmundry_combined.geojson'),
      fetch('/governance.json')
    ])
    boundaryData = await geoRes.json()
    governanceData = await govRes.json()
  }
  return { boundaries: boundaryData, governance: governanceData }
}

/**
 * Point-in-polygon test using ray casting algorithm
 */
function pointInPolygon(point, polygon) {
  const [x, y] = point // [lng, lat]
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  return inside
}

/**
 * Check if a point falls within a GeoJSON feature
 */
function isPointInFeature(lng, lat, feature) {
  const geom = feature.geometry
  if (geom.type === 'Polygon') {
    return pointInPolygon([lng, lat], geom.coordinates[0])
  } else if (geom.type === 'MultiPolygon') {
    return geom.coordinates.some(poly => pointInPolygon([lng, lat], poly[0]))
  }
  return false
}

/**
 * Haversine distance for nearest-neighbor fallback
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3
  const toRad = d => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

/**
 * Get the centroid of a polygon for distance calculation
 */
function getCentroid(feature) {
  const coords = feature.geometry.type === 'Polygon'
    ? feature.geometry.coordinates[0]
    : feature.geometry.coordinates[0][0]
  const n = coords.length
  const sum = coords.reduce((acc, c) => [acc[0] + c[0], acc[1] + c[1]], [0, 0])
  return [sum[0] / n, sum[1] / n]
}

/**
 * CORE: Detect jurisdiction for a given GPS coordinate
 * Returns: { area, type, official, mla, mp, wasteType routing }
 */
export function detectJurisdiction(lat, lng) {
  if (!boundaryData || !governanceData) return null

  // Step 1: Try exact polygon match
  let matched = null
  for (const feature of boundaryData.features) {
    if (isPointInFeature(lng, lat, feature)) {
      matched = feature
      break
    }
  }

  // Step 2: If no match, use nearest-neighbor (Haversine)
  if (!matched) {
    let minDist = Infinity
    for (const feature of boundaryData.features) {
      const [cLng, cLat] = getCentroid(feature)
      const dist = haversineDistance(lat, lng, cLat, cLng)
      if (dist < minDist) {
        minDist = dist
        matched = feature
      }
    }
  }

  if (!matched) return null

  const props = matched.properties
  const isUrban = props.type === 'urban_sachivalayam'
  const isRural = props.type === 'rural_village' || props.type === 'rural_peri_urban'

  // Build MLA/MP info from governance data
  const gov = governanceData
  const mla = isUrban ? gov.urban.mla : gov.rural.mla
  const mp = gov.parliamentary_constituency

  // Build responsible official
  let official
  if (isUrban) {
    official = {
      role: gov.urban.responsible_official.role,
      short: gov.urban.responsible_official.short,
      department: gov.urban.responsible_official.department,
      note: `Sachivalayam: ${props.name || 'Unknown'}`
    }
  } else {
    official = {
      role: gov.rural.responsible_official.role,
      short: gov.rural.responsible_official.short,
      department: gov.rural.responsible_official.department,
      note: `Village: ${props.name || 'Unknown'}`
    }
  }

  return {
    area: props.name || 'Unknown Area',
    code: props.code || props.village_code || '',
    ward: props.ward || '',
    type: isUrban ? 'urban' : 'rural',
    feature: matched,
    official,
    mla: {
      name: mla.name,
      party: mla.party,
      constituency: mla.constituency
    },
    mp: {
      name: mp.mp,
      party: mp.party,
      constituency: mp.name
    },
    corporation: isUrban ? gov.urban.corporation : null,
    administration: isRural ? gov.rural.administration : null,
    complaintChannels: isUrban ? gov.urban.complaint_channels : gov.rural.complaint_channels,
    routing: gov.complaint_routing
  }
}

/**
 * Generate WhatsApp complaint payload
 */
export function generateWhatsAppPayload(report, jurisdiction, seenCount = 0) {
  const isRiverGhat = report.waste_type === 'River / Ghat'
  const isUrban = jurisdiction.type === 'urban'

  let prefix = '🚨 GodavariMatters: Public Sanitation Alert 🚨'
  if (isRiverGhat) {
    prefix = '🚨 GodavariMatters: JOINT-STRIKE River Pollution Alert 🚨'
  }

  let msg = `${prefix}

📍 *Issue:* ${report.waste_type} — ${report.severity.toUpperCase()}
📌 *Landmark:* ${report.landmark}
🗺️ *Live GPS Map:* https://www.google.com/maps?q=${report.lat},${report.lng}
📸 *Photographic Proof:* ${report.image_url}

🎯 *JURISDICTION ASSIGNMENT*
According to spatial mapping data, this coordinate falls under *${jurisdiction.area}* (${jurisdiction.type === 'urban' ? 'Ward Sachivalayam' : 'Gram Panchayat'}).

👤 *Responsible Official:* ${jurisdiction.official.role}
🏛️ *Department:* ${jurisdiction.official.department}`

  if (seenCount > 0) {
    msg += `\n\n✅ *Verified Alert:* This issue has been physically verified by *${seenCount} citizens* on the GodavariMatters network.`
  }

  if (isRiverGhat) {
    msg += `\n\n⚠️ *Jurisdiction Overlap Detected.*
Both *Rajamahendravaram Municipal Corporation* and *AP Pollution Control Board (APPCB)* are publicly accountable for this coordinate.
APPCB Toll-free: 18004252738`
  }

  msg += `\n\nPlease log this into the Spandana system and dispatch ${jurisdiction.official.short} to resolve immediately.

— GodavariMatters · godavarimatters.in`

  // Determine WhatsApp number
  const phone = isUrban ? '919494060060' : '911902'
  return {
    message: msg,
    url: `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
    phone
  }
}

/**
 * Generate shareable text for a report
 */
export function generateShareText(report, jurisdiction) {
  return `🚨 Garbage spotted in ${jurisdiction.area}, Rajamahendravaram!

📍 ${report.landmark}
⚠️ Severity: ${report.severity}
🗑️ Type: ${report.waste_type}
📸 See it: https://www.google.com/maps?q=${report.lat},${report.lng}

${jurisdiction.official.role} is responsible.
Track it on GodavariMatters 👉 godavarimatters.in`
}

/**
 * Get all boundary features (for map rendering)
 */
export function getBoundaryFeatures() {
  return boundaryData?.features || []
}
