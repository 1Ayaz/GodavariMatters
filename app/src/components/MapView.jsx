import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, GeoJSON, Marker, useMap, useMapEvents } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import { useApp } from '../lib/store'
import { loadData } from '../lib/jurisdiction'
import { displayName, normalizeKey } from '../lib/names'

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Fallback center — overridden by FitToUrban once city_limits loads
const RJY_CENTER = [17.014, 81.796]
const RJY_ZOOM = 13

// Max pan bounds
const RJY_BOUNDS = L.latLngBounds([16.88, 81.62], [17.12, 81.92])

const ZOOM_THRESHOLD = 15

const SEVERITY_COLORS = {
  minor: '#fbbf24', moderate: '#f97316', severe: '#ef4444', critical: '#dc2626',
}

// Classify a coordinate into a broad RJY zone label
// RJY centre ≈ 17.014°N, 81.796°E
function getZoneLabel(lat, lng) {
  const north = lat > 17.02
  const east  = lng > 81.81
  if (north && east)  return 'North-East RJY · GRMC'
  if (north && !east) return 'North-West RJY · GRMC'
  if (!north && east) return 'South-East RJY · GRMC'
  return 'South-West RJY · GRMC'
}

// ── Fit map to city_limits polygon on first load ──
function FitToUrban({ cityLimits }) {
  const map = useMap()
  const fitted = useRef(false)
  useEffect(() => {
    if (!cityLimits || fitted.current) return
    try {
      const layer = L.geoJSON(cityLimits)
      map.fitBounds(layer.getBounds(), { padding: [24, 24], maxZoom: 14, animate: false })
      fitted.current = true
    } catch (_) { }
  }, [cityLimits, map])
  return null
}

// ── Map zoom/GPS controls ──
function MapControls() {
  const map = useMap()
  const { actions } = useApp()
  return (
    <div className="map-controls">
      <button className="map-ctrl-btn gps-btn" aria-label="My location" onClick={() => {
        if (!navigator.geolocation) return alert('GPS not available')
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
            map.flyTo([loc.lat, loc.lng], 16, { duration: 1.5 })
            actions.setUserLocation(loc)
          },
          () => alert('Could not get your location.')
        )
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4" /></svg>
      </button>
      <button className="map-ctrl-btn" onClick={() => map.zoomIn()} aria-label="Zoom in">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
      </button>
      <button className="map-ctrl-btn" onClick={() => map.zoomOut()} aria-label="Zoom out">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /></svg>
      </button>
    </div>
  )
}

// ── Track zoom level ──
function ZoomTracker({ onZoomChange }) {
  useMapEvents({ zoomend: (e) => onZoomChange(e.target.getZoom()) })
  return null
}

