/**
 * GodavariMatters — Jurisdiction Engine
 *
 * Given a GPS coordinate, determines which Sachivalayam/area
 * the point falls in using GeoJSON polygon boundary data.
 *
 * Zone priority (checked in order):
 *   1. Park polygon  → blame chain: Park Staff → AD Horticulture → Commissioner
 *   2. Ghat polygon  → blame chain: Private Agency → MHO → Commissioner
 *   3. Ward polygon  → blame chain: WEES → WAS → Commissioner  (all GRMC urban)
 */

let detectionData = null   // 104 features — for GPS point-in-polygon (original combined, full coverage)
let mapRenderData = null   // 104 features — for map polygon rendering (trimmed, zero overlap)
let governanceData = null
let specialZonesData = null

/**
 * Load boundary, governance, and special-zones data (cached after first call)
 *
 * Three boundary/data files:
 *   - rajahmundry_combined.geojson (104 features) → GPS jurisdiction detection
 *     Original boundaries for accurate point-in-polygon (includes overlapping rural)
 *   - rajahmundry_grmc.geojson (104 features) → Map polygon rendering
 *     Trimmed: sachivalayams untouched + rural areas clipped to remove overlap
 *   - governance.json, special_zones.json → metadata
 */
export async function loadData() {
  if (!detectionData) {
    const [combinedRes, grmcRes, govRes, zonesRes] = await Promise.all([
      fetch('/rajahmundry_combined.geojson'),
      fetch('/rajahmundry_grmc.geojson'),
      fetch('/governance.json'),
      fetch('/special_zones.json'),
    ])
    detectionData    = await combinedRes.json()
    mapRenderData    = await grmcRes.json()
    governanceData   = await govRes.json()
    specialZonesData = await zonesRes.json()
  }
  return { boundaries: mapRenderData, governance: governanceData, specialZones: specialZonesData }
}

// ── Geometry helpers ──────────────────────────────────────────────────────────

/**
 * Ray-casting point-in-polygon test.
 * @param {[number, number]} point  [lng, lat]
 * @param {[number, number][]} polygon  array of [lat, lng] pairs  ← note lat/lng order from JSON
 */
function pointInPolygonLatLng(lat, lng, polygon) {
  // polygon entries are [lat, lng]
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i]
    const [yj, xj] = polygon[j]
    if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  return inside
}

/**
 * Point-in-polygon for GeoJSON features (coordinates are [lng, lat])
 */
function isPointInFeature(lng, lat, feature) {
  const geom = feature.geometry
  if (geom.type === 'Polygon') {
    return pointInPolygonLngLat(lng, lat, geom.coordinates[0])
  } else if (geom.type === 'MultiPolygon') {
    return geom.coordinates.some(poly => pointInPolygonLngLat(lng, lat, poly[0]))
  }
  return false
}

function pointInPolygonLngLat(lng, lat, ring) {
  // ring entries are [lng, lat]
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  return inside
}

/**
 * Get the centroid of a GeoJSON polygon feature
 */
export function getCentroid(feature) {
  const coords = feature.geometry.type === 'Polygon'
    ? feature.geometry.coordinates[0]
    : feature.geometry.coordinates[0][0]
  const n = coords.length
  const sum = coords.reduce((acc, c) => [acc[0] + c[0], acc[1] + c[1]], [0, 0])
  return [sum[0] / n, sum[1] / n] // [lng, lat]
}

// ── Special zone detection ────────────────────────────────────────────────────

/**
 * Detect if a GPS coordinate falls in a park or ghat special zone.
 * Must be called BEFORE detectJurisdiction's ward lookup.
 * Returns null if not in any special zone.
 */
export function detectSpecialZone(lat, lng) {
  if (!specialZonesData) return null

  // Check parks first
  for (const park of specialZonesData.parks) {
    if (pointInPolygonLatLng(lat, lng, park.polygon)) {
      return { zoneType: 'park', zone: park }
    }
  }

  // Then ghats
  for (const ghat of specialZonesData.ghats) {
    if (pointInPolygonLatLng(lat, lng, ghat.polygon)) {
      return { zoneType: 'ghat', zone: ghat }
    }
  }

  return null
}

// ── Main jurisdiction detector ────────────────────────────────────────────────

/**
 * CORE: Detect jurisdiction for a given GPS coordinate.
 * Returns a jurisdiction object used by BlameTree and complaint routing.
 *
 * The returned object always includes:
 *   - area, type, code, ward
 *   - mla, mp
 *   - specialZone: null | { zoneType: 'park'|'ghat', zone }
 *   - complaintChannels, routing
 */
