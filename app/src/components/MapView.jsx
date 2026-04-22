import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useApp } from '../lib/store'
import { loadData } from '../lib/jurisdiction'
import { t } from '../lib/i18n'

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Center covering both Urban and Rural Rajahmundry
const RJY_CENTER = [17.005, 81.780]
const RJY_ZOOM = 13

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

  return boundaries.features.map((feature) => {
    const name = feature.properties.name || 'Unknown'
    const count = reportsByArea[name] || 0
    if (count === 0) return null

    const center = getCentroid(feature)
    // Aggressive scaling for visual impact
    const baseSize = 24
    let size = baseSize
    if (count > 0) size = Math.min(80, baseSize + (count * 6))
    
    const isHot = count >= 5
    const isCritical = count >= 10

    const icon = L.divIcon({
      className: '',
      html: `<div class="ward-bubble has-reports ${isHot ? 'hot' : ''} ${isCritical ? 'critical' : ''}" style="width:${size}px;height:${size}px;font-size:${size > 40 ? 18 : 13}px">
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
function InteractiveBoundaryLayer({ onHover, onSelect, reportsByArea, cityLimits }) {
  const [geojson, setGeojson] = useState(null)
  const hoveredRef = useRef(null)

  useEffect(() => {
    loadData().then(({ boundaries }) => setGeojson(boundaries))
  }, [])

  // Choropleth heatmap style
  const getUrbanStyle = useCallback((feature) => {
    const count = reportsByArea?.[feature.properties.name] || 0
    let fillOpacity = 0
    if (count > 0) fillOpacity = Math.min(0.7, 0.05 + (count * 0.05))
    
    return {
      color: count > 0 ? '#E8390E' : 'rgba(0,0,0,0.15)', // Darker stroke for light map
      weight: count > 0 ? 1.5 : 0.8,
      opacity: count > 0 ? 0.8 : 1,
      fillColor: '#E8390E',
      fillOpacity: fillOpacity,
    }
  }, [reportsByArea])

  const hoverUrbanStyle = {
    color: '#E8390E',
    weight: 2,
    opacity: 1,
    fillColor: '#E8390E',
    fillOpacity: 0.3,
  }

  const selectedUrbanStyle = {
    color: '#E8390E',
    weight: 3,
    opacity: 1,
    fillColor: '#E8390E',
    fillOpacity: 0.4,
  }

  // ── Rural Styles ──
  const getRuralStyle = useCallback((feature) => {
    const count = reportsByArea?.[feature.properties.name] || 0
    let fillOpacity = 0.05
    if (count > 0) fillOpacity = Math.min(0.5, 0.1 + (count * 0.05))
    
    return {
      color: count > 0 ? '#E8390E' : 'rgba(0,0,0,0.15)', // Red accent, dark gray for 0
      weight: count > 0 ? 1.5 : 0.8,
      opacity: count > 0 ? 0.9 : 0.4,
      fillColor: '#E8390E',
      fillOpacity: fillOpacity,
    }
  }, [reportsByArea])

  const hoverRuralStyle = {
    color: '#E8390E',
    weight: 2,
    opacity: 1,
    fillColor: '#E8390E',
    fillOpacity: 0.2,
  }

  const selectedRuralStyle = {
    color: '#E8390E',
    weight: 3,
    opacity: 1,
    fillColor: '#E8390E',
    fillOpacity: 0.35,
  }

  const onEachUrban = useCallback((feature, layer) => {
    const name = feature.properties.name || 'Unknown'
    const count = reportsByArea?.[name] || 0

    layer.on({
      mouseover: (e) => {
        const l = e.target
        if (hoveredRef.current && hoveredRef.current !== l) {
          hoveredRef.current.setStyle(getUrbanStyle(hoveredRef.current.feature))
        }
        l.setStyle(hoverUrbanStyle)
        l.bringToFront()
        hoveredRef.current = l
        onHover?.({ name, isUrban: true, count, code: feature.properties.code })
      },
      mouseout: (e) => {
        e.target.setStyle(getUrbanStyle(feature))
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
  }, [reportsByArea, onHover, onSelect, getUrbanStyle])

  const onEachRural = useCallback((feature, layer) => {
    const name = feature.properties.name || 'Unknown'
    const count = reportsByArea?.[name] || 0

    layer.on({
      mouseover: (e) => {
        const l = e.target
        if (hoveredRef.current && hoveredRef.current !== l) {
          // Restore previous hovered layer style
          const isUrb = hoveredRef.current.feature.properties.type === 'urban_sachivalayam'
          hoveredRef.current.setStyle(isUrb ? getUrbanStyle(hoveredRef.current.feature) : getRuralStyle(hoveredRef.current.feature))
        }
        l.setStyle(hoverRuralStyle)
        l.bringToFront()
        hoveredRef.current = l
        onHover?.({ name, isUrban: false, count, code: feature.properties.code })
      },
      mouseout: (e) => {
        e.target.setStyle(getRuralStyle(feature))
        hoveredRef.current = null
        onHover?.(null)
      },
      click: (e) => {
        L.DomEvent.stopPropagation(e)
        const l = e.target
        l.setStyle(selectedRuralStyle)
        onSelect?.({ name, isUrban: false, count, code: feature.properties.code })
      },
    })
  }, [reportsByArea, onHover, onSelect, getRuralStyle, getUrbanStyle])

  const { rural, urban } = useMemo(() => {
    if (!geojson) return { rural: null, urban: null }
    return {
      rural: { ...geojson, features: geojson.features.filter(f => f.properties.type !== 'urban_sachivalayam') },
      urban: { ...geojson, features: geojson.features.filter(f => f.properties.type === 'urban_sachivalayam') }
    }
  }, [geojson])

  // City Limits boundary style (Dashed red line)
  const cityLimitStyle = {
    color: '#E8390E',
    weight: 3,
    dashArray: '10, 15',
    opacity: 0.8,
    fillColor: 'transparent',
    fillOpacity: 0,
    interactive: false
  }

  if (!rural || !urban) return null

  return (
    <>
      <GeoJSON key="rural" data={rural} style={getRuralStyle} onEachFeature={onEachRural} />
      <GeoJSON key="urban" data={urban} style={getUrbanStyle} onEachFeature={onEachUrban} />
      {cityLimits && <GeoJSON key="city_limits" data={cityLimits} style={() => cityLimitStyle} />}
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
  const [cityLimits, setCityLimits] = useState(null)
  const [hoveredArea, setHoveredArea] = useState(null)
  const [selectedWard, setSelectedWard] = useState(null)

  useEffect(() => {
    loadData().then(({ boundaries }) => setBoundaries(boundaries))
    fetch('/city_limits.geojson').then(r => r.json()).then(setCityLimits).catch(() => {})
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
  const lang = state.lang || 'en'

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
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" maxZoom={19} />
        <InteractiveBoundaryLayer
          onHover={setHoveredArea}
          onSelect={setSelectedWard}
          reportsByArea={reportsByArea}
          cityLimits={cityLimits}
        />
        <WardBubbles boundaries={boundaries} reportsByArea={reportsByArea} />
        <ReportMarkers />
        <MapControls />
      </MapContainer>

      {/* Inline stats badges */}
      <div className="map-stats-badges">
        <div className="map-badge badge-active">
          <span className="badge-num">{totalActive}</span>
          <span className="badge-label">{t('active_reports', lang)}</span>
        </div>
        <div className="map-badge badge-total">
          <span className="badge-num">{totalReports}</span>
          <span className="badge-label">{t('total_reports', lang)}</span>
        </div>
      </div>

      {/* Ward info panel — hover or click */}
      {infoData && (
        <div className={`map-info-panel mip-light${selectedWard ? ' mip-selected' : ''}`}>
          <div className="mip-indicator" />
          <div className="mip-content" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="mip-name">{infoData.name}</div>
                <div className="mip-meta">{infoData.isUrban ? t('sachivalayam_urban', lang) : t('gram_panchayat', lang)}</div>
              </div>
              <div className="mip-count" style={{ marginTop: 0, textAlign: 'right' }}>
                <span className="mip-count-num" style={{ fontSize: '18px' }}>{infoData.count}</span>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.8 }}>{infoData.count !== 1 ? t('reports_word', lang) : t('report_word', lang)}</div>
              </div>
            </div>
            
            {selectedWard && (
              <div className="mip-actions" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <button className="mip-btn" onClick={handleViewReports} style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px' }}>
                  {t('view_reports', lang)}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
                </button>
                <button className="mip-dismiss" onClick={() => setSelectedWard(null)}>✕</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