// ── Clustered report markers ──
function ReportMarkers({ onReportPreview }) {
  const { filteredReports } = useApp()
  return (
    <MarkerClusterGroup
      chunkedLoading
      maxClusterRadius={60}
      showCoverageOnHover={false}
      spiderfyOnMaxZoom={true}
      iconCreateFunction={(cluster) => {
        const count = cluster.getChildCount()
        const activeCount = cluster.getAllChildMarkers().filter(m => !m.options.isResolved).length
        const size = Math.min(60, 32 + count * 2)
        if (activeCount === 0) {
          return L.divIcon({
            html: `<div class="ward-bubble" style="background:#16a34a;box-shadow:0 3px 12px rgba(22,163,74,0.4);border:2.5px solid rgba(255,255,255,0.5);width:${size}px;height:${size}px;font-size:${size > 40 ? 16 : 13}px">${count}</div>`,
            className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
          })
        }
        return L.divIcon({
          html: `<div class="ward-bubble has-reports" style="width:${size}px;height:${size}px;font-size:${size > 40 ? 16 : 13}px">${activeCount}</div>`,
          className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
        })
      }}
    >
      {filteredReports.map((report, idx) => {
        const isResolved = report.status === 'resolved'
        const isPending = report.cleaned_image_url && !isResolved
        const color = isResolved ? '#16a34a' : isPending ? '#f59e0b' : (SEVERITY_COLORS[report.severity] || '#f97316')

        // Dot jitter: stable offset for reports sharing the same lat/lng
        // Count how many earlier reports share the same coords
        const sameLocCount = filteredReports.slice(0, idx).filter(
          r => r.lat === report.lat && r.lng === report.lng
        ).length
        const JITTER = 0.00009  // ~10m
        const angle = (sameLocCount * 137.5) * (Math.PI / 180) // golden-angle spread
        const jLat = sameLocCount > 0 ? report.lat + Math.sin(angle) * JITTER : report.lat
        const jLng = sameLocCount > 0 ? report.lng + Math.cos(angle) * JITTER : report.lng

        const dotIcon = L.divIcon({
          className: '',
          html: `<div style="width:16px;height:16px;background:${color};border-radius:50%;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.2)"></div>`,
          iconSize: [16, 16], iconAnchor: [8, 8],
        })
        return (
          <Marker
            key={report.id}
            position={[jLat, jLng]}
            icon={dotIcon}
            isResolved={isResolved}
            eventHandlers={{ click: (e) => { L.DomEvent.stopPropagation(e); onReportPreview?.(report) } }}
          />
        )
      })}
    </MarkerClusterGroup>
  )
}

// ── Ward boundaries + outer city border ──
function BoundaryLayers({ onHover, onWardZoom, reportsByArea, cityLimits }) {
  const [geojson, setGeojson] = useState(null)
  const hoveredRef = useRef(null)

  useEffect(() => {
    loadData().then(({ boundaries }) => setGeojson(boundaries))
  }, [])

  const wardStyle = useCallback((feature) => {
    let name = normalizeKey(feature.properties.name || '')
    if (name.includes('SESHAYYAMETTA')) name = 'SESHAYYAMETTA'
    const stats = reportsByArea?.[name]
    const active = stats?.active || 0
    const total = stats?.total || 0
    const resolved = stats?.resolved || 0
    const fullyResolved = total > 0 && total === resolved
    return {
      color: 'transparent',
      weight: 0,
      opacity: 0,
      fillColor: active > 0 ? '#EF4444' : fullyResolved ? '#22C55E' : '#000',
      fillOpacity: active > 0 ? Math.min(0.25, 0.05 + active * 0.02) : 0,
    }
  }, [reportsByArea])

  // Dotted boundary — light dashed pink, not solid orange (NammaKasa style)
  const cityBorderStyle = {
    color: '#ef4444',
    weight: 2,
    opacity: 0.45,
    dashArray: '3 7',
    lineCap: 'round',
    lineJoin: 'round',
    fillColor: '#fef2f2',
    fillOpacity: 0.08,
  }

  const onEachWard = useCallback((feature, layer) => {
    const name = feature.properties.name || 'Unknown'
    const matchName = normalizeKey(name)
    const count = reportsByArea?.[matchName]?.total || 0
    // Compute centroid for zone label
    const bounds = layer.getBounds ? layer.getBounds() : null
    const centreLat = bounds ? (bounds.getNorth() + bounds.getSouth()) / 2 : 17.014
    const centreLng = bounds ? (bounds.getEast()  + bounds.getWest())  / 2 : 81.796
    layer.on({
      mouseover: (e) => {
        if (hoveredRef.current && hoveredRef.current !== e.target) {
          hoveredRef.current.setStyle({ weight: 0, color: 'transparent' })
        }
        e.target.setStyle({ weight: 2, color: '#E8390E', opacity: 0.9 })
        hoveredRef.current = e.target
        onHover?.({ name, rawName: name, centreLat, centreLng })
      },
      mouseout: (e) => {
        e.target.setStyle({ weight: 0, color: 'transparent' })
        hoveredRef.current = null
        onHover?.(null)
      },
      click: (e) => {
        L.DomEvent.stopPropagation(e)
        onWardZoom?.({ name, count, rawName: name, bounds: e.target.getBounds() })
      },
    })
  }, [reportsByArea, onHover, onWardZoom])

  if (!geojson) return null

  return (
    <>
      {/* All GRMC ward fills — hover/click interactive */}
      <GeoJSON
        key="all-wards"
        data={geojson}
        style={wardStyle}
        onEachFeature={onEachWard}
      />
      {/* City outer boundary — bold orange outline, no interaction */}
      {cityLimits && (
        <GeoJSON key="city-border" data={cityLimits} style={cityBorderStyle} interactive={false} />
      )}
    </>
  )
}

