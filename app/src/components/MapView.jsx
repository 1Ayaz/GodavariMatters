import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useApp } from '../lib/store'
import { loadData } from '../lib/jurisdiction'

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Tight zoom on RJY urban core
const RJY_CENTER = [17.003, 81.800]
const RJY_ZOOM = 14

const SEVERITY_COLORS = {
  minor: '#fbbf24', moderate: '#f97316', severe: '#ef4444', critical: '#dc2626',
}

// ── Map Controls ──
function MapControls() {
  const map = useMap()
  const { actions } = useApp()
  return (
    <div className="map-controls">
      <button className="map-ctrl-btn" onClick={() => map.zoomIn()} aria-label="Zoom in">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
      <button className="map-ctrl-btn" onClick={() => map.zoomOut()} aria-label="Zoom out">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>
      </button>
    </div>
  )
}

// ── Get centroid of a GeoJSON polygon ──
function getCentroid(feature) {
  const coords = feature.geometry.type === 'Polygon'
    ? feature.geometry.coordinates[0]
    : feature.geometry.coordinates[0][0]
  const n = coords.length
  const sum = coords.reduce((acc, c) => [acc[0] + c[0], acc[1] + c[1]], [0, 0])
  return [sum[1] / n, sum[0] / n] // [lat, lng]
}