export function detectJurisdiction(lat, lng) {
  if (!detectionData || !governanceData) return null

  const gov = governanceData

  // Step 1: Check special zones (parks, ghats) — highest priority
  const specialZone = detectSpecialZone(lat, lng)

  // Step 2: Try exact ward polygon match (uses 104-feature combined data)
  let matched = null
  for (const feature of detectionData.features) {
    if (isPointInFeature(lng, lat, feature)) {
      matched = feature
      break
    }
  }

  // If outside all known boundaries, return null (hard geofence)
  if (!matched && !specialZone) return null

  const props = matched?.properties || {}


  const mla = gov.urban.mla
  const mp = gov.parliamentary_constituency

  return {
    area: props.name || specialZone?.zone?.name || 'Unknown Area',
    code: props.code || props.village_code || '',
    ward: props.ward || '',
    feature: matched,
    mla: { name: mla.name, party: mla.party, constituency: mla.constituency },
    mp: { name: mp.mp, party: mp.party, constituency: mp.name },
    corporation: gov.urban.corporation,
    specialZone: specialZone || null,
    complaintChannels: gov.urban.complaint_channels,
  }
}

// ── WhatsApp complaint payload ────────────────────────────────────────────────

/**
 * Generate WhatsApp complaint payload.
 * ALL complaints route to RMC helpline — special zone entries are for blame display only.
 */
export function generateWhatsAppPayload(report, jurisdiction, seenCount = 0) {
  const specialZone = jurisdiction?.specialZone
  const zoneType = specialZone?.zoneType  // 'park' | 'ghat' | undefined

  // Build prefix and responsible party string based on zone
  let prefix = '🚨 GodavariMatters: Public Sanitation Alert 🚨'
  let responsibleLine = ''

  if (zoneType === 'park') {
    prefix = '🌳 GodavariMatters: Public Park Cleanliness Alert 🌳'
    responsibleLine = `🎯 *Responsible:* Park Maintenance Staff → AD Horticulture (Parks Dept, GRMC)
📍 *Zone:* ${specialZone.zone.name}`
  } else if (zoneType === 'ghat') {
    prefix = '🚨 GodavariMatters: Riverfront / Ghat Sanitation Alert 🚨'
    responsibleLine = `🎯 *Responsible:* Private Maintenance Agency (contract) → MHO (Dr. Vinuthna)
📍 *Zone:* ${specialZone.zone.name}
⚠️ *Additional:* Also report to APPCB Toll-free: 18004252738 if river water is polluted`
  } else {
    responsibleLine = `🎯 *Responsible:* Ward Environment & Sanitation Secretary (WEES)
🗺️ *Ward/Sachivalayam:* ${jurisdiction?.area || 'Unknown'}`
  }

  let msg = `${prefix}

📍 *Issue:* ${report.waste_type} — ${report.severity.toUpperCase()}
📌 *Landmark:* ${report.landmark}
🗺️ *Live GPS:* https://www.google.com/maps?q=${report.lat},${report.lng}
📸 *Photo:* ${report.image_url}

${responsibleLine}
🏛️ *Authority:* Greater Rajamahendravaram Municipal Corporation (GRMC)`

  if (seenCount > 0) {
    msg += `\n\n✅ *Verified:* This issue has been confirmed by *${seenCount} citizens* on the GodavariMatters network.`
  }

  msg += `\n\nPlease log this in the Spandana/PGRS system and dispatch the responsible team immediately.

— GodavariMatters · godavari-matters.vercel.app`

  // All complaints go to RMC helpline
  const phone = '919494060060'
  return {
    message: msg,
    url: `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
    phone,
  }
}

/**
 * Generate shareable text for a report
 */
export function generateShareText(report, jurisdiction) {
  const zone = jurisdiction?.specialZone
  const location = zone
    ? zone.zone.name
    : `${jurisdiction?.area || 'Unknown Area'}, Rajamahendravaram`

  return `🚨 Garbage spotted at ${location}!

📍 ${report.landmark}
⚠️ Severity: ${report.severity}
🗑️ Type: ${report.waste_type}
📸 See it: https://www.google.com/maps?q=${report.lat},${report.lng}

Report & track on GodavariMatters 👉 godavari-matters.vercel.app`
}

/**
 * Get all boundary features (for map rendering)
 */
export function getBoundaryFeatures() {
  return boundaryData?.features || []
}