// ── MAIN MAP VIEW ──
export default function MapView() {
  const { state, actions } = useApp()
  const [cityLimits, setCityLimits] = useState(null)
  const [hoveredArea, setHoveredArea] = useState(null)
  const [currentZoom, setCurrentZoom] = useState(RJY_ZOOM)
  const mapRef = useRef(null)

  useEffect(() => {
    fetch('/city_limits.geojson').then(r => r.json()).then(setCityLimits).catch(() => { })
  }, [])

  const reportsByArea = useMemo(() => {
    const map = {}
    state.reports.forEach(r => {
      let area = normalizeKey(r.assigned_area || 'Unknown')
      if (area.includes('SESHAYYAMETTA')) area = 'SESHAYYAMETTA'
      if (!map[area]) map[area] = { total: 0, resolved: 0, active: 0 }
      map[area].total++
      if (r.status === 'resolved') map[area].resolved++
      else map[area].active++
    })
    return map
  }, [state.reports])

  const totalActive = state.reports.filter(r => r.status !== 'resolved').length
  const totalReports = state.reports.length

  const handleWardZoom = useCallback((ward) => {
    if (mapRef.current && ward.bounds) {
      mapRef.current.flyToBounds(ward.bounds, { padding: [40, 40], maxZoom: ZOOM_THRESHOLD + 1, duration: 0.8 })
    }
  }, [])

  const handleReportPreview = useCallback((report) => {
    actions.selectReport(report)
  }, [actions])

  if (state.activeView !== 'map') return null

  return (
    <div className="view-panel map-panel active">
      <MapContainer
        center={RJY_CENTER}
        zoom={RJY_ZOOM}
        minZoom={12}
        maxZoom={19}
        maxBounds={RJY_BOUNDS}
        maxBoundsViscosity={0.9}
        className="map-container"
        zoomControl={false}
        attributionControl={false}
        preferCanvas={true}
        zoomSnap={0.5}
        zoomDelta={1}
        whenReady={(e) => { mapRef.current = e.target }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
          updateWhenZooming={false}
          updateWhenIdle={true}
        />
        <ZoomTracker onZoomChange={setCurrentZoom} />
        <FitToUrban cityLimits={cityLimits} />
        <BoundaryLayers
          onHover={setHoveredArea}
          onWardZoom={handleWardZoom}
          reportsByArea={reportsByArea}
          cityLimits={cityLimits}
        />
        <ReportMarkers onReportPreview={handleReportPreview} />
        <MapControls />
      </MapContainer>

      {/* Combined stats badge — NammaKasa style: one card, both numbers */}
      <div className="map-stats-pill">
        <span className="msp-active">{totalActive}</span>
        <span className="msp-sep">Active</span>
        <span className="msp-divider">·</span>
        <span className="msp-total">{totalReports}</span>
        <span className="msp-sep">Reports</span>
      </div>

      {/* Ward hover tooltip — name + zone label only */}
      {hoveredArea && (
        <div className="map-info-panel mip-light">
          <div className="mip-indicator" />
          <div className="mip-content">
            <div className="mip-name">{displayName(hoveredArea.name)}</div>
            <div className="mip-meta">
              {getZoneLabel(hoveredArea.centreLat ?? 17.014, hoveredArea.centreLng ?? 81.796)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 