// ── Ward count bubbles (only when complaints > 0) ──
function WardBubbles({ boundaries, reportsByArea }) {
  if (!boundaries) return null

  const urbanFeatures = boundaries.features.filter(f => f.properties.type === 'urban_sachivalayam')

  return urbanFeatures.map((feature) => {
    const name = feature.properties.name || 'Unknown'
    const count = reportsByArea[name] || 0
    if (count === 0) return null

    const center = getCentroid(feature)
    const size = Math.max(28, Math.min(52, 24 + count * 3))
    const isHot = count >= 5

    const icon = L.divIcon({
      className: '',
      html: `<div class="ward-bubble has-reports ${isHot ? 'hot' : ''}" style="width:${size}px;height:${size}px;font-size:${count > 99 ? 11 : 13}px">
        ${count}
      </div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })

    return (
      <Marker key={name} position={center} icon={icon} />
    )
  })
}

// ── Interactive boundary layer with hover/click ──
function InteractiveBoundaryLayer({ onHover, onSelect, reportsByArea }) {
  const [geojson, setGeojson] = useState(null)
  const hoveredRef = useRef(null)

  useEffect(() => {
    loadData().then(({ boundaries }) => setGeojson(boundaries))
  }, [])

  const defaultUrbanStyle = {
    color: '#E8390E',
    weight: 1,
    opacity: 0.5,
    fillColor: '#E8390E',
    fillOpacity: 0.04,
  }

  const hoverUrbanStyle = {
    color: '#E8390E',
    weight: 2.5,
    opacity: 1,
    fillColor: '#E8390E',
    fillOpacity: 0.15,
  }

  const selectedUrbanStyle = {
    color: '#fff',
    weight: 2.5,
    opacity: 1,
    fillColor: '#E8390E',
    fillOpacity: 0.25,
  }

  const ruralStyle = {
    color: 'rgba(255,255,255,0.08)',
    weight: 0.3,
    opacity: 0.2,
    fillColor: '#fff',
    fillOpacity: 0.01,
  }

  const onEachUrban = useCallback((feature, layer) => {
    const name = feature.properties.name || 'Unknown'
    const count = reportsByArea?.[name] || 0

    layer.on({
      mouseover: (e) => {
        const l = e.target
        if (hoveredRef.current && hoveredRef.current !== l) {
          hoveredRef.current.setStyle(defaultUrbanStyle)
        }
        l.setStyle(hoverUrbanStyle)
        l.bringToFront()
        hoveredRef.current = l
        onHover?.({ name, isUrban: true, count, code: feature.properties.code })
      },
      mouseout: (e) => {
        e.target.setStyle(defaultUrbanStyle)
        hoveredRef.current = null
        onHover?.(null)
      },
      click: (e) => {
        L.DomEvent.stopPropagation(e)
        const l = e.target
        l.setStyle(selectedUrbanStyle)
        onSelect?.({ name, isUrban: true, count, code: feature.properties.code })
      },
    })
  }, [reportsByArea, onHover, onSelect])

  if (!geojson) return null

  const rural = { ...geojson, features: geojson.features.filter(f => f.properties.type !== 'urban_sachivalayam') }
  const urban = { ...geojson, features: geojson.features.filter(f => f.properties.type === 'urban_sachivalayam') }

  return (
    <>
      <GeoJSON key="rural" data={rural} style={() => ruralStyle} />
      <GeoJSON key="urban" data={urban} style={() => defaultUrbanStyle} onEachFeature={onEachUrban} />
    </>
  )
}

// ── Report dot markers ──
function ReportMarkers() {
  const { filteredReports, actions } = useApp()
  return filteredReports.map(report => {
    const isResolved = report.status === 'resolved'
    const color = isResolved ? '#16a34a' : (SEVERITY_COLORS[report.severity] || '#f97316')
    return (
      <CircleMarker
        key={report.id}
        center={[report.lat, report.lng]}
        radius={6}
        pathOptions={{ color: '#fff', weight: 1.5, fillColor: color, fillOpacity: 0.9 }}
        eventHandlers={{ click: () => actions.selectReport(report) }}
      />
    )
  })
}

// ── MAIN MAP VIEW ──
export default function MapView() {
  const { state, actions } = useApp()
  const [boundaries, setBoundaries] = useState(null)
  const [hoveredArea, setHoveredArea] = useState(null)
  const [selectedWard, setSelectedWard] = useState(null)

  useEffect(() => {
    loadData().then(({ boundaries }) => setBoundaries(boundaries))
  }, [])

  const reportsByArea = useMemo(() => {
    const map = {}
    state.reports.forEach(r => {
      const area = r.assigned_area || ''
      if (!map[area]) map[area] = 0
      map[area]++
    })
    return map
  }, [state.reports])

  const totalActive = state.reports.filter(r => r.status !== 'resolved').length
  const totalReports = state.reports.length

  if (state.activeView !== 'map') return null

  const infoData = selectedWard || hoveredArea

  const handleViewReports = () => {
    if (selectedWard) { actions.setView('list'); setSelectedWard(null) }
  }

  const handleMapClick = () => {
    if (selectedWard) setSelectedWard(null)
  }

  return (
    <div className="view-panel map-panel active">
      <MapContainer center={RJY_CENTER} zoom={RJY_ZOOM} minZoom={11} maxZoom={19}
        className="map-container" zoomControl={false} attributionControl={false}
        whenReady={(e) => {
          e.target.on('click', handleMapClick)
        }}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" maxZoom={19} />
        <InteractiveBoundaryLayer
          onHover={setHoveredArea}
          onSelect={setSelectedWard}
          reportsByArea={reportsByArea}
        />
        <WardBubbles boundaries={boundaries} reportsByArea={reportsByArea} />
        <ReportMarkers />
        <MapControls />
      </MapContainer>

      {/* Inline stats badges */}
      <div className="map-stats-badges">
        <div className="map-badge badge-active">
          <span className="badge-num">{totalActive}</span>
          <span className="badge-label">Active</span>
        </div>
        <div className="map-badge badge-total">
          <span className="badge-num">{totalReports}</span>
          <span className="badge-label">Reports</span>
        </div>
      </div>

      {/* Ward info panel — hover or click */}
      {infoData && (
        <div className={`map-info-panel mip-light${selectedWard ? ' mip-selected' : ''}`}>
          <div className="mip-indicator" />
          <div className="mip-content">
            <div className="mip-name">{infoData.name}</div>
            <div className="mip-meta">{infoData.isUrban ? 'Sachivalayam · Urban' : 'Rural'}</div>
            <div className="mip-count">
              <span className="mip-count-num">{infoData.count}</span> report{infoData.count !== 1 ? 's' : ''}
            </div>
            {selectedWard && (
              <div className="mip-actions">
                <button className="mip-btn" onClick={handleViewReports}>View Reports →</button>
                <button className="mip-dismiss" onClick={() => setSelectedWard(null)}>✕</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
